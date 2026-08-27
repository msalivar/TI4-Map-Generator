# Selectable Player-Count Map Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toolbar dropdown that switches the board between 15 real player-count layouts (3–8 players, plus community hyperlane-alternative variants), instead of the current hardcoded 6-player/3-ring board.

**Architecture:** A new static data file (`data/map-layouts.js`) describes each layout as `{ key, label, playerCount, rings, homeKeys, hyperlaneKeys }` — every layout turns out to still be a plain N-ring hex spiral (`generateHexRings`/`generateMapStringOrder` in `js/hexgrid.js` need zero changes), so a layout is fully described by which cells are homes vs. decorative hyperlane slots. `js/app.js`'s board-shape state (`RINGS`/`cells`/`homeKeys`/`mapStringCells`/`keyToCell`) stops being fixed constants and becomes rebuildable via a new `applyLayout()`, driven by a toolbar `<select>`. Hyperlane cells render as fixed, non-interactive decoration (no picking/rotation UI). `js/scoring.js`'s `homePathTiles()` is generalized from a "home sits on one of 6 directions" assumption to a general cube-coordinate hex-line algorithm, since several layouts place homes off that axis.

**Tech Stack:** Vanilla JS, SVG, no build step, no test framework (verification is manual in-browser per `CLAUDE.md`).

---

## Reference data (used verbatim in Task 1)

Real layout data extracted and verified from
[heisenbugged/ti4-lab](https://github.com/heisenbugged/ti4-lab)'s
`app/data/defaultLayouts.ts` during design (coordinate system confirmed
identical to this app's own `(q, r)` axial system — same 6 neighbor
directions, and the "6-Player" entry's home positions are the exact same
set this app's own `homeSlotKeys(3)` already produces):

| key | label | playerCount | rings | home count | hyperlane count |
|---|---|---|---|---|---|
| `3p-standard` | 3 Players — Standard | 3 | 3 | 3 | 0 |
| `3p-settlers` | 3 Players — Settlers | 3 | 3 | 3 | 18 |
| `3p-warp` | 3 Players — Warp | 3 | 3 | 3 | 18 |
| `4p-standard` | 4 Players — Standard | 4 | 3 | 4 | 0 |
| `4p-skinny` | 4 Players — Skinny | 4 | 3 | 4 | 10 |
| `4p-warp` | 4 Players — Warp | 4 | 3 | 4 | 12 |
| `5p-standard` | 5 Players — Standard | 5 | 3 | 5 | 0 |
| `5p-skinny` | 5 Players — Skinny | 5 | 3 | 5 | 6 |
| `5p-warp` | 5 Players — Warp | 5 | 3 | 5 | 6 |
| `6p-standard` | 6 Players — Standard | 6 | 3 | 6 | 0 |
| `6p-large` | 6 Players — Large Galaxy | 6 | 4 | 6 | 0 |
| `7p-standard` | 7 Players — Standard | 7 | 4 | 7 | 6 |
| `7p-alt` | 7 Players — Alt Hyperlanes | 7 | 4 | 7 | 18 |
| `8p-standard` | 8 Players — Standard | 8 | 4 | 8 | 0 |
| `8p-alt` | 8 Players — Alt Hyperlanes | 8 | 4 | 8 | 12 |

`6p-standard` is the **default layout** (`DEFAULT_LAYOUT_KEY` in Task 4),
matching today's only board — this must not change existing behavior
for anyone who never touches the new dropdown.

---

### Task 1: Layout data file

**Files:**
- Create: `data/map-layouts.js`
- Modify: `index.html:144-145`

- [ ] **Step 1: Create the data file**

```js
/**
 * TI4 Map Generator — player-count map layouts
 * -------------------------------------------------------------
 * Every layout here is a plain N-ring hex spiral (see
 * generateHexRings() in js/hexgrid.js) -- none of them change the
 * underlying grid shape, they only designate which cells within a
 * standard 3-ring or 4-ring spiral are home systems vs. decorative
 * hyperlane slots (see drawHyperlaneSlot() in js/app.js). Coordinates
 * are this app's own (q, r) axial system.
 *
 * Sourced from github.com/heisenbugged/ti4-lab's real layout data
 * (app/data/defaultLayouts.ts), an actively-maintained TI4 map tool.
 * hyperlaneKeys positions are real (they mark where an official layout
 * requires a hyperlane tile); this app renders them as fixed generic
 * decoration rather than picking a real hyperlane tile + rotation,
 * since this tool never simulates ship-movement adjacency through
 * hyperlanes -- see docs/superpowers/specs/2026-08-26-map-layouts-design.md.
 * -------------------------------------------------------------
 */

const MAP_LAYOUTS = [
  {
    key: "3p-standard",
    label: "3 Players — Standard",
    playerCount: 3,
    rings: 3,
    homeKeys: ["3,0", "-3,3", "0,-3"],
    hyperlaneKeys: [],
  },
  {
    key: "3p-settlers",
    label: "3 Players — Settlers",
    playerCount: 3,
    rings: 3,
    homeKeys: ["2,-2", "0,2", "-2,0"],
    hyperlaneKeys: [
      "3,-3", "3,-2", "2,-3", "3,-1", "1,-3", "3,0", "2,1", "1,2", "-3,3",
      "-2,3", "-3,2", "-1,3", "-3,1", "0,3", "-3,0", "-2,-1", "-1,-2", "0,-3",
    ],
  },
  {
    key: "3p-warp",
    label: "3 Players — Warp",
    playerCount: 3,
    rings: 3,
    homeKeys: ["3,-3", "0,3", "-3,0"],
    hyperlaneKeys: [
      "1,0", "-1,1", "0,-1", "2,-1", "1,-2", "1,1", "-1,2", "-2,1", "-1,-1",
      "3,-1", "1,-3", "3,0", "2,1", "-3,3", "-2,3", "-3,2", "-1,-2", "0,-3",
    ],
  },
  {
    key: "4p-standard",
    label: "4 Players — Standard",
    playerCount: 4,
    rings: 3,
    homeKeys: ["3,-1", "1,-3", "-1,3", "-3,1"],
    hyperlaneKeys: [],
  },
  {
    key: "4p-skinny",
    label: "4 Players — Skinny",
    playerCount: 4,
    rings: 3,
    homeKeys: ["2,-3", "2,1", "-2,3", "-2,-1"],
    hyperlaneKeys: [
      "3,-3", "3,-2", "3,-1", "3,0", "-3,3", "-3,2", "-3,1", "0,3", "-3,0", "0,-3",
    ],
  },
  {
    key: "4p-warp",
    label: "4 Players — Warp",
    playerCount: 4,
    rings: 3,
    homeKeys: ["3,-3", "3,0", "-3,3", "-3,0"],
    hyperlaneKeys: [
      "0,1", "0,-1", "1,-2", "1,1", "-1,2", "-1,-1", "1,-3", "1,2", "-1,3", "0,3", "-1,-2", "0,-3",
    ],
  },
  {
    key: "5p-standard",
    label: "5 Players — Standard",
    playerCount: 5,
    rings: 3,
    homeKeys: ["3,-3", "3,0", "-1,3", "-3,1", "0,-3"],
    hyperlaneKeys: [],
  },
  {
    key: "5p-skinny",
    label: "5 Players — Skinny",
    playerCount: 5,
    rings: 3,
    homeKeys: ["3,-2", "2,1", "-2,3", "-3,1", "0,-3"],
    hyperlaneKeys: ["3,-3", "2,-3", "3,0", "-3,3", "-3,0", "-2,-1"],
  },
  {
    key: "5p-warp",
    label: "5 Players — Warp",
    playerCount: 5,
    rings: 3,
    homeKeys: ["3,-3", "3,0", "-3,3", "0,3", "-3,0"],
    hyperlaneKeys: ["0,-1", "1,-2", "-1,-1", "1,-3", "-1,-2", "0,-3"],
  },
  {
    key: "6p-standard",
    label: "6 Players — Standard",
    playerCount: 6,
    rings: 3,
    homeKeys: ["3,-3", "3,0", "-3,3", "0,3", "-3,0", "0,-3"],
    hyperlaneKeys: [],
  },
  {
    key: "6p-large",
    label: "6 Players — Large Galaxy",
    playerCount: 6,
    rings: 4,
    homeKeys: ["4,-4", "4,0", "-4,4", "0,4", "-4,0", "0,-4"],
    hyperlaneKeys: [],
  },
  {
    key: "7p-standard",
    label: "7 Players — Standard",
    playerCount: 7,
    rings: 4,
    homeKeys: ["3,-4", "4,-2", "3,1", "-3,4", "-4,2", "0,4", "-3,-1"],
    hyperlaneKeys: ["0,-2", "1,-3", "-1,-2", "1,-4", "-1,-3", "0,-4"],
  },
  {
    key: "7p-alt",
    label: "7 Players — Alt Hyperlanes",
    playerCount: 7,
    rings: 4,
    homeKeys: ["3,-3", "3,0", "-3,4", "-4,2", "0,4", "-3,-1", "0,-4"],
    hyperlaneKeys: [
      "0,1", "-1,0", "0,-1", "1,-3", "1,2", "-3,2", "4,-4", "4,-3", "3,-4",
      "4,-2", "2,-4", "4,-1", "4,0", "3,1", "2,2", "-4,4", "-4,1", "-4,0",
    ],
  },
  {
    key: "8p-standard",
    label: "8 Players — Standard",
    playerCount: 8,
    rings: 4,
    homeKeys: ["3,-4", "4,-2", "3,1", "-3,4", "-4,2", "0,4", "-3,-1", "0,-4"],
    hyperlaneKeys: [],
  },
  {
    key: "8p-alt",
    label: "8 Players — Alt Hyperlanes",
    playerCount: 8,
    rings: 4,
    homeKeys: ["3,-4", "4,-2", "3,1", "-3,4", "-4,2", "0,4", "-3,-1", "0,-4"],
    hyperlaneKeys: [
      "1,0", "0,1", "-1,0", "0,-1", "3,-2", "-3,2", "4,-4", "4,-1", "4,0", "-4,4", "-4,1", "-4,0",
    ],
  },
];
```

- [ ] **Step 2: Wire the script tag into `index.html`**

Change:
```html
  <script src="js/hexgrid.js"></script>
  <script src="js/scoring.js"></script>
```
to:
```html
  <script src="js/hexgrid.js"></script>
  <script src="data/map-layouts.js"></script>
  <script src="js/scoring.js"></script>
```

- [ ] **Step 3: Verify the data loads with no errors**

Start the local server (`.claude/launch.json`'s `static-site` config, or
`preview_start` with `{"name": "static-site"}` if using the Claude Code
Browser tool) and open the page. Check the console for errors, then run
in the browser console:

```js
JSON.stringify({
  count: MAP_LAYOUTS.length,
  keys: MAP_LAYOUTS.map((l) => l.key),
  totalHomes: MAP_LAYOUTS.reduce((sum, l) => sum + l.homeKeys.length, 0),
  totalHyper: MAP_LAYOUTS.reduce((sum, l) => sum + l.hyperlaneKeys.length, 0),
});
```

Expected: `count: 15`, all 15 keys listed (matching the table above),
`totalHomes: 78` (3+3+3+4+4+4+5+5+5+6+6+7+7+8+8), `totalHyper: 106`
(0+18+18+0+10+12+0+6+6+0+0+6+18+0+12).

- [ ] **Step 4: Commit**

```bash
git add data/map-layouts.js index.html
git commit -m "Add player-count map layout data (3-8 players + hyperlane variants)"
```

---

### Task 2: Generalize home-to-Mecatol path for off-corner homes

**Files:**
- Modify: `js/scoring.js:94-103`

**Context:** `homePathTiles()` currently assumes every home sits exactly
on one of the 6 primary axial directions (`home.q / rings` must be a
clean unit direction vector). Several new layouts place homes off that
axis (e.g. 7-Player Standard's home at `(3,-4)` — not any of the 6
corner directions scaled by `rings=4`), so this needs to become a
general "hex line between two points" algorithm instead.

- [ ] **Step 1: Replace `homePathTiles()` with a general cube-line version**

Find in `js/scoring.js`:
```js
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
```

Replace with:
```js
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
```

- [ ] **Step 2: Verify it reproduces today's behavior exactly for the standard 6-player board**

In the browser console (with the app still on its default 6-Player
layout):
```js
JSON.stringify({
  cornerPath: homePathTiles("3,-3", 3),      // a standard corner home
  otherCorner: homePathTiles("-3,0", 3),
});
```
Expected: `cornerPath: ["2,-2","1,-1"]`, `otherCorner: ["-2,0","-1,0"]` —
each is a 2-element path lying exactly on the line from the home toward
`(0,0)`.

- [ ] **Step 3: Verify it produces a sensible path for an off-axis home**

```js
JSON.stringify({ offAxis: homePathTiles("-1,3", 3) });
```
Expected: `offAxis: ["-1,2","0,1"]` — two hexes, each one step closer to
the center than the last, none of them equal to the home or to `(0,0)`.

- [ ] **Step 4: Commit**

```bash
git add js/scoring.js
git commit -m "Generalize home-to-Mecatol path to support off-axis homes"
```

---

### Task 3: Hyperlane slot styling

**Files:**
- Modify: `css/style.css` (root variables near line 19, hex fill rules near line 201)
- Modify: `js/app.js` (`EXPORT_STYLE`, the duplicate inline stylesheet used for standalone PNG export, near line 1500)

**Context:** Hyperlane slots need a distinct tile fill plus a decorative
line style. Every other hex fill color is a CSS variable in
`css/style.css`'s `:root`, then duplicated as a literal hex value in
`js/app.js`'s `EXPORT_STYLE` (since the PNG export clones the SVG
standalone, with no access to the page's stylesheet) — this task follows
that same existing pattern.

- [ ] **Step 1: Add the new CSS variables**

In `css/style.css`, find:
```css
  --hex-border: #5c6780;
  --hex-locked: #ff2d2d;
```
Replace with:
```css
  --hex-border: #5c6780;
  --hex-locked: #ff2d2d;
  --hyperlane-tile: #241f38;
  --hyperlane-line: #8fa8ff;
```

- [ ] **Step 2: Add the hex-fill and line rules**

Find in `css/style.css`:
```css
.hex.home { fill: var(--home-tile); }
.hex.mecatol { fill: #4a3a1a; }
```
Replace with:
```css
.hex.home { fill: var(--home-tile); }
.hex.mecatol { fill: #4a3a1a; }
.hex.hyperlane { fill: var(--hyperlane-tile); cursor: default; }
.hyperlane-line { fill: none; stroke: var(--hyperlane-line); stroke-width: 2.5; }
```

- [ ] **Step 3: Mirror the same rules into `EXPORT_STYLE` in `js/app.js`**

Find:
```js
    .hex.home { fill: #2e3a2a; }
    .hex.mecatol { fill: #4a3a1a; }
```
Replace with:
```js
    .hex.home { fill: #2e3a2a; }
    .hex.mecatol { fill: #4a3a1a; }
    .hex.hyperlane { fill: #241f38; }
    .hyperlane-line { fill: none; stroke: #8fa8ff; stroke-width: 2.5; }
```

- [ ] **Step 4: Verify with no errors**

Reload the page, check the console for CSS/JS errors (there's nothing
to visually check yet — no cell currently uses class `hyperlane` until
Task 5 renders one).

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/app.js
git commit -m "Add hyperlane slot styling (fill + decorative line color)"
```

---

### Task 4: Layout state, persistence, and the layout dropdown

**Files:**
- Modify: `index.html:13-14` (toolbar), `index.html` (no other changes needed — options are populated from JS)
- Modify: `js/app.js:4-21` (top-of-file state), plus several call sites (exact locations below)

**Context:** This is the core of the feature — `RINGS`/`cells`/
`homeKeys`/`mapStringCells`/`keyToCell` stop being fixed constants and
become state derived from a selected `MAP_LAYOUTS` entry via a new
`applyLayout()` function, driven by a toolbar `<select>`.

- [ ] **Step 1: Add the `<select>` element to the toolbar**

In `index.html`, find:
```html
        <h1 class="toolbar-title" title="Build a Twilight Imperium 4 galaxy map — unofficial fan tool">TI4 Map Generator</h1>
        <button id="btn-randomize">🎲 Randomize…</button>
```
Replace with:
```html
        <h1 class="toolbar-title" title="Build a Twilight Imperium 4 galaxy map — unofficial fan tool">TI4 Map Generator</h1>
        <select id="layout-select" class="layout-select" title="Choose a map layout for a different player count"></select>
        <button id="btn-randomize">🎲 Randomize…</button>
```

- [ ] **Step 2: Add matching CSS for `.layout-select`**

In `css/style.css`, find:
```css
.file-btn { display: inline-flex; align-items: center; }
```
Replace with:
```css
.file-btn { display: inline-flex; align-items: center; }
.layout-select {
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.8rem;
}
```

- [ ] **Step 3: Replace the top-of-file board-shape constants with rebuildable state**

In `js/app.js`, find:
```js
(function () {
  const RINGS = 3; // standard 6-player-sized board (37 hexes)
  const STORAGE_KEY = "ti4-map-generator-state-v1";

  const cells = generateHexRings(RINGS);
  const mapStringCells = generateMapStringOrder(RINGS);
  const homeKeys = new Set(homeSlotKeys(RINGS));
  const keyToCell = new Map(cells.map((c) => [keyFor(c.q, c.r), c]));
  const DRAG_THRESHOLD = 6;

  /** @type {Map<string, object>} key "q,r" -> placed tile object (or undefined) */
  let board = new Map();
  /** pool of tiles not yet placed, keyed by pool-id */
  let pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
  let selectedPoolKey = null;
  /** keys of board tiles the user has locked against click-remove/drag/shuffle */
  let lockedKeys = new Set();
  let playerNames = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
```

Replace with:
```js
(function () {
  const STORAGE_KEY = "ti4-map-generator-state-v1";
  const DEFAULT_LAYOUT_KEY = "6p-standard";

  // Board shape -- rings/cells/homes/decorative-hyperlane-slots -- is
  // derived from the selected MAP_LAYOUTS entry via applyLayout()
  // (defined below). These start undefined; init() calls applyLayout()
  // exactly once before the first render, either with the saved
  // layout (via loadFromObject) or the default.
  let currentLayout;
  let RINGS;
  let cells;
  let mapStringCells;
  let homeKeys;
  let hyperlaneKeys;
  let keyToCell;
  const DRAG_THRESHOLD = 6;

  /** @type {Map<string, object>} key "q,r" -> placed tile object (or undefined) */
  let board = new Map();
  /** pool of tiles not yet placed, keyed by pool-id */
  let pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
  let selectedPoolKey = null;
  /** keys of board tiles the user has locked against click-remove/drag/shuffle */
  let lockedKeys = new Set();
  let playerNames = [];

  // Rebuilds every piece of board-shape state for `layout` (a MAP_LAYOUTS
  // entry) -- called once at startup (via init(), see below) and again
  // any time the user picks a different layout from the dropdown or a
  // saved board is loaded. playerNames always resets to plain
  // "Player N" defaults sized to the new layout's home count -- there's
  // no UI for custom player names today, so there's nothing to preserve.
  function applyLayout(layout) {
    currentLayout = layout;
    RINGS = layout.rings;
    cells = generateHexRings(RINGS);
    mapStringCells = generateMapStringOrder(RINGS);
    homeKeys = new Set(layout.homeKeys);
    hyperlaneKeys = new Set(layout.hyperlaneKeys);
    keyToCell = new Map(cells.map((c) => [keyFor(c.q, c.r), c]));
    playerNames = Array.from({ length: layout.homeKeys.length }, (_, i) => `Player ${i + 1}`);
    if (layoutSelect) layoutSelect.value = layout.key;
  }
```

- [ ] **Step 4: Declare the `layoutSelect` element reference**

Find (near the other option-element references):
```js
  const optAvoidAdjacentAnomalies = document.getElementById("opt-avoid-adjacent-anomalies");
```
Replace with:
```js
  const optAvoidAdjacentAnomalies = document.getElementById("opt-avoid-adjacent-anomalies");
  const layoutSelect = document.getElementById("layout-select");
```

- [ ] **Step 5: Populate the dropdown's options, grouped by player count**

Add this new function right after `applyLayout()`:
```js
  function renderLayoutSelectOptions() {
    const playerCounts = [...new Set(MAP_LAYOUTS.map((l) => l.playerCount))].sort((a, b) => a - b);
    layoutSelect.innerHTML = playerCounts.map((count) => {
      const layoutsForCount = MAP_LAYOUTS.filter((l) => l.playerCount === count);
      const options = layoutsForCount.map((l) => `<option value="${l.key}">${l.label}</option>`).join("");
      return `<optgroup label="${count} Players">${options}</optgroup>`;
    }).join("");
  }
```

- [ ] **Step 6: Wire the dropdown's change handler**

Find in `init()`:
```js
    document.getElementById("btn-shuffle-unlocked").addEventListener("click", shuffleUnlocked);
```
Replace with:
```js
    layoutSelect.addEventListener("change", () => {
      const layout = MAP_LAYOUTS.find((l) => l.key === layoutSelect.value);
      if (board.size > 0 && !window.confirm("Switching layouts will clear the current board. Continue?")) {
        layoutSelect.value = currentLayout.key;
        return;
      }
      applyLayout(layout);
      board = new Map();
      pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
      selectedPoolKey = null;
      lockedKeys = new Set();
      persist();
      renderAll();
    });
    document.getElementById("btn-shuffle-unlocked").addEventListener("click", shuffleUnlocked);
```

- [ ] **Step 7: Call `renderLayoutSelectOptions()` and establish the initial layout in `init()`**

Find:
```js
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    renderTileSetToggles();
    if (saved) {
      loadFromObject(saved);
    } else {
      renderAll();
    }
  }
```
Replace with:
```js
    renderLayoutSelectOptions();

    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    renderTileSetToggles();
    if (saved) {
      loadFromObject(saved);
    } else {
      applyLayout(MAP_LAYOUTS.find((l) => l.key === DEFAULT_LAYOUT_KEY));
      renderAll();
    }
  }
```

- [ ] **Step 8: Update persistence to store/restore the selected layout**

Find:
```js
  function serialize() {
    return {
      version: 1,
      rings: RINGS,
      playerNames,
      enabledSets: [...enabledSets],
      lockedKeys: [...lockedKeys],
      placements: [...board.entries()].map(([key, tile]) => ({ key, tileId: tile.id, back: tile.back, name: tile.name })),
    };
  }
```
Replace with:
```js
  function serialize() {
    return {
      version: 1,
      layoutKey: currentLayout.key,
      playerNames,
      enabledSets: [...enabledSets],
      lockedKeys: [...lockedKeys],
      placements: [...board.entries()].map(([key, tile]) => ({ key, tileId: tile.id, back: tile.back, name: tile.name })),
    };
  }
```

Find:
```js
  function loadFromObject(data) {
    if (!data || !Array.isArray(data.placements)) return;
    pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
    board = new Map();
    if (Array.isArray(data.playerNames)) playerNames = data.playerNames;
    if (Array.isArray(data.enabledSets)) enabledSets = new Set(data.enabledSets);
```
Replace with:
```js
  function loadFromObject(data) {
    if (!data || !Array.isArray(data.placements)) return;
    const layout = MAP_LAYOUTS.find((l) => l.key === data.layoutKey) || MAP_LAYOUTS.find((l) => l.key === DEFAULT_LAYOUT_KEY);
    applyLayout(layout);
    pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
    board = new Map();
    if (Array.isArray(data.playerNames) && data.playerNames.length === homeKeys.size) playerNames = data.playerNames;
    if (Array.isArray(data.enabledSets)) enabledSets = new Set(data.enabledSets);
```

- [ ] **Step 9: Verify the default layout is unaffected and the dropdown populates**

Reload the page (clearing localStorage first so it starts fresh — run
`localStorage.clear()` then reload). Check the console for errors, then
run:
```js
JSON.stringify({
  layoutKey: currentLayout.key,
  ringsValue: RINGS,
  homeCount: homeKeys.size,
  cellCount: cells.length,
  dropdownOptionCount: document.getElementById("layout-select").options.length,
  dropdownGroupCount: document.getElementById("layout-select").querySelectorAll("optgroup").length,
});
```
Expected: `layoutKey: "6p-standard"`, `ringsValue: 3`, `homeCount: 6`,
`cellCount: 37`, `dropdownOptionCount: 15`, `dropdownGroupCount: 6` (one
optgroup per distinct player count 3–8).

- [ ] **Step 10: Verify switching layouts rebuilds state and persists across reload**

```js
(function () {
  const sel = document.getElementById("layout-select");
  sel.value = "8p-standard";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return JSON.stringify({
    layoutKey: currentLayout.key,
    ringsValue: RINGS,
    homeCount: homeKeys.size,
    playerNamesLength: playerNames.length,
  });
})();
```
Expected: `layoutKey: "8p-standard"`, `ringsValue: 4`, `homeCount: 8`,
`playerNamesLength: 8`. Then reload the page (without clearing
localStorage this time) and re-run the same `currentLayout.key`/`RINGS`
check — expected: still `"8p-standard"`/`4` (persisted and restored).

- [ ] **Step 11: Verify the confirm-before-reset behavior**

With the 8-player layout still active and empty, place any one tile on
the board (click a palette tile, then click any empty hex), then run:
```js
(function () {
  const originalConfirm = window.confirm;
  let confirmCalled = false;
  window.confirm = () => { confirmCalled = true; return false; }; // simulate clicking "Cancel"
  const sel = document.getElementById("layout-select");
  sel.value = "3p-standard";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  const result = { confirmCalled, layoutKeyAfterCancel: currentLayout.key, dropdownValueAfterCancel: sel.value };
  window.confirm = originalConfirm;
  return JSON.stringify(result);
})();
```
Expected: `confirmCalled: true`, `layoutKeyAfterCancel: "8p-standard"`
(unchanged — canceling the confirm must leave the layout and the board
alone), `dropdownValueAfterCancel: "8p-standard"` (the dropdown must
revert to match, not stay showing the layout the user backed out of).

- [ ] **Step 12: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "Add layout dropdown: switchable board shape, state, and persistence"
```

---

### Task 5: Render hyperlane slots and exclude them from placement/randomization

**Files:**
- Modify: `js/app.js` (several exact locations below)

**Context:** `hyperlaneKeys` now exists (from Task 4) but nothing reads
it yet — cells in a layout's `hyperlaneKeys` currently fall through to
`drawEmpty()` (would look like a normal placeable hex) and are still
counted as fillable by the randomizer and drag-and-drop. This task adds
the actual rendering and closes those gaps.

- [ ] **Step 1: Add `drawHyperlaneSlot()`**

Find in `js/app.js`:
```js
  function drawEmpty(g, x, y, key) {
```
Insert immediately before it:
```js
  // Fixed, non-interactive decoration for a layout's designated
  // hyperlane slots -- no click/drag listeners at all (unlike
  // drawEmpty/drawTile), so it can never be placed into, dragged from,
  // or locked. The two curves are a generic hyperlane look (a pair of
  // opposite-edge-midpoint connectors, styled like real hyperlane tile
  // art) rather than any specific official connection pattern -- this
  // tool never simulates ship-movement adjacency through hyperlanes, so
  // every hyperlane slot on every layout uses this same fixed graphic.
  function drawHyperlaneSlot(g, x, y, key) {
    const poly = svgEl("polygon", {
      points: hexPolygonPoints(x, y),
      class: "hex hyperlane",
      "data-key": key,
    });
    g.appendChild(poly);

    const lineGroup = svgEl("g", { "pointer-events": "none" });
    const corners = [0, 1, 2, 3, 4, 5].map((i) => hexCorner(x, y, i));
    const midpoint = (a, b) => ({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 });
    const edgeMidpoints = corners.map((c, i) => midpoint(c, corners[(i + 1) % 6]));
    [[0, 3], [1, 4]].forEach(([a, b]) => {
      const p1 = edgeMidpoints[a];
      const p2 = edgeMidpoints[b];
      lineGroup.appendChild(svgEl("path", {
        d: `M ${p1.x} ${p1.y} Q ${x} ${y} ${p2.x} ${p2.y}`,
        class: "hyperlane-line",
      }));
    });
    g.appendChild(lineGroup);
  }

  function drawEmpty(g, x, y, key) {
```

- [ ] **Step 2: Dispatch to it in `renderBoard()`**

Find:
```js
      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key, homeSlices.get(key));
      } else if (board.has(key)) {
```
Replace with:
```js
      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key, homeSlices.get(key));
      } else if (hyperlaneKeys.has(key)) {
        drawHyperlaneSlot(g, x, y, key);
      } else if (board.has(key)) {
```

- [ ] **Step 3: Exclude hyperlane slots from drag-and-drop targeting**

Find:
```js
  function isValidDropTarget(targetKey, sourceKey) {
    if (!targetKey || targetKey === sourceKey) return false;
    if (homeKeys.has(targetKey)) return false;
    if (lockedKeys.has(targetKey)) return false;
```
Replace with:
```js
  function isValidDropTarget(targetKey, sourceKey) {
    if (!targetKey || targetKey === sourceKey) return false;
    if (homeKeys.has(targetKey)) return false;
    if (hyperlaneKeys.has(targetKey)) return false;
    if (lockedKeys.has(targetKey)) return false;
```

- [ ] **Step 4: Exclude hyperlane slots from the randomizer's empty-hex count**

Find:
```js
  function emptySlotKeys() {
    return cells
      .filter((c) => c.ring > 0 && !homeKeys.has(keyFor(c.q, c.r)) && !board.has(keyFor(c.q, c.r)))
      .map((c) => keyFor(c.q, c.r));
  }
```
Replace with:
```js
  function emptySlotKeys() {
    return cells
      .filter((c) => {
        const key = keyFor(c.q, c.r);
        return c.ring > 0 && !homeKeys.has(key) && !hyperlaneKeys.has(key) && !board.has(key);
      })
      .map((c) => keyFor(c.q, c.r));
  }
```

- [ ] **Step 5: Verify hyperlane slots render, aren't placeable, and aren't counted as empty**

Switch to a layout with hyperlane slots (`7p-alt` has 18, the most of
any layout) via the dropdown, then run:
```js
(function () {
  const sel = document.getElementById("layout-select");
  sel.value = "7p-alt";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  const hyperPolys = document.querySelectorAll("#board-svg .hex.hyperlane");
  const emptyCount = document.querySelectorAll("#board-svg .hex.empty").length;
  return JSON.stringify({
    hyperlaneKeysSize: hyperlaneKeys.size,
    renderedHyperlaneTiles: hyperPolys.length,
    linesOnFirstHyperlaneTile: hyperPolys[0].parentElement.querySelectorAll(".hyperlane-line").length,
    emptyPlaceableCount: emptyCount,
  });
})();
```
Expected: `hyperlaneKeysSize: 18`, `renderedHyperlaneTiles: 18` (every
hyperlane slot rendered), `linesOnFirstHyperlaneTile: 2` (the two
decorative curves), `emptyPlaceableCount` equal to `61 - 1(Mecatol) -
7(homes) - 18(hyperlane) = 35`.

Then confirm none of the 18 hyperlane cells are click-placeable: select
any palette tile (click it), then attempt to click a hyperlane cell and
confirm nothing gets placed:
```js
(function () {
  const before = board.size;
  const hyperPoly = document.querySelector("#board-svg .hex.hyperlane");
  hyperPoly.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return JSON.stringify({ boardSizeBefore: before, boardSizeAfter: board.size });
})();
```
Expected: `boardSizeBefore` equals `boardSizeAfter` (the click had no
effect — hyperlane slots have no click listener at all).

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "Render hyperlane slots as fixed decoration, exclude from placement/randomization"
```

---

### Task 6: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Switch through every one of the 15 layouts and confirm shape**

Run this in the console once per layout (or loop it — it's read-only
and doesn't mutate anything besides the layout itself, which is exactly
what's being tested):
```js
(function () {
  const sel = document.getElementById("layout-select");
  const results = MAP_LAYOUTS.map((layout) => {
    sel.value = layout.key;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const homePolys = document.querySelectorAll("#board-svg .hex.home").length;
    const hyperPolys = document.querySelectorAll("#board-svg .hex.hyperlane").length;
    const mecatolPolys = document.querySelectorAll("#board-svg .hex.mecatol").length;
    return {
      key: layout.key,
      expectedHomes: layout.homeKeys.length,
      renderedHomes: homePolys,
      expectedHyper: layout.hyperlaneKeys.length,
      renderedHyper: hyperPolys,
      mecatolCount: mecatolPolys,
      cellCount: cells.length,
      expectedCellCount: layout.rings === 3 ? 37 : 61,
    };
  });
  const mismatches = results.filter((r) =>
    r.expectedHomes !== r.renderedHomes ||
    r.expectedHyper !== r.renderedHyper ||
    r.mecatolCount !== 1 ||
    r.cellCount !== r.expectedCellCount,
  );
  return JSON.stringify({ totalChecked: results.length, mismatchCount: mismatches.length, mismatches });
})();
```
Expected: `totalChecked: 15`, `mismatchCount: 0`, `mismatches: []`.

- [ ] **Step 2: Confirm the default layout still matches pre-change behavior exactly**

```js
(function () {
  localStorage.clear();
  location.reload();
})();
```
After reload, run:
```js
JSON.stringify({
  layoutKey: currentLayout.key,
  homeKeys: [...homeKeys].sort(),
  ringsValue: RINGS,
});
```
Expected: `layoutKey: "6p-standard"`, `ringsValue: 3`, `homeKeys` (sorted)
equal to `["-3,0","-3,3","0,-3","0,3","3,-3","3,0"]` — the exact same 6
positions the app used before this feature existed.

- [ ] **Step 3: Verify map-string export/import at a non-default layout**

Switch to `5p-skinny` (a layout with both non-corner homes and
hyperlane slots — the trickiest case), randomize the board, export,
clear, and re-import:
```js
(function () {
  const sel = document.getElementById("layout-select");
  sel.value = "5p-skinny";
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  document.getElementById("btn-randomize").click();
  document.getElementById("btn-randomize-apply").click();

  const before = {};
  document.querySelectorAll("#board-svg .hex[data-key]").forEach((poly) => {
    const g = poly.closest("g") || poly.parentElement;
    const idLabel = g.querySelector(".hex-id-label");
    before[poly.dataset.key] = poly.classList.contains("home") ? "0"
      : poly.classList.contains("mecatol") ? "mecatol"
      : poly.classList.contains("hyperlane") ? "hyperlane"
      : (idLabel ? idLabel.textContent.replace("#", "") : "-1");
  });

  window.__captured = null;
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: (s) => { window.__captured = s; return Promise.resolve(); } },
    configurable: true,
  });
  document.getElementById("btn-export-mapstring").click();
  const mapString = window.__captured;

  window.confirm = () => true;
  document.getElementById("btn-clear").click();
  window.prompt = () => mapString;
  document.getElementById("btn-import-mapstring").click();

  const after = {};
  document.querySelectorAll("#board-svg .hex[data-key]").forEach((poly) => {
    const g = poly.closest("g") || poly.parentElement;
    const idLabel = g.querySelector(".hex-id-label");
    after[poly.dataset.key] = poly.classList.contains("home") ? "0"
      : poly.classList.contains("mecatol") ? "mecatol"
      : poly.classList.contains("hyperlane") ? "hyperlane"
      : (idLabel ? idLabel.textContent.replace("#", "") : "-1");
  });

  const mismatches = Object.keys(before).filter((k) => before[k] !== after[k]);
  return JSON.stringify({ tokenCount: mapString.split(" ").length, mismatchCount: mismatches.length });
})();
```
Expected: `tokenCount: 36` (37 cells minus Mecatol, for a rings=3
layout), `mismatchCount: 0` (export → clear → import reproduces the
exact same board, including the hyperlane slots being untouched
throughout).

- [ ] **Step 4: Confirm no console errors across the whole pass**

Check the browser console for errors accumulated across all of the
above steps. Expected: none.

- [ ] **Step 5: Reset the browser's local state for a clean handoff**

```js
localStorage.clear();
```
Reload the page once more and confirm it loads the default `6p-standard`
layout with an empty board (no leftover state from this verification
pass).

---

## Self-review notes

- **Spec coverage:** every section of
  `docs/superpowers/specs/2026-08-26-map-layouts-design.md` maps to a
  task — data file (Task 1), `homePathTiles()` generalization (Task 2),
  hyperlane visuals (Task 3), dropdown/state/persistence (Task 4),
  rendering + interaction exclusions (Task 5), full verification (Task
  6). No spec requirement was left without a task.
- **No hexgrid.js changes needed:** confirmed during design research —
  every layout is a plain N-ring spiral, so `generateHexRings()`,
  `generateMapStringOrder()`, `axialToPixel()`, etc. all already work
  unchanged for every layout in the table above.
- **Map-string format unaffected:** `serializeMapString()`/
  `parseMapString()` need zero code changes — a hyperlane cell is never
  in `homeKeys` and never gets a `board` entry, so it already falls
  through to the existing "-1" (empty, non-home) case with no new
  branch required. Verified explicitly in Task 6, Step 3.

