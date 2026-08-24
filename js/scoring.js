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
