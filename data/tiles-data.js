/**
 * TI4 Map Generator — system tile data
 * -------------------------------------------------------------
 * IMPORTANT — DATA ACCURACY:
 * This starter set uses PLACEHOLDER resource/influence numbers and
 * generic system names for most tiles. Only a few facts here are
 * pulled from the real rulebook (Mecatol Rex's 1 resource / 6
 * influence, the wormhole types Alpha/Beta/Gamma/Delta, and the
 * anomaly types Nebula/Supernova/Asteroid Field/Gravity Rift).
 *
 * To make this match your physical tile set exactly, just edit the
 * arrays below — look at the tile number printed on each physical
 * tile and copy its real planets/resources/influence/wormhole/
 * anomaly here. Nothing else in the app needs to change.
 *
 * The base-game placeholder set described above is NAMED_BLUE_TILES/
 * WORMHOLE_TILES/RED_TILES. POK_TILES/THUNDERS_EDGE_TILES/
 * DISCORDANT_STARS_TILES below them are real, wiki-sourced data —
 * see the comment above each array for its specific sourcing and
 * exclusions.
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
  planets: [{ name: "Mecatol Rex", resources: 1, influence: 6, trait: null, tech: null, legendary: false, station: false }],
  wormholes: [],
  anomalies: [],
};

const TRAITS = ["cultural", "industrial", "hazardous"];
const TECHS = ["propulsion", "cybernetic", "biotic", "warfare"];

function makePlanet(name, resources, influence, trait, tech, legendary, station) {
  return { name, resources, influence, trait: trait || null, tech: tech || null, legendary: !!legendary, station: !!station };
}

// A handful of real, well-known named systems (values are close to
// the published game but should be double-checked against your set).
const NAMED_BLUE_TILES = [
  { id: 19, planets: [makePlanet("Abyz", 0, 2, "industrial")] },
  { id: 20, planets: [makePlanet("Fria", 2, 0, "hazardous")] },
  { id: 21, planets: [makePlanet("Arnor", 2, 1, "industrial"), makePlanet("Lor", 1, 2, "cultural")] },
  { id: 22, planets: [makePlanet("Bereg", 3, 1, "hazardous"), makePlanet("Lirta IV", 2, 3, "hazardous")] },
  { id: 23, planets: [makePlanet("Arinam", 1, 2, "industrial"), makePlanet("Meer", 0, 4, "hazardous", "warfare")] },
  { id: 24, planets: [makePlanet("Dal Bootha", 0, 2, "cultural"), makePlanet("Xxehan", 1, 1, "cultural")] },
  { id: 25, planets: [makePlanet("Corneeq", 1, 2, "cultural"), makePlanet("Resculon", 2, 0, "cultural")] },
  { id: 26, planets: [makePlanet("Centauri", 1, 3, "cultural")] },
  { id: 27, planets: [makePlanet("Gral", 1, 1, "industrial", "propulsion")] },
  { id: 28, planets: [makePlanet("Vega Major", 1, 2, "industrial"), makePlanet("Vega Minor", 1, 2, "cultural", "propulsion")] },
  { id: 29, planets: [makePlanet("Loki", 1, 2, "cultural")] },
  { id: 30, planets: [makePlanet("Lisis II", 2, 1, "industrial"), makePlanet("Ragh", 1, 1, "hazardous")] },
  { id: 31, planets: [makePlanet("Mecatol", 0, 0, null)] },
  { id: 32, planets: [makePlanet("New Albion", 1, 1, "industrial", "biotic"), makePlanet("Starpoint", 3, 1, "hazardous")] },
  { id: 33, planets: [makePlanet("Tequ'ran", 2, 0, "hazardous"), makePlanet("Torkan", 0, 3, "cultural")] },
  { id: 34, planets: [makePlanet("Qucen'n", 3, 1, "industrial")] },
  { id: 35, planets: [makePlanet("Quinarra", 3, 1, "industrial")] },
  { id: 36, planets: [makePlanet("Mellon", 0, 3, "cultural")] },
  { id: 37, planets: [makePlanet("Zohbat", 3, 1, "hazardous")] },
  { id: 38, planets: [makePlanet("Wellon", 1, 2, "industrial", "cybernetic")] },
  { id: 39, planets: [makePlanet("Thibah", 1, 1, "industrial", "propulsion")] },
  { id: 40, planets: [makePlanet("Tar'Mann", 1, 1, "industrial", "biotic")] },
  { id: 41, planets: [makePlanet("Saudor", 2, 2, "industrial")] },
  { id: 42, planets: [makePlanet("Mehar Xull", 1, 3, "hazardous", "warfare")] },
  { id: 43, planets: [makePlanet("Quann", 2, 1, "cultural")] },
  { id: 44, planets: [makePlanet("Lodor", 0, 3, "cultural")] },
  { id: 45, planets: [makePlanet("New Albion II", 1, 1, "industrial")] },
  { id: 46, planets: [makePlanet("Rarron", 0, 2, "cultural")] },
  { id: 47, planets: [makePlanet("Archon Ren", 2, 3, "hazardous")] },
  { id: 48, planets: [makePlanet("Archon Vail", 1, 3, "hazardous", "propulsion")] },
  { id: 49, planets: [makePlanet("Perimeter", 2, 1, "industrial")] },
  { id: 50, planets: [makePlanet("Ang", 2, 0, "industrial", "warfare")] },
];

// Wormhole tiles (blue-backed, no anomaly)
const WORMHOLE_TILES = [
  { id: 51, planets: [makePlanet("Lisis", 2, 1, "industrial")], wormhole: "alpha" },
  { id: 52, planets: [makePlanet("Ang II", 0, 2, "industrial")], wormhole: "beta" },
];

// Red-backed anomaly / wormhole / empty tiles
const RED_TILES = [
  { id: 53, planets: [], anomaly: "supernova" },
  { id: 54, planets: [], anomaly: "asteroid" },
  { id: 55, planets: [], anomaly: "asteroid" },
  { id: 56, planets: [], anomaly: "asteroid" },
  { id: 57, planets: [], anomaly: "nebula" },
  { id: 58, planets: [], anomaly: "nebula" },
  { id: 59, planets: [], anomaly: "rift" },
  { id: 60, planets: [makePlanet("Wren Terra", 2, 1, "industrial")], wormhole: "alpha" },
  { id: 61, planets: [makePlanet("Res Terra", 1, 1, "hazardous")], wormhole: "beta" },
  { id: 62, planets: [] },
  { id: 63, planets: [] },
  { id: 64, planets: [] },
  { id: 65, planets: [makePlanet("Cormund", 1, 1, "hazardous")] },
  { id: 66, planets: [makePlanet("Everra", 3, 1, "cultural")] },
  { id: 67, planets: [] },
  { id: 68, planets: [] },
  { id: 69, planets: [makePlanet("Kraag", 0, 2, null)] },
  { id: 70, planets: [] },
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
  { id: 71, back: "blue", planets: [makePlanet("Bakal", 3, 2, "cultural"), makePlanet("Alio Prima", 1, 1, "industrial")] },
  { id: 72, back: "blue", planets: [makePlanet("Lisis", 2, 2, "industrial"), makePlanet("Velnor", 2, 1, "industrial")] },
  { id: 73, back: "blue", planets: [makePlanet("Cealdri", 0, 2, "cultural"), makePlanet("Xanhact", 0, 1, "hazardous")] },
  { id: 74, back: "blue", planets: [makePlanet("Vega Major", 2, 1, "cultural"), makePlanet("Vega Minor", 1, 2, "cultural")] },
  { id: 75, back: "blue", planets: [makePlanet("Abaddon", 1, 0, "cultural"), makePlanet("Loki", 1, 2, "cultural"), makePlanet("Ashtroth", 2, 0, "hazardous")] },
  { id: 76, back: "blue", planets: [makePlanet("Rigel I", 0, 1, "hazardous"), makePlanet("Rigel II", 1, 2, "industrial"), makePlanet("Rigel III", 1, 1, "industrial")] },
  { id: 77, back: "red", planets: [] },
  { id: 78, back: "red", planets: [] },
  { id: 79, back: "red", planets: [], anomalies: ["asteroid"], wormholes: ["alpha"] },
  { id: 80, back: "red", planets: [], anomalies: ["supernova"] },
];

// Thunder's Edge — generic system tiles only. Faction/gate home systems
// (92-96, 118), the alternate Mecatol Rex (112), and hyperlane/fracture
// tiles (119-128) are excluded for the same reason as PoK's exclusions
// above. Trait/tech below is sourced from the wiki's Thunder's Edge page
// (which has a fuller "New Planet Systems" table than the general Tiles
// List); that table doesn't cover tile 110's three planets, so those are
// still left null — edit this file to fill them in from your physical set.
const THUNDERS_EDGE_TILES = [
  { id: 97, back: "blue", planets: [makePlanet("Faunus", 1, 3, "industrial", "biotic", true)] },
  { id: 98, back: "blue", planets: [makePlanet("Garbozia", 2, 1, "hazardous", null, true)] },
  { id: 99, back: "blue", planets: [makePlanet("Emelpar", 0, 2, "cultural", null, true)] },
  { id: 100, back: "blue", planets: [makePlanet("Tempesta", 1, 1, "hazardous", "propulsion", true)] },
  { id: 101, back: "blue", planets: [makePlanet("Olergodt", 2, 1, "cultural", "cybernetic")] },
  { id: 102, back: "blue", planets: [makePlanet("Andeara", 1, 1, "industrial", "propulsion")], wormholes: ["alpha"] },
  { id: 103, back: "blue", planets: [makePlanet("Vira-Pics III", 2, 3, "cultural")] },
  { id: 104, back: "blue", planets: [makePlanet("Lesab", 2, 1, "industrial")] },
  { id: 105, back: "blue", planets: [makePlanet("New Terra", 1, 1, "industrial", "biotic"), makePlanet("Tinnes", 2, 1, "industrial", "biotic")] },
  { id: 106, back: "blue", planets: [makePlanet("Cresius", 0, 1, "hazardous"), makePlanet("Lazul Rex", 2, 2, "cultural")] },
  { id: 107, back: "blue", planets: [makePlanet("Tiamat", 2, 1, "cultural", "cybernetic"), makePlanet("Hercalor", 1, 0, "industrial")] },
  { id: 108, back: "blue", planets: [makePlanet("Kostboth", 0, 1, "cultural"), makePlanet("Capha", 3, 0, "hazardous")] },
  { id: 109, back: "blue", planets: [makePlanet("Bellatrix", 1, 2, "cultural"), makePlanet("Tsion Station", 1, 1, null, null, false, true)] },
  { id: 110, back: "blue", planets: [makePlanet("Horizon", 1, 2), makePlanet("Elnath", 2, 0), makePlanet("Luthien VI", 3, 1)] },
  { id: 111, back: "blue", planets: [makePlanet("Tarana", 1, 2, "cultural"), makePlanet("Oluz Station", 1, 1, null, null, false, true)] },
  { id: 113, back: "red", planets: [], anomalies: ["rift"], wormholes: ["beta"] },
  { id: 114, back: "red", planets: [], anomalies: ["entropicScar"] },
  { id: 115, back: "red", planets: [makePlanet("Industrex", 2, 0, "industrial", "warfare")], anomalies: ["asteroid"] },
  { id: 116, back: "red", planets: [makePlanet("Lemox", 0, 3, "industrial")], anomalies: ["entropicScar"] },
  { id: 117, back: "red", planets: [makePlanet("The Watchtower", 1, 1, null, null, false, true)], anomalies: ["rift", "asteroid"] },
];

// Discordant Stars (fan expansion) — its "Uncharted Space" tile set: 5
// legendary planets, 12 blue, 7 red. The source wiki doesn't publish tile
// numbers for the 5 legendary planets, so ids 4251-4255 are assigned here,
// kept distinct from the community's 4257-4276 numbering used for the rest.
const DISCORDANT_STARS_TILES = [
  { id: 4251, back: "blue", planets: [makePlanet("Silence", 2, 2, "industrial", null, true)] },
  { id: 4252, back: "blue", planets: [makePlanet("Echo", 1, 2, "hazardous", null, true)] },
  { id: 4253, back: "blue", planets: [makePlanet("Tarrock", 3, 0, "industrial", null, true)] },
  { id: 4254, back: "blue", planets: [makePlanet("Prism", 0, 3, "industrial", null, true)] },
  { id: 4255, back: "red", planets: [makePlanet("Domna", 2, 1, "hazardous", null, true)], anomalies: ["nebula"] },
  { id: 4257, back: "blue", planets: [makePlanet("Troac", 0, 4, "cultural")] },
  { id: 4258, back: "blue", planets: [makePlanet("Etir V", 4, 0, "hazardous")] },
  { id: 4259, back: "blue", planets: [makePlanet("Vioss", 3, 3, "cultural")] },
  { id: 4260, back: "blue", planets: [makePlanet("Fakrenn", 2, 2, "hazardous")], wormholes: ["alpha"] },
  { id: 4261, back: "blue", planets: [makePlanet("San-Vit", 3, 1, "cultural"), makePlanet("Lodran", 0, 2, "hazardous", "cybernetic")] },
  { id: 4262, back: "blue", planets: [makePlanet("Dorvok", 1, 2, "industrial", "warfare"), makePlanet("Derbrae", 2, 3, "cultural")] },
  { id: 4263, back: "blue", planets: [makePlanet("Moln", 1, 2, "industrial", "propulsion"), makePlanet("Rysaa", 2, 0, "hazardous", "biotic")] },
  { id: 4264, back: "blue", planets: [makePlanet("Salin", 1, 2, "hazardous"), makePlanet("Gwiyun", 2, 2, "hazardous")] },
  { id: 4265, back: "blue", planets: [makePlanet("Inan", 1, 2, "industrial"), makePlanet("Swog", 1, 0, "industrial")] },
  { id: 4266, back: "blue", planets: [makePlanet("Detic", 3, 2, "cultural"), makePlanet("Lliot", 0, 1, "cultural")] },
  { id: 4267, back: "blue", planets: [makePlanet("Qaak", 1, 1, "cultural"), makePlanet("Larred", 1, 1, "industrial"), makePlanet("Nairb", 1, 1, "hazardous")] },
  { id: 4268, back: "blue", planets: [makePlanet("Sierpen", 2, 0, "cultural"), makePlanet("Mandle", 1, 1, "industrial"), makePlanet("Regnem", 0, 2, "hazardous")] },
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
