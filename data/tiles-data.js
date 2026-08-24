/**
 * TI4 Map Generator — system tile data
 * -------------------------------------------------------------
 * IMPORTANT — DATA ACCURACY:
 * All tile arrays here are real, wiki-sourced data (name, tile number,
 * resources, influence, trait, tech specialty, wormhole, anomaly),
 * cross-checked between the wiki's Tiles List page (tile numbers and
 * which planets share a tile) and its Planets page (per-planet trait/
 * resources/influence/tech, read from each cell's icon alt text).
 * Every array excludes faction home systems, the Creuss/Muaat special
 * tiles, hyperlane tiles, and other tiles that don't fit this tool's
 * generic-home-slot model -- see the comment above each array for its
 * specific sourcing and exclusions.
 *
 * If your physical set differs from a published tile (rare, but
 * expansions do get errata'd), just edit the relevant entry below —
 * look at the tile number printed on the physical tile and update its
 * planets/resources/influence/wormhole/anomaly here. Nothing else in
 * the app needs to change.
 *
 * Twilight Imperium (Fourth Edition) is a trademark of Fantasy
 * Flight Games / Asmodee. This is an unofficial fan-made tool; no
 * copyrighted artwork or rules text is included, only tile numbers
 * and gameplay-relevant stats.
 * -------------------------------------------------------------
 */

// Mecatol Rex — always sits in the very center of the galaxy.
const MECATOL_REX = {
  id: 18,
  type: "mecatol",
  back: "none",
  set: "base",
  name: "Mecatol Rex",
  planets: [{ name: "Mecatol Rex", resources: 1, influence: 6, traits: [], techs: [], legendary: true, station: false }],
  wormholes: [],
  anomalies: [],
};

const TRAITS = ["cultural", "industrial", "hazardous"];
const TECHS = ["propulsion", "cybernetic", "biotic", "warfare"];

// trait/tech accept either a single string or an array -- most planets have
// exactly one of each, but some Thunder's Edge planets have two (a planet
// counts as having both traits/techs for scoring and tech-skip purposes).
function normalizeList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function makePlanet(name, resources, influence, trait, tech, legendary, station) {
  return {
    name,
    resources,
    influence,
    traits: normalizeList(trait),
    techs: normalizeList(tech),
    legendary: !!legendary,
    station: !!station,
  };
}

// Base-game generic system tiles (real tile numbers 19-38), sourced
// from the wiki's Planets page (name/trait/resources/influence/tech,
// via each cell's trait/tech icon alt text) cross-checked against the
// Tiles List page (tile numbers and which planets share a tile).
// Real base-game tile numbers only go up to 51 (1-17 are faction home
// systems and the Creuss gate, 18 is Mecatol Rex, 51 is the Creuss
// home system) -- faction homes are excluded here for the same reason
// PoK/Thunder's Edge exclude theirs (see comments below).
const NAMED_BLUE_TILES = [
  { id: 19, planets: [makePlanet("Wellon", 1, 2, "industrial", "cybernetic")] },
  { id: 20, planets: [makePlanet("Vefut II", 2, 2, "hazardous")] },
  { id: 21, planets: [makePlanet("Thibah", 1, 1, "industrial", "propulsion")] },
  { id: 22, planets: [makePlanet("Tar'Mann", 1, 1, "industrial", "biotic")] },
  { id: 23, planets: [makePlanet("Saudor", 2, 2, "industrial")] },
  { id: 24, planets: [makePlanet("Mehar Xull", 1, 3, "hazardous", "warfare")] },
  { id: 27, planets: [makePlanet("New Albion", 1, 1, "industrial", "biotic"), makePlanet("Starpoint", 3, 1, "hazardous")] },
  { id: 28, planets: [makePlanet("Tequ'ran", 2, 0, "hazardous"), makePlanet("Torkan", 0, 3, "cultural")] },
  { id: 29, planets: [makePlanet("Qucen'n", 1, 2, "industrial"), makePlanet("Rarron", 0, 3, "cultural")] },
  { id: 30, planets: [makePlanet("Mellon", 0, 2, "cultural"), makePlanet("Zohbat", 3, 1, "hazardous")] },
  { id: 31, planets: [makePlanet("Lazar", 1, 0, "industrial", "cybernetic"), makePlanet("Sakulag", 2, 1, "hazardous")] },
  { id: 32, planets: [makePlanet("Dal Bootha", 0, 2, "cultural"), makePlanet("Xxehan", 1, 1, "cultural")] },
  { id: 33, planets: [makePlanet("Coorneeq", 1, 2, "cultural"), makePlanet("Resculon", 2, 0, "cultural")] },
  { id: 34, planets: [makePlanet("Centauri", 1, 3, "cultural"), makePlanet("Gral", 1, 1, "industrial", "propulsion")] },
  { id: 35, planets: [makePlanet("Bereg", 3, 1, "hazardous"), makePlanet("Lirta IV", 2, 3, "hazardous")] },
  { id: 36, planets: [makePlanet("Arnor", 2, 1, "industrial"), makePlanet("Lor", 1, 2, "industrial")] },
  { id: 37, planets: [makePlanet("Arinam", 1, 2, "industrial"), makePlanet("Meer", 0, 4, "hazardous", "warfare")] },
  { id: 38, planets: [makePlanet("Abyz", 3, 0, "hazardous"), makePlanet("Fria", 2, 0, "hazardous")] },
];

// Wormhole tiles (blue-backed, no anomaly) -- real tile numbers 25/26.
const WORMHOLE_TILES = [
  { id: 25, planets: [makePlanet("Quann", 2, 1, "cultural")], wormhole: "beta" },
  { id: 26, planets: [makePlanet("Lodor", 3, 1, "cultural")], wormhole: "alpha" },
];

// Red-backed anomaly / wormhole / empty tiles -- real tile numbers 39-50.
const RED_TILES = [
  { id: 39, planets: [], wormhole: "alpha" },
  { id: 40, planets: [], wormhole: "beta" },
  { id: 41, planets: [], anomaly: "rift" },
  { id: 42, planets: [], anomaly: "nebula" },
  { id: 43, planets: [], anomaly: "supernova" },
  { id: 44, planets: [], anomaly: "asteroid" },
  { id: 45, planets: [], anomaly: "asteroid" },
  { id: 46, planets: [] },
  { id: 47, planets: [] },
  { id: 48, planets: [] },
  { id: 49, planets: [] },
  { id: 50, planets: [] },
];

// Prophecy of Kings — generic system tiles only. Faction home systems
// (52-58), the Muaat-only supernova (81), the optional Mallice tile (82),
// and hyperlane tiles (83-91) are excluded: none of those are part of a
// normal galaxy draw for a generic map tool like this one.
const POK_TILES = [
  { id: 59, back: "blue", planets: [makePlanet("Archon Vail", 1, 3, "hazardous", "propulsion")] },
  { id: 60, back: "blue", planets: [makePlanet("Perimeter", 2, 1, "industrial")] },
  { id: 61, back: "blue", planets: [makePlanet("Ang", 2, 0, "industrial", "warfare")] },
  { id: 62, back: "blue", planets: [makePlanet("Sem-Lore", 3, 2, "cultural", "cybernetic")] },
  { id: 63, back: "blue", planets: [makePlanet("Vorhal", 0, 2, "cultural", "biotic")] },
  { id: 64, back: "blue", planets: [makePlanet("Atlas", 3, 1, "hazardous")], wormholes: ["beta"] },
  { id: 65, back: "blue", planets: [makePlanet("Primor", 2, 1, "cultural", null, true)] },
  { id: 66, back: "blue", planets: [makePlanet("Hope's End", 3, 0, "hazardous", null, true)] },
  { id: 67, back: "red", planets: [makePlanet("Cormund", 2, 0, "hazardous")], anomalies: ["rift"] },
  { id: 68, back: "red", planets: [makePlanet("Everra", 3, 1, "cultural")], anomalies: ["nebula"] },
  { id: 69, back: "blue", planets: [makePlanet("Accoen", 2, 3, "industrial"), makePlanet("Jeol Ir", 2, 3, "industrial")] },
  { id: 70, back: "blue", planets: [makePlanet("Kraag", 2, 1, "hazardous"), makePlanet("Siig", 0, 2, "hazardous")] },
  { id: 71, back: "blue", planets: [makePlanet("Bakal", 3, 2, "industrial"), makePlanet("Alio Prima", 1, 1, "cultural")] },
  { id: 72, back: "blue", planets: [makePlanet("Lisis", 2, 2, "industrial"), makePlanet("Velnor", 2, 1, "industrial", "warfare")] },
  { id: 73, back: "blue", planets: [makePlanet("Cealdri", 0, 2, "cultural", "cybernetic"), makePlanet("Xanhact", 0, 1, "hazardous")] },
  { id: 74, back: "blue", planets: [makePlanet("Vega Major", 2, 1, "cultural"), makePlanet("Vega Minor", 1, 2, "cultural", "propulsion")] },
  { id: 75, back: "blue", planets: [makePlanet("Abaddon", 1, 0, "cultural"), makePlanet("Loki", 1, 2, "cultural"), makePlanet("Ashtroth", 2, 0, "hazardous")] },
  { id: 76, back: "blue", planets: [makePlanet("Rigel I", 0, 1, "hazardous"), makePlanet("Rigel II", 1, 2, "industrial"), makePlanet("Rigel III", 1, 1, "industrial", "biotic")] },
  { id: 77, back: "red", planets: [] },
  { id: 78, back: "red", planets: [] },
  { id: 79, back: "red", planets: [], anomalies: ["asteroid"], wormholes: ["alpha"] },
  { id: 80, back: "red", planets: [], anomalies: ["supernova"] },
];

// Thunder's Edge — generic system tiles only. Faction/gate home systems
// (92-96, 118), the alternate Mecatol Rex (112), and hyperlane/fracture
// tiles (119-128) are excluded for the same reason as PoK's exclusions
// above. Trait/tech cross-checked against github.com/heisenbugged/ti4-lab's
// system data. Thunder's Edge introduces dual-trait and dual-tech planets
// (a planet counts as having both, per the wiki's Planets page) -- see
// makePlanet()'s trait/tech array support.

const THUNDERS_EDGE_TILES = [
  { id: 97, back: "blue", planets: [makePlanet("Faunus", 1, 3, "industrial", "biotic", true)] },
  { id: 98, back: "blue", planets: [makePlanet("Garbozia", 2, 1, "hazardous", null, true)] },
  { id: 99, back: "blue", planets: [makePlanet("Emelpar", 0, 2, "cultural", null, true)] },
  { id: 100, back: "blue", planets: [makePlanet("Tempesta", 1, 1, "hazardous", "propulsion", true)] },
  { id: 101, back: "blue", planets: [makePlanet("Olergodt", 2, 1, ["cultural", "hazardous"], ["cybernetic", "warfare"])] },
  { id: 102, back: "blue", planets: [makePlanet("Andeara", 1, 1, "industrial", "propulsion")], wormholes: ["alpha"] },
  { id: 103, back: "blue", planets: [makePlanet("Vira-Pics III", 2, 3, ["cultural", "hazardous"])] },
  { id: 104, back: "blue", planets: [makePlanet("Lesab", 2, 1, ["industrial", "hazardous"])] },
  { id: 105, back: "blue", planets: [makePlanet("New Terra", 1, 1, "industrial", "biotic"), makePlanet("Tinnes", 2, 1, ["industrial", "hazardous"], "biotic")] },
  { id: 106, back: "blue", planets: [makePlanet("Cresius", 0, 1, "hazardous"), makePlanet("Lazul Rex", 2, 2, ["industrial", "cultural"])] },
  { id: 107, back: "blue", planets: [makePlanet("Tiamat", 1, 2, "cultural", "cybernetic"), makePlanet("Hercalor", 1, 0, "industrial")] },
  { id: 108, back: "blue", planets: [makePlanet("Kostboth", 0, 1, "cultural"), makePlanet("Capha", 3, 0, "hazardous")] },
  { id: 109, back: "blue", planets: [makePlanet("Bellatrix", 1, 2, "cultural"), makePlanet("Tsion Station", 1, 1, null, null, false, true)] },
  { id: 110, back: "blue", planets: [makePlanet("Horizon", 1, 2, "cultural"), makePlanet("Elnath", 2, 0, "hazardous"), makePlanet("Luthien VI", 3, 1, "hazardous")] },
  { id: 111, back: "blue", planets: [makePlanet("Tarana", 1, 2, ["industrial", "cultural"]), makePlanet("Oluz Station", 1, 1, null, null, false, true)] },
  { id: 113, back: "red", planets: [], anomalies: ["rift"], wormholes: ["beta"] },
  { id: 114, back: "red", planets: [], anomalies: ["entropicScar"] },
  { id: 115, back: "red", planets: [makePlanet("Industrex", 2, 0, "industrial", "warfare", true)], anomalies: ["asteroid"] },
  { id: 116, back: "red", planets: [makePlanet("Lemox", 0, 3, "industrial")], anomalies: ["entropicScar"] },
  { id: 117, back: "red", planets: [makePlanet("The Watchtower", 1, 1, null, null, false, true)], anomalies: ["rift", "asteroid"] },
];

// Discordant Stars (fan expansion) — its "Uncharted Space" tile set: 5
// legendary planets, 12 blue, 7 red. Tile numbers (including the 5
// legendary planets, which the wiki doesn't publish) cross-checked against
// github.com/heisenbugged/ti4-lab's system data to match real physical
// tile backs.
const DISCORDANT_STARS_TILES = [
  { id: 4253, back: "blue", planets: [makePlanet("Silence", 2, 2, "industrial", null, true)] },
  { id: 4254, back: "blue", planets: [makePlanet("Echo", 1, 2, "hazardous", null, true)] },
  { id: 4255, back: "blue", planets: [makePlanet("Tarrock", 3, 0, "industrial", null, true)] },
  { id: 4256, back: "blue", planets: [makePlanet("Prism", 0, 3, "industrial", null, true)] },
  { id: 4257, back: "blue", planets: [makePlanet("Troac", 0, 4, "cultural")] },
  { id: 4258, back: "blue", planets: [makePlanet("Etir V", 4, 0, "hazardous")] },
  { id: 4259, back: "blue", planets: [makePlanet("Vioss", 3, 3, "cultural")] },
  { id: 4260, back: "blue", planets: [makePlanet("Fakrenn", 2, 2, "hazardous")], wormholes: ["alpha"] },
  { id: 4261, back: "blue", planets: [makePlanet("San-Vit", 3, 1, "cultural"), makePlanet("Lodran", 0, 2, "hazardous", "cybernetic")] },
  { id: 4262, back: "blue", planets: [makePlanet("Dorvok", 1, 2, "industrial", "warfare"), makePlanet("Derbrae", 2, 3, "cultural")] },
  { id: 4263, back: "blue", planets: [makePlanet("Rysaa", 1, 2, "industrial", "propulsion"), makePlanet("Moln", 2, 0, "hazardous", "biotic")] },
  { id: 4264, back: "blue", planets: [makePlanet("Salin", 1, 2, "hazardous"), makePlanet("Gwiyun", 2, 2, "hazardous")] },
  { id: 4265, back: "blue", planets: [makePlanet("Inan", 1, 2, "industrial"), makePlanet("Swog", 1, 0, "industrial")] },
  { id: 4266, back: "blue", planets: [makePlanet("Detic", 3, 2, "cultural"), makePlanet("Lliot", 0, 1, "cultural")] },
  { id: 4267, back: "blue", planets: [makePlanet("Qaak", 1, 1, "cultural"), makePlanet("Larred", 1, 1, "industrial"), makePlanet("Nairb", 1, 1, "hazardous")] },
  { id: 4268, back: "blue", planets: [makePlanet("Sierpen", 2, 0, "cultural"), makePlanet("Mandle", 1, 1, "industrial"), makePlanet("Regnem", 0, 2, "hazardous")] },
  { id: 4269, back: "red", planets: [makePlanet("Domna", 2, 1, "hazardous", null, true)], anomalies: ["nebula"] },
  { id: 4270, back: "red", planets: [] },
  { id: 4271, back: "red", planets: [] },
  { id: 4272, back: "red", planets: [], anomalies: ["nebula"], wormholes: ["beta"] },
  { id: 4273, back: "red", planets: [], anomalies: ["nebula", "asteroid"] },
  { id: 4274, back: "red", planets: [], anomalies: ["rift", "asteroid"] },
  { id: 4275, back: "red", planets: [], anomalies: ["rift"], wormholes: ["gamma"] },
  { id: 4276, back: "red", planets: [], anomalies: ["supernova"], wormholes: ["alpha", "beta"] },
];

function addPoolTile(pool, id, set, back, planets, opts) {
  opts = opts || {};
  pool.push({
    id,
    type: "system",
    back,
    set,
    name: `Tile ${id}`,
    planets,
    wormholes: opts.wormholes || [],
    anomalies: opts.anomalies || [],
  });
}

function buildTilePool() {
  const pool = [];

  NAMED_BLUE_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "base", "blue", t.planets, { wormholes: t.wormhole ? [t.wormhole] : [] });
  });
  WORMHOLE_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "base", "blue", t.planets, { wormholes: [t.wormhole] });
  });
  RED_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "base", "red", t.planets, {
      wormholes: t.wormhole ? [t.wormhole] : [],
      anomalies: t.anomaly ? [t.anomaly] : [],
    });
  });
  POK_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "pok", t.back, t.planets, { wormholes: t.wormholes, anomalies: t.anomalies });
  });
  THUNDERS_EDGE_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "thunders-edge", t.back, t.planets, { wormholes: t.wormholes, anomalies: t.anomalies });
  });
  DISCORDANT_STARS_TILES.forEach((t) => {
    addPoolTile(pool, t.id, "discordant-stars", t.back, t.planets, { wormholes: t.wormholes, anomalies: t.anomalies });
  });

  return pool;
}

const TILE_POOL = buildTilePool();

const ANOMALY_LABELS = {
  nebula: "Nebula",
  supernova: "Supernova",
  asteroid: "Asteroid Field",
  rift: "Gravity Rift",
  entropicScar: "Entropic Scar",
};

const WORMHOLE_LABELS = {
  alpha: "α Wormhole",
  beta: "β Wormhole",
  gamma: "γ Wormhole",
  delta: "δ Wormhole",
};
