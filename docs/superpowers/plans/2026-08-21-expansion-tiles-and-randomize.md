# Expansion Tile Sets + Configurable Randomize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prophecy of Kings, Thunder's Edge, and Discordant Stars tile data with per-set toggles, and replace the one-click randomize button with a configurable dialog (blue/red ratio, wormhole count, Entropic Scar count, legendary-planet minimum).

**Architecture:** All logic stays in the existing three flat files (`data/tiles-data.js`, `js/app.js`, `css/style.css`, `index.html`) — this is a small static, buildless site with no module system, and introducing one now would fight the grain of the codebase. `data/tiles-data.js` gains three new tile arrays plus a unified pool-building helper; `js/app.js` gains tile-set-toggle state, a randomize dialog, and a fill algorithm, all inside its existing IIFE alongside the current render/place/remove functions.

**Tech Stack:** Vanilla JS, no build step, no test framework.

**Spec:** `docs/superpowers/specs/2026-08-21-expansion-tiles-and-randomize-design.md`

---

## Testing approach (read this first)

This repo has no test framework, no `package.json`, and no build step — it's plain HTML/CSS/JS loaded via `<script>` tags. There is also no Python/Node available on this machine (confirmed during the previous session). The established way to run and verify it (used for the earlier drag-and-drop feature) is:

1. A local static file server already exists at `.claude/launch.json` (config name `"static-site"`, backed by `.claude/serve.ps1`, a pure-PowerShell `HttpListener` on port 8420 — no Python/Node dependency).
2. Start it with the Browser tool: `preview_start` with `{"name": "static-site"}`. This opens a tab serving `http://localhost:8420`.
3. "Tests" in this plan are JavaScript snippets run against that live page via the browser's JS-execution tool (`javascript_tool` / `mcp__Claude_Browser__javascript_tool` depending on your tool names), asserting on `document` state, `TILE_POOL`, etc. Each task's verification step gives you the exact snippet and the exact expected output.
4. There is no automated test suite to add to — do not introduce one; it would be disproportionate to a single-page static tool with no build pipeline.

If your environment doesn't have the Browser tool, open `http://localhost:8420` in any browser and use its devtools console instead — the same snippets apply.

---

### Task 1: Widen tile shape (legendary flag, wormhole/anomaly arrays) and unify pool building

**Files:**
- Modify: `data/tiles-data.js`

- [ ] **Step 1: Read the current file to confirm line numbers before editing**

Run: open `data/tiles-data.js` and confirm it still matches the version described here (a `MECATOL_REX` constant, `makePlanet`, `NAMED_BLUE_TILES`, `WORMHOLE_TILES`, `RED_TILES`, `buildTilePool`, `TILE_POOL`, `ANOMALY_LABELS`, `WORMHOLE_LABELS`). If it doesn't match, stop and re-read this plan's assumptions against the real file before continuing.

- [ ] **Step 2: Update `MECATOL_REX` to use array fields**

Replace:

```js
const MECATOL_REX = {
  id: 18,
  type: "mecatol",
  back: "none",
  name: "Mecatol Rex",
  planets: [{ name: "Mecatol Rex", resources: 1, influence: 6, trait: null, tech: null }],
  wormhole: null,
  anomaly: null,
};
```

with:

```js
const MECATOL_REX = {
  id: 18,
  type: "mecatol",
  back: "none",
  set: "base",
  name: "Mecatol Rex",
  planets: [{ name: "Mecatol Rex", resources: 1, influence: 6, trait: null, tech: null, legendary: false }],
  wormholes: [],
  anomalies: [],
};
```

- [ ] **Step 3: Add a `legendary` parameter to `makePlanet`**

Replace:

```js
function makePlanet(name, resources, influence, trait, tech) {
  return { name, resources, influence, trait: trait || null, tech: tech || null };
}
```

with:

```js
function makePlanet(name, resources, influence, trait, tech, legendary) {
  return { name, resources, influence, trait: trait || null, tech: tech || null, legendary: !!legendary };
}
```

(Every existing call site omits the 6th argument, so every existing planet just gets `legendary: false` — no behavior change.)

- [ ] **Step 4: Add the Entropic Scar label**

In the `ANOMALY_LABELS` object, add a line so it reads:

```js
const ANOMALY_LABELS = {
  nebula: "Nebula",
  supernova: "Supernova",
  asteroid: "Asteroid Field",
  rift: "Gravity Rift",
  entropicScar: "Entropic Scar",
};
```

- [ ] **Step 5: Replace `buildTilePool` with a unified version that emits array fields**

Replace the whole current `buildTilePool` function:

```js
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
```

with:

```js
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
```

Note: this references `POK_TILES`, `THUNDERS_EDGE_TILES`, `DISCORDANT_STARS_TILES`, which don't exist yet — that's expected, they're added in Tasks 2-4. The file will not load correctly until then; that's fine, it's all one commit-free working session until Task 4 finishes. (If you want a working intermediate state, temporarily add `const POK_TILES = []; const THUNDERS_EDGE_TILES = []; const DISCORDANT_STARS_TILES = [];` above `buildTilePool`, verify, then remove those three lines in Task 2's Step 1. Simplest is to just do Tasks 1-4 back-to-back before your first in-browser check.)

- [ ] **Step 6: Commit is deferred to the end of Task 4** (this task alone doesn't produce a loadable page). Continue directly to Task 2.

---

### Task 2: Add Prophecy of Kings tile data

**Files:**
- Modify: `data/tiles-data.js`

- [ ] **Step 1: Insert the `POK_TILES` array**

Add this directly above the `function buildTilePool()` line (after `RED_TILES`):

```js
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
```

- [ ] **Step 2: Continue directly to Task 3** (the file still won't load until `THUNDERS_EDGE_TILES` and `DISCORDANT_STARS_TILES` exist).

---

### Task 3: Add Thunder's Edge tile data

**Files:**
- Modify: `data/tiles-data.js`

- [ ] **Step 1: Insert the `THUNDERS_EDGE_TILES` array**

Add directly below the `POK_TILES` array you just added:

```js
// Thunder's Edge — generic system tiles only. Faction/gate home systems
// (92-96, 118), the alternate Mecatol Rex (112), and hyperlane/fracture
// tiles (119-128) are excluded for the same reason as PoK's exclusions
// above. The wiki's tile list doesn't record planet trait/tech for this
// expansion, so those are left null — edit this file to fill them in
// from your physical set if you want that detail.
const THUNDERS_EDGE_TILES = [
  { id: 97, back: "blue", planets: [makePlanet("Faunus", 1, 3, null, null, true)] },
  { id: 98, back: "blue", planets: [makePlanet("Garbozia", 2, 1, null, null, true)] },
  { id: 99, back: "blue", planets: [makePlanet("Emelpar", 0, 2, null, null, true)] },
  { id: 100, back: "blue", planets: [makePlanet("Tempesta", 1, 1, null, null, true)] },
  { id: 101, back: "blue", planets: [makePlanet("Olergodt", 2, 1)] },
  { id: 102, back: "blue", planets: [makePlanet("Andeara", 1, 1)], wormholes: ["alpha"] },
  { id: 103, back: "blue", planets: [makePlanet("Vira-Pics III", 2, 3)] },
  { id: 104, back: "blue", planets: [makePlanet("Lesab", 2, 1)] },
  { id: 105, back: "blue", planets: [makePlanet("New Terra", 1, 1), makePlanet("Tinnes", 2, 1)] },
  { id: 106, back: "blue", planets: [makePlanet("Cresius", 0, 1), makePlanet("Lazul Rex", 2, 2)] },
  { id: 107, back: "blue", planets: [makePlanet("Tiamat", 2, 1), makePlanet("Hercalor", 1, 0)] },
  { id: 108, back: "blue", planets: [makePlanet("Kostboth", 0, 1), makePlanet("Capha", 3, 0)] },
  { id: 109, back: "blue", planets: [makePlanet("Bellatrix", 1, 2), makePlanet("Tsion Station", 1, 1)] },
  { id: 110, back: "blue", planets: [makePlanet("Horizon", 1, 2), makePlanet("Elnath", 2, 0), makePlanet("Luthien VI", 3, 1)] },
  { id: 111, back: "blue", planets: [makePlanet("Tarana", 1, 2), makePlanet("Oluz Station", 1, 1)] },
  { id: 113, back: "red", planets: [], anomalies: ["rift"], wormholes: ["beta"] },
  { id: 114, back: "red", planets: [], anomalies: ["entropicScar"] },
  { id: 115, back: "red", planets: [makePlanet("Industrex", 2, 0)], anomalies: ["asteroid"] },
  { id: 116, back: "red", planets: [makePlanet("Lemox", 0, 3)], anomalies: ["entropicScar"] },
  { id: 117, back: "red", planets: [makePlanet("The Watchtower", 1, 1)], anomalies: ["rift", "asteroid"] },
];
```

- [ ] **Step 2: Continue directly to Task 4** (the file still won't load until `DISCORDANT_STARS_TILES` exists).

---

### Task 4: Add Discordant Stars tile data, then verify the whole pool loads

**Files:**
- Modify: `data/tiles-data.js`

- [ ] **Step 1: Insert the `DISCORDANT_STARS_TILES` array**

Add directly below the `THUNDERS_EDGE_TILES` array, **above** the `function addPoolTile(...)` / `function buildTilePool()` functions from Task 1:

```js
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
```

- [ ] **Step 2: Start the preview server**

Use the Browser tool: `preview_start` with `{"name": "static-site"}` (uses the existing `.claude/launch.json` config). This opens a tab at `http://localhost:8420`.

- [ ] **Step 3: Verify the pool size and set tags via the browser JS tool**

Run this JS against the page:

```js
JSON.stringify({
  total: TILE_POOL.length,
  bySet: TILE_POOL.reduce((acc, t) => { acc[t.set] = (acc[t.set] || 0) + 1; return acc; }, {}),
  legendaryCount: TILE_POOL.filter(t => t.planets.some(p => p.legendary)).length,
  entropicScarCount: TILE_POOL.filter(t => t.anomalies.includes("entropicScar")).length,
})
```

Expected: `bySet` shows `{"base": 52, "pok": 22, "thunders-edge": 20, "discordant-stars": 24}` (52 = 32 `NAMED_BLUE_TILES` + 2 `WORMHOLE_TILES` + 18 `RED_TILES`, confirmed by grepping the current file; `total` is `118`). `legendaryCount` is `11` (2 PoK + 4 Thunder's Edge + 5 Discordant Stars). `entropicScarCount` is `2`. No JS errors in the console.

- [ ] **Step 4: Confirm no duplicate tile ids within any single set (a real bug class here — copy/paste id typos)**

```js
["base", "pok", "thunders-edge", "discordant-stars"].map(set => {
  const ids = TILE_POOL.filter(t => t.set === set).map(t => t.id);
  return [set, ids.length, new Set(ids).size];
})
```

Expected: for every row, the 2nd and 3rd numbers match (no duplicates).

- [ ] **Step 5: Commit**

```bash
git add data/tiles-data.js
git commit -m "$(cat <<'EOF'
Add PoK, Thunder's Edge, and Discordant Stars tile data

Widens tile wormhole/anomaly from single strings to arrays (several
real tiles carry two) and adds a legendary planet flag, then rebuilds
buildTilePool() as one unified helper across all four tile sets.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Update `js/app.js` to consume `wormholes`/`anomalies` arrays

**Files:**
- Modify: `js/app.js:100-141` (`drawTile`), `js/app.js:130-142` (`showTooltip`), `js/app.js:185-191` (`tooltipText`)

(Line numbers are from the file as of the drag-and-drop change; re-locate by function name if they've drifted.)

- [ ] **Step 1: Update `drawTile`'s tag rendering**

Replace:

```js
    const tags = [];
    if (tile.wormhole) tags.push(WORMHOLE_LABELS[tile.wormhole] || tile.wormhole);
    if (tile.anomaly) tags.push(ANOMALY_LABELS[tile.anomaly] || tile.anomaly);
```

with:

```js
    const tags = [];
    tile.wormholes.forEach((w) => tags.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => tags.push(ANOMALY_LABELS[a] || a));
```

- [ ] **Step 2: Update `showTooltip`**

Replace:

```js
    if (tile.wormhole) lines.push(WORMHOLE_LABELS[tile.wormhole] || tile.wormhole);
    if (tile.anomaly) lines.push(ANOMALY_LABELS[tile.anomaly] || tile.anomaly);
```

with:

```js
    tile.wormholes.forEach((w) => lines.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => lines.push(ANOMALY_LABELS[a] || a));
```

- [ ] **Step 3: Update `tooltipText`**

Replace:

```js
    if (tile.wormhole) parts.push(WORMHOLE_LABELS[tile.wormhole]);
    if (tile.anomaly) parts.push(ANOMALY_LABELS[tile.anomaly]);
```

with:

```js
    tile.wormholes.forEach((w) => parts.push(WORMHOLE_LABELS[w]));
    tile.anomalies.forEach((a) => parts.push(ANOMALY_LABELS[a]));
```

- [ ] **Step 4: Verify in the browser** (call `preview_start` with `{"name": "static-site"}` again if you're unsure whether the server from Task 4 is still running — it reuses the existing one — then reload the tab so it picks up the new `app.js`)

```js
// Place Thunder's Edge tile #117 (Gravity Rift + Asteroid Field) on the
// board by going straight through the pool/board maps, then read its tags.
const t117 = [...document.querySelectorAll('.hex.empty')][0];
JSON.stringify(TILE_POOL.find(t => t.id === 117 && t.set === "thunders-edge").anomalies)
```

Expected: `["rift","asteroid"]` and no console errors from the earlier edits (this confirms the data survived Task 1-4 and `anomalies`/`wormholes` are real arrays, not `undefined`, before you wire up any UI to actually place it).

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "$(cat <<'EOF'
Render multi-value wormhole/anomaly tags on hexes

Follows up the tiles-data.js array widening — a tile can now carry
more than one wormhole or anomaly (e.g. Thunder's Edge #117 has both
a Gravity Rift and an Asteroid Field).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Tile Sets toggle panel (persistent, filters the whole palette)

**Files:**
- Modify: `index.html` (aside), `css/style.css`, `js/app.js`

- [ ] **Step 1: Add markup in `index.html`**

In the `<aside class="palette-panel">` block, insert a new `palette-group` as the **first** one, before the existing "Blue systems" group:

```html
      <div class="palette-group">
        <h3>Tile Sets</h3>
        <div class="tile-set-list" id="tile-sets"></div>
      </div>
```

- [ ] **Step 2: Add CSS in `css/style.css`**

Append:

```css
.tile-set-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tile-set-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.tile-set-toggle input {
  width: auto;
}
```

- [ ] **Step 3: Add state and rendering in `js/app.js`**

Near the top of the file, right after the `let playerNames = [...]` line, add:

```js
  const TILE_SETS = [
    { key: "pok", label: "Prophecy of Kings" },
    { key: "thunders-edge", label: "Thunder's Edge" },
    { key: "discordant-stars", label: "Discordant Stars" },
  ];
  let enabledSets = new Set(TILE_SETS.map((s) => s.key));
```

Near the other `const X = document.getElementById(...)` lines, add:

```js
  const tileSetsEl = document.getElementById("tile-sets");
```

Add a new function (place it right after `poolKey`):

```js
  function visiblePoolTiles() {
    return [...pool.values()].filter((t) => t.set === "base" || enabledSets.has(t.set));
  }

  function renderTileSetToggles() {
    tileSetsEl.innerHTML = "";
    TILE_SETS.forEach((s) => {
      const label = document.createElement("label");
      label.className = "tile-set-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = enabledSets.has(s.key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) enabledSets.add(s.key);
        else enabledSets.delete(s.key);
        persist();
        renderAll();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + s.label));
      tileSetsEl.appendChild(label);
    });
  }
```

- [ ] **Step 4: Filter the palette by the enabled sets**

In `renderPalette`, replace:

```js
  function renderPalette() {
    paletteBlue.innerHTML = "";
    paletteRed.innerHTML = "";
    [...pool.values()]
      .sort((a, b) => a.id - b.id)
```

with:

```js
  function renderPalette() {
    paletteBlue.innerHTML = "";
    paletteRed.innerHTML = "";
    visiblePoolTiles()
      .sort((a, b) => a.id - b.id)
```

(the rest of the function body is unchanged).

- [ ] **Step 5: Persist enabled sets alongside the rest of the map state**

In `serialize()`, replace:

```js
  function serialize() {
    return {
      version: 1,
      rings: RINGS,
      playerNames,
      placements: [...board.entries()].map(([key, tile]) => ({ key, tileId: tile.id, back: tile.back, name: tile.name })),
    };
  }
```

with:

```js
  function serialize() {
    return {
      version: 1,
      rings: RINGS,
      playerNames,
      enabledSets: [...enabledSets],
      placements: [...board.entries()].map(([key, tile]) => ({ key, tileId: tile.id, back: tile.back, name: tile.name })),
    };
  }
```

In `loadFromObject`, replace:

```js
  function loadFromObject(data) {
    if (!data || !Array.isArray(data.placements)) return;
    pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
    board = new Map();
    if (Array.isArray(data.playerNames)) playerNames = data.playerNames;
    data.placements.forEach((p) => {
      const match = [...pool.values()].find((t) => t.id === p.tileId && t.back === p.back && t.name === p.name);
      if (match) {
        pool.delete(poolKey(match));
        board.set(p.key, match);
      }
    });
    selectedPoolKey = null;
    renderPlayerLabels();
    renderAll();
  }
```

with:

```js
  function loadFromObject(data) {
    if (!data || !Array.isArray(data.placements)) return;
    pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
    board = new Map();
    if (Array.isArray(data.playerNames)) playerNames = data.playerNames;
    if (Array.isArray(data.enabledSets)) enabledSets = new Set(data.enabledSets);
    data.placements.forEach((p) => {
      const match = [...pool.values()].find((t) => t.id === p.tileId && t.back === p.back && t.name === p.name);
      if (match) {
        pool.delete(poolKey(match));
        board.set(p.key, match);
      }
    });
    selectedPoolKey = null;
    renderPlayerLabels();
    renderTileSetToggles();
    renderAll();
  }
```

- [ ] **Step 6: Call `renderTileSetToggles()` once on startup**

In `init()`, replace:

```js
    renderPlayerLabels();
    if (saved) {
      loadFromObject(saved);
    } else {
      renderAll();
    }
```

with:

```js
    renderPlayerLabels();
    renderTileSetToggles();
    if (saved) {
      loadFromObject(saved);
    } else {
      renderAll();
    }
```

- [ ] **Step 7: Verify in the browser** (`preview_start` with `{"name": "static-site"}` reuses the running server if it's already up; reload the tab)

```js
JSON.stringify({
  checkboxCount: document.querySelectorAll('#tile-sets input[type=checkbox]').length,
  paletteTileCount: document.querySelectorAll('.palette-tile').length,
})
```

Expected: `checkboxCount` is `3`. `paletteTileCount` equals the full `TILE_POOL.length` from Task 4's Step 3 (all sets start enabled).

Now uncheck the first checkbox (Prophecy of Kings) and re-check:

```js
document.querySelectorAll('#tile-sets input[type=checkbox]')[0].click();
document.querySelectorAll('.palette-tile').length
```

Expected: drops by exactly `22` (the PoK tile count).

```js
document.querySelectorAll('#tile-sets input[type=checkbox]')[0].click();
document.querySelectorAll('.palette-tile').length
```

Expected: back to the original full count — toggling off and back on loses nothing.

- [ ] **Step 8: Verify persistence across reload**

```js
document.querySelectorAll('#tile-sets input[type=checkbox]')[1].click(); // turn off Thunder's Edge
```

Reload the page (`navigate` to the same URL, or F5), then:

```js
JSON.stringify([...document.querySelectorAll('#tile-sets input[type=checkbox]')].map(c => c.checked))
```

Expected: `[true,false,true]` — the unchecked state survived the reload via `localStorage`. Re-check it afterward so the app is back to its default all-enabled state for the next task.

- [ ] **Step 9: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "$(cat <<'EOF'
Add persistent Tile Sets toggle panel

Prophecy of Kings, Thunder's Edge, and Discordant Stars can each be
switched off, which removes their unplaced tiles from the palette
immediately. Already-placed tiles from a disabled set are left on the
board. State is saved to localStorage alongside the rest of the map.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Randomize dialog shell (open/cancel, no fill logic yet)

**Files:**
- Modify: `index.html`, `css/style.css`, `js/app.js`

- [ ] **Step 1: Add the modal markup in `index.html`**

Change the toolbar button's label (still same id/behavior wiring changes in a later step):

```html
        <button id="btn-randomize">🎲 Randomize…</button>
```

(replaces `<button id="btn-randomize">🎲 Randomize empty tiles</button>`)

Add this new block right after the `<div id="tile-tooltip" ...></div>` line, before `<footer>`:

```html
  <div id="randomize-modal" class="modal-overlay hidden">
    <div class="modal">
      <h2>Randomize empty tiles</h2>
      <label class="modal-field">
        <span id="ratio-label">50% blue / 50% red</span>
        <input type="range" id="opt-ratio" min="0" max="100" step="5" value="50" />
      </label>
      <label class="modal-field">
        Wormholes
        <input type="number" id="opt-wormholes" min="0" step="1" value="0" />
      </label>
      <label class="modal-field">
        Entropic Scars
        <input type="number" id="opt-entropic" min="0" max="2" step="1" value="0" />
      </label>
      <label class="modal-field">
        Legendary planets (minimum)
        <input type="number" id="opt-legendary" min="0" step="1" value="0" />
      </label>
      <div class="modal-actions">
        <button id="btn-randomize-cancel">Cancel</button>
        <button id="btn-randomize-apply">Randomize</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add CSS in `css/style.css`**

Append:

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 5, 10, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-overlay.hidden { display: none; }
.modal {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  width: min(360px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal h2 { margin: 0; font-size: 1.05rem; }
.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--text-dim);
}
.modal-field input[type="number"],
.modal-field input[type="range"] {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 6px 8px;
  font-size: 0.9rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
```

- [ ] **Step 3: Wire open/cancel in `js/app.js`**

Near the other `const X = document.getElementById(...)` lines, add:

```js
  const randomizeModal = document.getElementById("randomize-modal");
  const optRatio = document.getElementById("opt-ratio");
  const ratioLabel = document.getElementById("ratio-label");
  const optWormholes = document.getElementById("opt-wormholes");
  const optEntropic = document.getElementById("opt-entropic");
  const optLegendary = document.getElementById("opt-legendary");
```

Add these functions near `randomizeEmpty` (which you'll remove in Step 4):

```js
  function updateRatioLabel() {
    ratioLabel.textContent = `${optRatio.value}% blue / ${100 - optRatio.value}% red`;
  }

  function openRandomizeModal() {
    updateRatioLabel();
    randomizeModal.classList.remove("hidden");
  }

  function closeRandomizeModal() {
    randomizeModal.classList.add("hidden");
  }
```

- [ ] **Step 4: Replace the old one-click randomize wiring**

In `init()`, replace:

```js
    document.getElementById("btn-randomize").addEventListener("click", randomizeEmpty);
```

with:

```js
    document.getElementById("btn-randomize").addEventListener("click", openRandomizeModal);
    document.getElementById("btn-randomize-cancel").addEventListener("click", closeRandomizeModal);
    optRatio.addEventListener("input", () => {
      optRatio.dataset.touched = "1";
      updateRatioLabel();
    });
```

Leave the `randomizeEmpty` function itself in place for now (it becomes dead code once Task 8 wires up the real apply handler and you delete it there — don't delete it yet, Step 5's verification below doesn't need it removed).

- [ ] **Step 5: Verify in the browser** (`preview_start` with `{"name": "static-site"}` reuses the running server if it's already up; reload the tab)

```js
document.getElementById('btn-randomize').click();
document.getElementById('randomize-modal').classList.contains('hidden')
```

Expected: `false` (modal is open).

```js
document.getElementById('btn-randomize-cancel').click();
document.getElementById('randomize-modal').classList.contains('hidden')
```

Expected: `true` (modal closed, and the board is untouched — no tiles were placed, since nothing wires the Randomize button to any fill logic yet).

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "$(cat <<'EOF'
Add Randomize dialog shell (open/cancel only)

The toolbar button now opens a modal instead of instantly filling the
board. The fill algorithm and option bounds land in the next commit;
for now Cancel is the only working action.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Bounds computation + fill algorithm + Apply button

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Make `shuffle` return its array**

Replace:

```js
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
```

with:

```js
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
```

(Existing callers ignore the return value, so this is backward compatible.)

- [ ] **Step 2: Add an empty-slot-count helper**

Add this function near `randomizeEmpty`:

```js
  function emptySlotKeys() {
    return cells
      .filter((c) => c.ring > 0 && !homeKeys.has(keyFor(c.q, c.r)) && !board.has(keyFor(c.q, c.r)))
      .map((c) => keyFor(c.q, c.r));
  }
```

- [ ] **Step 3: Replace `randomizeEmpty` with the bounds-computation + fill-algorithm pair**

Replace the entire existing function:

```js
  function randomizeEmpty() {
    const emptyKeys = cells
      .filter((c) => c.ring > 0 && !homeKeys.has(keyFor(c.q, c.r)) && !board.has(keyFor(c.q, c.r)))
      .map((c) => keyFor(c.q, c.r));
    const available = [...pool.values()];
    shuffle(available);
    emptyKeys.forEach((key, i) => {
      const tile = available[i];
      if (!tile) return;
      pool.delete(poolKey(tile));
      board.set(key, tile);
    });
    selectedPoolKey = null;
    persist();
    renderAll();
  }
```

with:

```js
  function updateRandomizeBounds() {
    const available = visiblePoolTiles();
    const n = emptySlotKeys().length;

    const wormholeAvail = available.filter((t) => t.wormholes.length > 0).length;
    const entropicAvail = available.filter((t) => t.anomalies.includes("entropicScar")).length;
    const legendaryAvail = available.filter((t) => t.planets.some((p) => p.legendary)).length;
    const blueAvail = available.filter((t) => t.back === "blue").length;
    const redAvail = available.filter((t) => t.back === "red").length;

    optWormholes.max = String(Math.min(wormholeAvail, n));
    optWormholes.value = String(Math.min(Number(optWormholes.value) || 0, Number(optWormholes.max)));
    optEntropic.max = String(Math.min(entropicAvail, 2, n));
    optEntropic.value = String(Math.min(Number(optEntropic.value) || 0, Number(optEntropic.max)));
    optLegendary.max = String(Math.min(legendaryAvail, n));
    optLegendary.value = String(Math.min(Number(optLegendary.value) || 0, Number(optLegendary.max)));

    if (!optRatio.dataset.touched) {
      const naturalBluePct = blueAvail + redAvail > 0 ? Math.round((100 * blueAvail) / (blueAvail + redAvail)) : 50;
      optRatio.value = String(naturalBluePct);
    }
    updateRatioLabel();
  }

  function randomizeWithOptions(opts) {
    const emptyKeys = shuffle(emptySlotKeys());
    const n = emptyKeys.length;

    const available = visiblePoolTiles();
    const used = new Set();
    const selected = [];

    function takeRandom(candidates, count) {
      const pickable = shuffle(candidates.filter((t) => !used.has(poolKey(t))));
      const take = pickable.slice(0, Math.max(0, Math.min(count, n - selected.length)));
      take.forEach((t) => {
        used.add(poolKey(t));
        selected.push(t);
      });
    }

    takeRandom(available.filter((t) => t.planets.some((p) => p.legendary)), opts.legendaryMin);
    takeRandom(available.filter((t) => t.anomalies.includes("entropicScar")), opts.entropicScarCount);
    takeRandom(available.filter((t) => t.wormholes.length > 0), opts.wormholeCount);

    const remaining = n - selected.length;
    const rest = shuffle(
      available.filter((t) => !used.has(poolKey(t)) && t.wormholes.length === 0 && !t.anomalies.includes("entropicScar"))
    );
    const blues = rest.filter((t) => t.back === "blue");
    const reds = rest.filter((t) => t.back === "red");
    const blueTarget = Math.round((remaining * opts.bluePct) / 100);
    const takeBlue = Math.min(blueTarget, blues.length);
    const takeRed = Math.min(remaining - takeBlue, reds.length);
    selected.push(...blues.slice(0, takeBlue), ...reds.slice(0, takeRed));

    const stillNeeded = remaining - takeBlue - takeRed;
    if (stillNeeded > 0) {
      const usedNow = new Set(selected.map(poolKey));
      const leftover = rest.filter((t) => !usedNow.has(poolKey(t))).slice(0, stillNeeded);
      selected.push(...leftover);
    }

    shuffle(selected);
    emptyKeys.forEach((key, i) => {
      const tile = selected[i];
      if (!tile) return;
      pool.delete(poolKey(tile));
      board.set(key, tile);
    });

    selectedPoolKey = null;
    persist();
    renderAll();
  }
```

- [ ] **Step 4: Call bounds computation when the dialog opens, and wire Apply**

In `openRandomizeModal`, replace:

```js
  function openRandomizeModal() {
    updateRatioLabel();
    randomizeModal.classList.remove("hidden");
  }
```

with:

```js
  function openRandomizeModal() {
    updateRandomizeBounds();
    randomizeModal.classList.remove("hidden");
  }
```

In `init()`, add (right after the `btn-randomize-cancel` wiring from Task 7):

```js
    document.getElementById("btn-randomize-apply").addEventListener("click", () => {
      randomizeWithOptions({
        bluePct: Number(optRatio.value),
        wormholeCount: Number(optWormholes.value),
        entropicScarCount: Number(optEntropic.value),
        legendaryMin: Number(optLegendary.value),
      });
      closeRandomizeModal();
    });
```

- [ ] **Step 5: Verify bounds respond to tile-set toggles** (`preview_start` with `{"name": "static-site"}` reuses the running server if it's already up; reload the tab)

```js
document.getElementById('btn-randomize').click();
JSON.stringify({ entropicMax: document.getElementById('opt-entropic').max, legendaryMax: document.getElementById('opt-legendary').max })
```

Expected: `entropicMax` is `"2"`, `legendaryMax` is `"11"` (all sets enabled, board empty except home/Mecatol so plenty of slots).

```js
document.getElementById('btn-randomize-cancel').click();
document.querySelectorAll('#tile-sets input[type=checkbox]')[1].click(); // turn off Thunder's Edge
document.getElementById('btn-randomize').click();
document.getElementById('opt-entropic').max
```

Expected: `"0"` (Thunder's Edge was the only source of Entropic Scar tiles).

```js
document.getElementById('btn-randomize-cancel').click();
document.querySelectorAll('#tile-sets input[type=checkbox]')[1].click(); // turn Thunder's Edge back on
```

- [ ] **Step 6: Verify the fill respects all four options**

```js
document.getElementById('btn-randomize').click();
document.getElementById('opt-legendary').value = document.getElementById('opt-legendary').max;
document.getElementById('opt-entropic').value = document.getElementById('opt-entropic').max;
document.getElementById('opt-wormholes').value = document.getElementById('opt-wormholes').max;
document.getElementById('btn-randomize-apply').click();

function boardAnomalyCount(name) { return [...board.values()].filter(t => t.anomalies.includes(name)).length; }
function boardWormholeCount() { return [...board.values()].filter(t => t.wormholes.length > 0).length; }
function boardLegendaryCount() { return [...board.values()].filter(t => t.planets.some(p => p.legendary)).length; }
JSON.stringify({
  entropicScar: boardAnomalyCount("entropicScar"),
  wormholes: boardWormholeCount(),
  legendary: boardLegendaryCount(),
  filled: board.size,
})
```

Expected: `entropicScar` is `2`, `wormholes` matches whatever `opt-wormholes`'s max was, `legendary` is `>=` whatever `opt-legendary`'s max was (it's a floor, extra legendaries can appear via the ratio fill), and `filled` equals the number of empty slots that existed before clicking Apply (30 for an untouched board: 37 hexes minus 1 Mecatol minus 6 home slots).

- [ ] **Step 7: Verify manually-placed tiles are never touched by Randomize**

```js
document.getElementById('btn-clear').click();
const paletteFirst = document.querySelector('#palette-blue .palette-tile');
paletteFirst.click();
document.querySelector('.hex.empty').click(); // manually place one tile
const manuallyPlacedKey = [...board.keys()][0];
const manuallyPlacedTileId = board.get(manuallyPlacedKey).id;

document.getElementById('btn-randomize').click();
document.getElementById('btn-randomize-apply').click();

JSON.stringify({ stillThere: board.get(manuallyPlacedKey).id === manuallyPlacedTileId })
```

Expected: `stillThere` is `true`.

- [ ] **Step 8: Clean up test state and reload**

```js
document.getElementById('btn-clear').click();
```

Reload the tab so `localStorage` reflects a clean board for real use.

- [ ] **Step 9: Commit**

```bash
git add js/app.js
git commit -m "$(cat <<'EOF'
Wire up Randomize option bounds and fill algorithm

Wormhole count, Entropic Scar count, and legendary-planet minimum are
now real, board-aware controls: each control's max is computed from
what's actually available in the enabled, not-yet-placed pool, so
there's no way to configure a combination the pool can't satisfy.
Fill order is legendary minimum -> Entropic Scar count -> wormhole
count -> blue/red ratio for whatever's left, all shuffled into the
empty hexes. Manually placed tiles are never touched.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Full manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Reload the page fresh and click through the whole feature by hand** (not just via JS assertions — actually look at it, since this is a UI feature)

Use the Browser tool's `computer` screenshot action (or your browser's own view) to:
1. Confirm the "Tile Sets" section renders above "Blue systems" in the sidebar with 3 checked checkboxes.
2. Toggle each one off and on; watch the blue/red palette grids gain and lose tiles.
3. Click "🎲 Randomize…"; confirm the modal appears centered with all 4 controls.
4. Drag the ratio slider; confirm the label text above it updates live (e.g. "80% blue / 20% red").
5. Click Randomize; confirm the board fills and the modal closes.
6. Click "🎲 Randomize…" again with a full board; confirm it still opens (bounds should show `0` for everything since there are no empty slots left) and Apply is a no-op that doesn't error.
7. Click "🗑️ Clear board" to reset.

- [ ] **Step 2: Check the browser console for errors** across the whole walkthrough (`read_console_messages` with `onlyErrors: true` if using the Browser tool) — expect none.

- [ ] **Step 3: Stop the preview server**

The server was started back in Task 4, possibly by a different subagent with no shared memory of its `serverId`. Look it up first: use the Browser tool's `preview_list` to find the running `static-site` server's `serverId`, then call `preview_stop` with that id.

- [ ] **Step 4: Push**

```bash
git push
```

(Only if the user has already approved pushing in this session's conventions — check before running; this repo's history shows pushes happen on explicit user request, not automatically after every commit.)
