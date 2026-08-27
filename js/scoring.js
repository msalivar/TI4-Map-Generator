/**
 * TI4 Map Generator — slice/tile scoring
 * -------------------------------------------------------------
 * Pure functions only, no DOM access. Depends on js/hexgrid.js (loaded
 * before this file, see index.html) for hexDistance()/keyFor(). See
 * docs/superpowers/specs/2026-08-23-slice-scoring-design.md for the
 * design rationale behind these weights.
 * -------------------------------------------------------------
 */

const TECH_BONUS = 0.5;
const STATION_BONUS = 1;
const WORMHOLE_BONUS = 1;
const ENTROPIC_SCAR_BONUS = 2;
const DEFAULT_LEGENDARY_VALUE = 1.5;
const NAMED_LEGENDARY_VALUES = {
  "Thunder's Edge": 3.0,
  "Styx": 3.0,
  "Hope's End": 2.5,
  "Garbozia": 2.5,
  "Mallice": 2.0,
  "Emelpar": 2.0,
  "Industrex": 2.0,
  "Primor": 1.5,
  "Faunus": 1.5,
  "Tempesta": 1.5,
  "Mecatol Rex": 1.5,
  "Mirage": 1.0,
};
const SUPERNOVA_PATH_PENALTY = 2;
const NEBULA_PATH_PENALTY = 1;

function legendaryValue(planet) {
  return NAMED_LEGENDARY_VALUES[planet.name] ?? DEFAULT_LEGENDARY_VALUE;
}

function planetOptimalResources(planet) {
  return planet.resources >= planet.influence ? planet.resources : 0;
}

function planetOptimalInfluence(planet) {
  return planet.influence > planet.resources ? planet.influence : 0;
}

// The category each value part belongs to, used to roll per-tile parts
// up into per-home category subtotals (see computeHomeSlices) instead of
// listing every tile individually in the home-tile tooltip.
const VALUE_CATEGORIES = ["base", "tech", "legendary", "station", "wormhole", "entropicScar"];

// Per-tile value broken into labeled+categorized parts, so the same
// computation produces both a total (tileValue) and a breakdown usable
// either itemized (per part) or rolled up (per category, see
// computeHomeSlices) without duplicating the formula.
function describeTileValue(tile) {
  const parts = [];
  tile.planets.forEach((planet) => {
    parts.push({ label: `${planet.name} base`, amount: Math.max(planet.resources, planet.influence), category: "base" });
    // A dual-tech planet (Thunder's Edge) can satisfy either prerequisite
    // when exhausted, so each tech it carries contributes its own bonus.
    planet.techs.forEach((tech) => parts.push({ label: `${planet.name} tech skip (${tech})`, amount: TECH_BONUS, category: "tech" }));
    if (planet.legendary) parts.push({ label: `${planet.name} legendary`, amount: legendaryValue(planet), category: "legendary" });
    if (planet.station) parts.push({ label: `${planet.name} station`, amount: STATION_BONUS, category: "station" });
  });
  tile.wormholes.forEach(() => parts.push({ label: "Wormhole", amount: WORMHOLE_BONUS, category: "wormhole" }));
  if (tile.anomalies.includes("entropicScar")) parts.push({ label: "Entropic Scar", amount: ENTROPIC_SCAR_BONUS, category: "entropicScar" });
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  return { total, parts };
}

function tileValue(tile) {
  return describeTileValue(tile).total;
}

function tileOptimalResources(tile) {
  return tile.planets.reduce((sum, p) => sum + planetOptimalResources(p), 0);
}

function tileOptimalInfluence(tile) {
  return tile.planets.reduce((sum, p) => sum + planetOptimalInfluence(p), 0);
}

// Raw tech type strings (e.g. "biotic"), not display letters -- app.js
// owns the letter/color mapping since that's a display concern. A
// dual-tech planet contributes both of its types.
function tileTechTypes(tile) {
  return tile.planets.flatMap((p) => p.techs);
}

function parseKey(key) {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

// Rounds a fractional cube coordinate (q, r, s) to the nearest actual
// hex, correcting whichever component was rounded furthest off so
// q + r + s stays exactly 0 (standard cube-coordinate rounding).
function cubeRound(q, r, s) {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  else rs = -rq - rr;
  return { q: rq, r: rr };
}

// A home's "path to Mecatol" is the line of hexes between it and the
// center, found via the standard cube-coordinate line-drawing algorithm
// (lerp the home's cube coordinates toward the origin, round to the
// nearest hex at each step). Every home sits exactly `rings` hexes from
// center, so this always produces `rings - 1` intermediate tiles. For a
// home that sits exactly on one of the 6 primary directions (true for
// most layouts) this reduces to the same direction*2/direction*1 result
// as the old formula; it also produces a sensible path for the
// off-axis homes some player-count layouts use to spread more homes
// around the same ring (see data/map-layouts.js).
function homePathTiles(homeKey, rings) {
  const home = parseKey(homeKey);
  const homeS = -home.q - home.r;
  const path = [];
  for (let i = 1; i < rings; i++) {
    const t = i / rings;
    const rounded = cubeRound(home.q * (1 - t), home.r * (1 - t), homeS * (1 - t));
    path.push(keyFor(rounded.q, rounded.r));
  }
  return path;
}

/**
 * Computes each home system's slice value. A tile counts toward a
 * home's slice if it's directly adjacent to that home (hex-distance 1),
 * on that home's fixed path to Mecatol, or equidistant between that
 * home and at least one other home (tied for closest among ALL homes).
 * A tile's value splits evenly across every home whose slice it's in,
 * if more than one. On top of that, a home's total takes a penalty if
 * a supernova/nebula sits on its fixed path to Mecatol Rex. `board` is
 * a Map<"q,r", tile>; `homeKeys` an iterable of "q,r" strings; `rings`
 * the board's ring count. Returns a Map<homeKey, breakdown>, where
 * breakdown is:
 *   { total, optimalResources, optimalInfluence, techTypes,
 *     categoryTotals: { base, tech, legendary, station, wormhole, entropicScar },
 *     pathPenalty, tiles: [{ tile, contribution, splitWith: [otherHomeKey, ...] }] }
 * categoryTotals mirrors total's breakdown by describeTileValue() category
 * (each tile's share applied the same way as total), for a per-home
 * summary without walking `tiles` -- see app.js's showHomeTooltip().
 */
function computeHomeSlices(board, homeKeys, rings) {
  const homeKeyList = [...homeKeys];
  const results = new Map(
    homeKeyList.map((homeKey) => [homeKey, {
      total: 0,
      optimalResources: 0,
      optimalInfluence: 0,
      techTypes: [],
      categoryTotals: Object.fromEntries(VALUE_CATEGORIES.map((c) => [c, 0])),
      pathPenalty: 0,
      tiles: [],
    }]),
  );
  const homePaths = new Map(homeKeyList.map((homeKey) => [homeKey, homePathTiles(homeKey, rings)]));

  board.forEach((tile, key) => {
    const { q, r } = parseKey(key);
    const distances = homeKeyList.map((homeKey) => {
      const home = parseKey(homeKey);
      return { homeKey, dist: hexDistance(q, r, home.q, home.r) };
    });
    const minDist = Math.min(...distances.map((d) => d.dist));
    const atMinDist = distances.filter((d) => d.dist === minDist).map((d) => d.homeKey);
    const tiedAtMin = atMinDist.length > 1 ? atMinDist : [];

    const reachingHomes = homeKeyList.filter((homeKey) => {
      const { dist } = distances.find((d) => d.homeKey === homeKey);
      if (dist === 1) return true;
      if (homePaths.get(homeKey).includes(key)) return true;
      return tiedAtMin.includes(homeKey);
    });
    if (reachingHomes.length === 0) return;

    const desc = describeTileValue(tile);
    const value = desc.total;
    const categorySums = Object.fromEntries(VALUE_CATEGORIES.map((c) => [c, 0]));
    desc.parts.forEach((part) => { categorySums[part.category] += part.amount; });
    const optRes = tileOptimalResources(tile);
    const optInf = tileOptimalInfluence(tile);
    const techTypes = tileTechTypes(tile);
    const share = 1 / reachingHomes.length;

    reachingHomes.forEach((homeKey) => {
      const entry = results.get(homeKey);
      const contribution = value * share;
      entry.total += contribution;
      VALUE_CATEGORIES.forEach((c) => { entry.categoryTotals[c] += categorySums[c] * share; });
      entry.optimalResources += optRes * share;
      entry.optimalInfluence += optInf * share;
      techTypes.forEach((t) => entry.techTypes.push(t));
      entry.tiles.push({
        tile,
        contribution,
        splitWith: reachingHomes.filter((h) => h !== homeKey),
      });
    });
  });

  homeKeyList.forEach((homeKey) => {
    let penalty = 0;
    homePaths.get(homeKey).forEach((pathKey) => {
      const tile = board.get(pathKey);
      if (!tile) return;
      if (tile.anomalies.includes("supernova")) penalty += SUPERNOVA_PATH_PENALTY;
      if (tile.anomalies.includes("nebula")) penalty += NEBULA_PATH_PENALTY;
    });
    const entry = results.get(homeKey);
    entry.pathPenalty = penalty;
    entry.total -= penalty;
  });

  return results;
}
