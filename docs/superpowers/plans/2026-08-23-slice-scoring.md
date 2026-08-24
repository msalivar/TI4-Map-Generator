# Slice Scoring & Home Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute a numeric value for tiles and for each home system's reachable slice, and display it: score/resources/tech-skips on each home tile, a value line in every tile's tooltip, an itemized breakdown tooltip on home tiles, and a top-right "biggest gap" overlay.

**Architecture:** A new pure-function file `js/scoring.js` (no DOM access, same style as the existing `js/hexgrid.js`) computes planet/tile/slice values. `js/app.js` calls into it once per `renderBoard()` (no caching, matching the existing `renderBoardStats()` pattern) and wires the results into the home-tile SVG text, tooltips, and a new overlay panel.

**Tech Stack:** Plain JS, no build step, no test framework. Verification is manual in-browser via the project's existing local server (`.claude/launch.json`'s `static-site` config / the Claude Code Browser tool's `preview_start`), per `CLAUDE.md`'s established "Testing changes" convention.

**Spec:** `docs/superpowers/specs/2026-08-23-slice-scoring-design.md`

---

### Task 1: Add hex-distance math to `js/hexgrid.js`

**Files:**
- Modify: `js/hexgrid.js`

- [ ] **Step 1: Add `hexDistance` right after `keyFor`**

Open `js/hexgrid.js`. Find:

```js
function keyFor(q, r) {
  return `${q},${r}`;
}
```

Add this function immediately after it (before `homeSlotKeys`):

```js
function keyFor(q, r) {
  return `${q},${r}`;
}

// Standard axial hex distance (cube-coordinate distance / 2).
function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
```

- [ ] **Step 2: Verify in-browser**

Start the local server (`.claude/launch.json`'s `static-site` config, port 8420 — see `CLAUDE.md`'s "Testing changes" section) and open the page. In the browser console (or via the Claude Code Browser tool's JS execution), run:

```js
JSON.stringify([
  hexDistance(0, 0, 3, 0),
  hexDistance(0, 0, 1, -1),
  hexDistance(3, -3, 0, 0),
])
```

Expected: `"[3,1,3]"`

- [ ] **Step 3: Commit**

```bash
git add js/hexgrid.js
git commit -m "Add hex-distance helper for slice scoring"
```

---

### Task 2: `js/scoring.js` — planet and tile value functions

**Files:**
- Create: `js/scoring.js`

- [ ] **Step 1: Create the file with per-planet and per-tile scoring**

```js
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
```

- [ ] **Step 2: Wire the script tag (needed now so the browser can load it for verification)**

Open `index.html`. Find:

```html
  <script src="js/hexgrid.js"></script>
  <script src="js/app.js"></script>
```

Replace with:

```html
  <script src="js/hexgrid.js"></script>
  <script src="js/scoring.js"></script>
  <script src="js/app.js"></script>
```

- [ ] **Step 3: Verify in-browser**

Start the local server and open the page. In the console:

```js
JSON.stringify({
  faunus: tileValue({ planets: [{ name: "Faunus", resources: 3, influence: 1, tech: "biotic", legendary: true, station: false }], wormholes: [], anomalies: [] }),
  wormholeTile: tileValue({ planets: [], wormholes: ["alpha"], anomalies: [] }),
  entropicScar: tileValue({ planets: [], wormholes: [], anomalies: ["entropicScar"] }),
  optRes: tileOptimalResources({ planets: [{ resources: 2, influence: 1 }, { resources: 1, influence: 3 }] }),
  optInf: tileOptimalInfluence({ planets: [{ resources: 2, influence: 1 }, { resources: 1, influence: 3 }] }),
  techTypes: tileTechTypes({ planets: [{ tech: "biotic" }, { tech: null }, { tech: "warfare" }] }),
})
```

Expected: `faunus` = `5` (base 3 + tech 0.5 + legendary 1.5), `wormholeTile` = `1`, `entropicScar` = `2`, `optRes` = `2`, `optInf` = `3`, `techTypes` = `["biotic","warfare"]`.

- [ ] **Step 4: Commit**

```bash
git add js/scoring.js index.html
git commit -m "Add per-planet/per-tile value scoring"
```

---

### Task 3: `js/scoring.js` — home slice aggregation

**Files:**
- Modify: `js/scoring.js`

- [ ] **Step 1: Add `computeHomeSlices`**

Append to the end of `js/scoring.js`:

```js
function parseKey(key) {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

/**
 * Computes each home system's slice value: every board tile within
 * hex-distance <=2 of that home contributes its value (split evenly
 * across every home that reaches it, if more than one does), plus a
 * penalty if a supernova/nebula sits on that home's fixed path to
 * Mecatol Rex. `board` is a Map<"q,r", tile>; `homeKeys` an iterable of
 * "q,r" strings; `rings` the board's ring count (used to find each
 * home's direction vector: homes sit at direction * rings, so their
 * fixed 2-tile path to Mecatol is at direction*2 and direction*1).
 * Returns a Map<homeKey, breakdown>, where breakdown is:
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

  board.forEach((tile, key) => {
    const { q, r } = parseKey(key);
    const reachingHomes = homeKeyList.filter((homeKey) => {
      const home = parseKey(homeKey);
      return hexDistance(q, r, home.q, home.r) <= 2;
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
    const home = parseKey(homeKey);
    const dq = home.q / rings;
    const dr = home.r / rings;
    const pathKeys = [keyFor(dq * 2, dr * 2), keyFor(dq * 1, dr * 1)];
    let penalty = 0;
    pathKeys.forEach((pathKey) => {
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
```

- [ ] **Step 2: Verify in-browser**

Start the local server and open the page. In the console (uses the real board geometry already loaded via `hexgrid.js`):

```js
(() => {
  const homeKeys = homeSlotKeys(3); // real 3-ring home corners
  const home = homeKeys[0];
  const homeCoords = home.split(",").map(Number);
  const dir = { q: homeCoords[0] / 3, r: homeCoords[1] / 3 };
  const nearTileKey = keyFor(dir.q * 2, dir.r * 2); // on this home's fixed path
  const farTileKey = keyFor(-dir.q * 2, -dir.r * 2); // far side of the board, unreachable

  const board = new Map();
  board.set(nearTileKey, { id: 999, planets: [{ name: "Test", resources: 4, influence: 0, tech: null, legendary: false, station: false }], wormholes: [], anomalies: ["supernova"] });
  board.set(farTileKey, { id: 998, planets: [{ name: "Far", resources: 2, influence: 2, tech: null, legendary: false, station: false }], wormholes: [], anomalies: [] });

  const slices = computeHomeSlices(board, homeKeys, 3);
  const entry = slices.get(home);
  return JSON.stringify({
    total: entry.total, // expect 2 (tile value 4, minus supernova path penalty 2)
    pathPenalty: entry.pathPenalty, // expect 2
    tileCount: entry.tiles.length, // expect 1 (the far tile is out of distance-2 range)
  });
})()
```

Expected: `{"total":2,"pathPenalty":2,"tileCount":1}`

- [ ] **Step 3: Commit**

```bash
git add js/scoring.js
git commit -m "Add home-slice aggregation with equidistant split and path penalty"
```

---

### Task 4: Display plumbing in `js/app.js` — constants and formatting

**Files:**
- Modify: `js/app.js:29` (near `TECH_SWATCH_COLORS`)

- [ ] **Step 1: Add tech-letter mapping and `formatScore`**

Find (near the top of the file, around line 29):

```js
  const TRAIT_COLORS = { cultural: "#3fa34d", industrial: "#4d7bd1", hazardous: "#d9542f" };
  const TECH_SWATCH_COLORS = { warfare: "#e0524f", propulsion: "#4d7bd1", biotic: "#3fa34d", cybernetic: "#e0b93f" };
```

Add right after it:

```js
  const TRAIT_COLORS = { cultural: "#3fa34d", industrial: "#4d7bd1", hazardous: "#d9542f" };
  const TECH_SWATCH_COLORS = { warfare: "#e0524f", propulsion: "#4d7bd1", biotic: "#3fa34d", cybernetic: "#e0b93f" };
  // Order controls how repeated tech-skip letters group on a home tile
  // (e.g. two Biotic + one Cybernetic renders "GGY", not interleaved).
  const TECH_ORDER = ["propulsion", "biotic", "cybernetic", "warfare"];
  const TECH_LETTERS = { propulsion: "B", biotic: "G", cybernetic: "Y", warfare: "R" };

  function techLettersFor(techTypes) {
    return TECH_ORDER.flatMap((type) => techTypes.filter((t) => t === type).map(() => TECH_LETTERS[type])).join("");
  }

  function formatScore(n) {
    const rounded = Math.round(n * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }
```

- [ ] **Step 2: Verify in-browser**

Start the local server and open the page. In the console:

```js
JSON.stringify([
  techLettersFor(["biotic", "cybernetic", "biotic"]),
  formatScore(18),
  formatScore(18.5),
  formatScore(4.333333),
])
```

Expected: `["GGY","18","18.5","4.3"]`

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Add tech-letter mapping and score formatting helpers"
```

---

### Task 5: Home-tile display (score, resources/influence, tech letters)

**Files:**
- Modify: `js/app.js` (`renderBoard`, `drawHomeSlot`)

- [ ] **Step 1: Compute slices once per render and pass to `drawHomeSlot`**

Find `renderBoard`'s body (the `cells.forEach` loop is preceded by the `defs`/`clipPath` setup):

```js
    const defs = svgEl("defs", {});
    const clipPath = svgEl("clipPath", { id: "hex-clip" });
    clipPath.appendChild(svgEl("polygon", { points: hexPolygonPoints(0, 0) }));
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    cells.forEach((c) => {
      const key = keyFor(c.q, c.r);
      const { x, y } = axialToPixel(c.q, c.r);
      const g = svgEl("g", { class: "hex-group" });

      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key);
      } else if (board.has(key)) {
```

Replace with:

```js
    const defs = svgEl("defs", {});
    const clipPath = svgEl("clipPath", { id: "hex-clip" });
    clipPath.appendChild(svgEl("polygon", { points: hexPolygonPoints(0, 0) }));
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    const homeSlices = computeHomeSlices(board, homeKeys, RINGS);

    cells.forEach((c) => {
      const key = keyFor(c.q, c.r);
      const { x, y } = axialToPixel(c.q, c.r);
      const g = svgEl("g", { class: "hex-group" });

      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key, homeSlices.get(key));
      } else if (board.has(key)) {
```

- [ ] **Step 2: Rewrite `drawHomeSlot`**

Find:

```js
  function drawHomeSlot(g, x, y, key) {
    const idx = [...homeKeys].indexOf(key);
    const poly = svgEl("polygon", { points: hexPolygonPoints(x, y), class: "hex home", "data-key": key });
    g.appendChild(poly);
    const label = svgEl("text", { x, y: y - 4, class: "hex-label" });
    label.textContent = "HOME";
    g.appendChild(label);
    const sub = svgEl("text", { x, y: y + 12, class: "hex-sublabel" });
    sub.textContent = playerNames[idx] || `Player ${idx + 1}`;
    g.appendChild(sub);
  }
```

Replace with:

```js
  function playerNameForHomeKey(key) {
    const idx = [...homeKeys].indexOf(key);
    return playerNames[idx] || `Player ${idx + 1}`;
  }

  function drawHomeSlot(g, x, y, key, breakdown) {
    const poly = svgEl("polygon", { points: hexPolygonPoints(x, y), class: "hex home", "data-key": key });
    poly.addEventListener("mousemove", (e) => showHomeTooltip(e, key, breakdown));
    poly.addEventListener("mouseleave", hideTooltip);
    g.appendChild(poly);

    const nameLabel = svgEl("text", { x, y: y - 26, class: "hex-label" });
    nameLabel.textContent = playerNameForHomeKey(key);
    g.appendChild(nameLabel);

    const scoreLabel = svgEl("text", { x, y: y - 8, class: "hex-sublabel" });
    scoreLabel.textContent = `Score: ${formatScore(breakdown.total)}`;
    g.appendChild(scoreLabel);

    const resInfLabel = svgEl("text", { x, y: y + 10, class: "hex-sublabel" });
    const resSpan = svgEl("tspan", { class: "planet-number-res" });
    resSpan.textContent = `${formatScore(breakdown.optimalResources)}R`;
    const infSpan = svgEl("tspan", { class: "planet-number-inf" });
    infSpan.textContent = `${formatScore(breakdown.optimalInfluence)}I`;
    resInfLabel.appendChild(resSpan);
    resInfLabel.appendChild(document.createTextNode(" / "));
    resInfLabel.appendChild(infSpan);
    g.appendChild(resInfLabel);

    const techLetters = techLettersFor(breakdown.techTypes);
    if (techLetters) {
      const techLabel = svgEl("text", { x, y: y + 28, class: "hex-sublabel" });
      techLabel.textContent = techLetters;
      g.appendChild(techLabel);
    }
  }
```

Note: this references `showHomeTooltip`, added in Task 6. The page will throw a `ReferenceError` if you try to hover a home tile before that task is done — that's expected mid-implementation; Step 3 below only checks the text content, not hovering.

- [ ] **Step 3: Verify in-browser**

Start the local server, place a few tiles near one home system (or just leave the board as autosaved from a previous session), reload, and in the console:

```js
(() => {
  const homeGroup = document.querySelector('.hex.home').closest('.hex-group');
  const texts = [...homeGroup.querySelectorAll('text')].map(t => t.textContent);
  return JSON.stringify(texts);
})()
```

Expected: an array of 3-4 strings — a player name, `"Score: <number>"`, a resources/influence line (may show `0R / 0I` on an empty board), and optionally a tech-letter line. No `"HOME"` string should appear anywhere in that list.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Show slice score, resources/influence, and tech skips on home tiles"
```

---

### Task 6: Tooltips — home-tile breakdown and tile value line

**Files:**
- Modify: `js/app.js` (`showTooltip`, new `showHomeTooltip`)

- [ ] **Step 1: Refactor `showTooltip` and add `showHomeTooltip`**

Find:

```js
  function showTooltip(e, tile) {
    const lines = [tile.type === "mecatol" ? "Mecatol Rex" : `Tile #${tile.id}`];
    tile.planets.forEach((p) => {
      lines.push(`${p.name} — ${p.resources}R / ${p.influence}I${p.trait ? " · " + p.trait : ""}${p.tech ? " · " + p.tech + " tech" : ""}${p.station ? " · space station" : ""}`);
    });
    tile.wormholes.forEach((w) => lines.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => lines.push(ANOMALY_LABELS[a] || a));
    tooltip.textContent = lines.join("\n");
    tooltip.style.whiteSpace = "pre-line";
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
    tooltip.classList.remove("hidden");
  }
  function hideTooltip() {
    tooltip.classList.add("hidden");
  }
```

Replace with:

```js
  function showTooltipLines(e, lines) {
    tooltip.textContent = lines.join("\n");
    tooltip.style.whiteSpace = "pre-line";
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
    tooltip.classList.remove("hidden");
  }

  function showTooltip(e, tile) {
    const lines = [tile.type === "mecatol" ? "Mecatol Rex" : `Tile #${tile.id}`];
    tile.planets.forEach((p) => {
      lines.push(`${p.name} — ${p.resources}R / ${p.influence}I${p.trait ? " · " + p.trait : ""}${p.tech ? " · " + p.tech + " tech" : ""}${p.station ? " · space station" : ""}`);
    });
    tile.wormholes.forEach((w) => lines.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => lines.push(ANOMALY_LABELS[a] || a));
    lines.push(`Value: ${formatScore(tileValue(tile))}`);
    showTooltipLines(e, lines);
  }

  function showHomeTooltip(e, key, breakdown) {
    const playerName = playerNameForHomeKey(key);
    const lines = [`${playerName} — Slice value ${formatScore(breakdown.total)}`];
    breakdown.tiles.forEach((entry) => {
      const desc = describeTileValue(entry.tile);
      const parts = desc.parts.map((p) => `${p.label} ${formatScore(p.amount)}`).join(", ");
      const splitNote = entry.splitWith.length
        ? ` (shared with ${entry.splitWith.map(playerNameForHomeKey).join(", ")})`
        : "";
      lines.push(`#${entry.tile.id}: ${formatScore(entry.contribution)}${splitNote} — ${parts}`);
    });
    if (breakdown.pathPenalty > 0) lines.push(`Path penalty: -${formatScore(breakdown.pathPenalty)}`);
    showTooltipLines(e, lines);
  }

  function hideTooltip() {
    tooltip.classList.add("hidden");
  }
```

- [ ] **Step 2: Verify in-browser**

Start the local server with a few tiles placed near a home system. Simulate hovering the home tile and a regular tile:

```js
(() => {
  const homePoly = document.querySelector('.hex.home');
  homePoly.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 100 }));
  const homeText = document.getElementById('tile-tooltip').textContent;

  const tilePoly = document.querySelector('#board-svg polygon.hex.blue, #board-svg polygon.hex.red');
  tilePoly.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 100 }));
  const tileText = document.getElementById('tile-tooltip').textContent;

  return JSON.stringify({ homeTextIncludesSliceValue: homeText.includes('Slice value'), tileTextIncludesValue: tileText.includes('Value:') });
})()
```

Expected: `{"homeTextIncludesSliceValue":true,"tileTextIncludesValue":true}`

Also spot-check by hand: pick one tile listed in the home tooltip's breakdown and confirm its `parts` sum (add up the numbers after each label) equals the contribution shown before the em dash.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Add itemized home-slice tooltip and a value line to tile tooltips"
```

---

### Task 7: Top-right "Slice Balance" overlay

**Files:**
- Modify: `index.html`, `css/style.css`, `js/app.js`

- [ ] **Step 1: Add the overlay element**

Open `index.html`. Find:

```html
      <div class="board-scroll">
        <div class="board-stats" id="board-stats"></div>
        <svg id="board-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
```

Replace with:

```html
      <div class="board-scroll">
        <div class="board-stats" id="board-stats"></div>
        <div class="board-stats board-stats-right" id="slice-balance"></div>
        <svg id="board-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
```

- [ ] **Step 2: Add the CSS for right-side positioning**

Open `css/style.css`. Find:

```css
.board-stats {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(6, 8, 16, 0.88);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.7rem;
  color: var(--text-dim);
  line-height: 1.5;
  pointer-events: none;
  max-width: 210px;
}
```

Add right after it:

```css
.board-stats-right {
  left: auto;
  right: 8px;
}
```

- [ ] **Step 3: Add `renderSliceBalance` and wire the element reference**

Find (near the other `document.getElementById` element references, around line 80):

```js
  const boardStatsEl = document.getElementById("board-stats");
```

Add right after it:

```js
  const boardStatsEl = document.getElementById("board-stats");
  const sliceBalanceEl = document.getElementById("slice-balance");
```

Then find `renderBoard`'s final line:

```js
    renderBoardStats();
  }
```

Replace with:

```js
    renderBoardStats();
    renderSliceBalance(homeSlices);
  }

  function renderSliceBalance(homeSlices) {
    const entries = [...homeSlices.entries()].map(([key, breakdown]) => ({
      name: playerNameForHomeKey(key),
      total: breakdown.total,
    }));
    if (!entries.length) {
      sliceBalanceEl.innerHTML = "";
      return;
    }
    const highest = entries.reduce((a, b) => (b.total > a.total ? b : a));
    const lowest = entries.reduce((a, b) => (b.total < a.total ? b : a));
    const gap = highest.total - lowest.total;
    sliceBalanceEl.innerHTML = `
      <div class="stats-heading">Slice Balance</div>
      <div>Gap: <span class="stats-num">${formatScore(gap)}</span></div>
      <div>Highest: ${highest.name} (${formatScore(highest.total)})</div>
      <div>Lowest: ${lowest.name} (${formatScore(lowest.total)})</div>
    `;
  }
```

- [ ] **Step 4: Verify in-browser**

Start the local server and reload. In the console:

```js
(() => {
  const el = document.getElementById('slice-balance');
  return JSON.stringify({ hasHeading: el.textContent.includes('Slice Balance'), hasGap: el.textContent.includes('Gap:') });
})()
```

Expected: `{"hasHeading":true,"hasGap":true}`

Then visually confirm (via the Browser tool) the new panel sits in the top-right corner of the map, mirroring the existing top-left stats panel, and doesn't overlap it at typical viewport widths (1280px+).

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "Add top-right slice-balance overlay showing the highest/lowest slice gap"
```

---

### Task 8: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Randomize a full board**

Start the local server, open the page, click "🎲 Randomize…" then "Randomize" with default options to fill the board.

- [ ] **Step 2: Hand-check one home's score**

Pick a home system with a visible mix of features (a tech skip, ideally a legendary planet, and/or a tile shared with a neighboring home). In the console, gather its reachable tiles and compare against the number shown on the tile:

```js
(() => {
  const homeKeys = homeSlotKeys(3);
  // pick the first home for this check; adjust index to inspect others
  const key = homeKeys[0];
  const boardState = JSON.parse(localStorage.getItem('ti4-map-generator-state-v1'));
  return JSON.stringify({ key, placementsNearHome: boardState.placements.length });
})()
```

Manually total up `describeTileValue(tile).total` (via the home tile's own tooltip, which lists this per-tile) for each tile the tooltip lists, confirm it matches the tile's contribution, and confirm all contributions sum to the "Score:" line shown on the tile.

- [ ] **Step 2: Confirm the balance panel matches the tiles**

Read the "Highest"/"Lowest" values from the top-right panel and confirm they match the "Score:" line on the corresponding home tiles on the board.

- [ ] **Step 3: Confirm the path penalty**

Use the Locking Tool or manual placement to put a supernova- or nebula-anomaly tile directly on one home's fixed 2-tile path to Mecatol (the two tiles in a straight line between that home and the center). Confirm that home's score drops by 2 (supernova) or 1 (nebula) and that its tooltip shows a "Path penalty" line.

- [ ] **Step 4: Confirm PNG export still renders correctly**

Click "🖼️ Export PNG" and confirm no console errors — the export reuses the existing `hex-label`/`hex-sublabel`/`planet-number-res`/`planet-number-inf` CSS classes (already present in `EXPORT_STYLE`), so no export-specific code changes were needed, but this should still be spot-checked.

- [ ] **Step 5: Check for console errors throughout**

Confirm no errors appeared in the browser console during any of the above.
