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

// Per-tile value broken into labeled parts, so the same computation
// produces both a total (tileValue) and an itemized tooltip breakdown
// (used by app.js's home-tile tooltip) without duplicating the formula.
function describeTileValue(tile) {
  const parts = [];
  tile.planets.forEach((planet) => {
    parts.push({ label: `${planet.name} base`, amount: Math.max(planet.resources, planet.influence) });
    if (planet.tech) parts.push({ label: `${planet.name} tech skip`, amount: TECH_BONUS });
    if (planet.legendary) parts.push({ label: `${planet.name} legendary`, amount: legendaryValue(planet) });
    if (planet.station) parts.push({ label: `${planet.name} station`, amount: STATION_BONUS });
  });
  tile.wormholes.forEach(() => parts.push({ label: "Wormhole", amount: WORMHOLE_BONUS }));
  if (tile.anomalies.includes("entropicScar")) parts.push({ label: "Entropic Scar", amount: ENTROPIC_SCAR_BONUS });
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
// owns the letter/color mapping since that's a display concern.
function tileTechTypes(tile) {
  return tile.planets.filter((p) => p.tech).map((p) => p.tech);
}

function parseKey(key) {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

// Each home sits at direction * rings for one of the 6 primary axial
// directions (see generateHexRings), so its fixed 2-tile path to
// Mecatol is always direction*2 and direction*1 -- no branching, since
// homes sit exactly on-axis from the center.
function homePathTiles(homeKey, rings) {
  const home = parseKey(homeKey);
  const dq = home.q / rings;
  const dr = home.r / rings;
  return [keyFor(dq * 2, dr * 2), keyFor(dq * 1, dr * 1)];
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
 *   { total, optimalResources, optimalInfluence, techTypes, pathPenalty,
 *     tiles: [{ tile, contribution, splitWith: [otherHomeKey, ...] }] }
 */
function computeHomeSlices(board, homeKeys, rings) {
  const homeKeyList = [...homeKeys];
  const results = new Map(
    homeKeyList.map((homeKey) => [homeKey, {
      total: 0,
      optimalResources: 0,
      optimalInfluence: 0,
      techTypes: [],
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

    const value = tileValue(tile);
    const optRes = tileOptimalResources(tile);
    const optInf = tileOptimalInfluence(tile);
    const techTypes = tileTechTypes(tile);
    const share = 1 / reachingHomes.length;

    reachingHomes.forEach((homeKey) => {
      const entry = results.get(homeKey);
      const contribution = value * share;
      entry.total += contribution;
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
