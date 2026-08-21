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
  name: "Mecatol Rex",
  planets: [{ name: "Mecatol Rex", resources: 1, influence: 6, trait: null, tech: null }],
  wormhole: null,
  anomaly: null,
};

const TRAITS = ["cultural", "industrial", "hazardous"];
const TECHS = ["propulsion", "cybernetic", "biotic", "warfare"];

function makePlanet(name, resources, influence, trait, tech) {
  return { name, resources, influence, trait: trait || null, tech: tech || null };
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

function buildTilePool() {
  const pool = [];
  NAMED_BLUE_TILES.forEach((t) => {
    pool.push({
      id: t.id,
      type: "system",
      back: "blue",
      name: `Tile ${t.id}`,
      planets: t.planets,
      wormhole: t.wormhole || null,
      anomaly: null,
    });
  });
  WORMHOLE_TILES.forEach((t) => {
    pool.push({
      id: t.id,
      type: "system",
      back: "blue",
      name: `Tile ${t.id}`,
      planets: t.planets,
      wormhole: t.wormhole,
      anomaly: null,
    });
  });
  RED_TILES.forEach((t) => {
    pool.push({
      id: t.id,
      type: "system",
      back: "red",
      name: `Tile ${t.id}`,
      planets: t.planets,
      wormhole: t.wormhole || null,
      anomaly: t.anomaly || null,
    });
  });
  return pool;
}

const TILE_POOL = buildTilePool();

const ANOMALY_LABELS = {
  nebula: "Nebula",
  supernova: "Supernova",
  asteroid: "Asteroid Field",
  rift: "Gravity Rift",
};

const WORMHOLE_LABELS = {
  alpha: "α Wormhole",
  beta: "β Wormhole",
  gamma: "γ Wormhole",
  delta: "δ Wormhole",
};
