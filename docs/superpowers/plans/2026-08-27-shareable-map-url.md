# Shareable Map URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user copy a single URL that encodes the current board (map string + enabled expansion sets + map layout) in the URL hash, so opening that URL on GitHub Pages reproduces the map exactly, without a backend.

**Architecture:** The board's existing `serializeMapString()` output is the payload. It goes in the URL hash fragment (`#l=<layout>&m=<comma-tokens>&s=<set-codes>`) alongside the layout key and enabled-set codes. On page load, `loadFromHash()` (run first in `init()`) applies the layout, sets `enabledSets`, and places the tiles — then flags the tab `shareMode` so `persist()` never writes `localStorage` (protecting other tabs' autosave). A `🔗 Copy share link` toolbar button builds and copies the URL. `parseMapString()` is refactored so its resolve-and-place core (`applyMapTokens()`) is shared between the Import button and the hash loader.

**Tech Stack:** Plain JS, no build step, no test framework. Verification is manual in-browser via the project's `static-site` server (`.claude/launch.json`, port 8420 / Claude Code Browser tool's `preview_start` with `{"name": "static-site"}`), per `CLAUDE.md`'s "Testing changes" convention. Reload the tab after every JS/HTML edit; the console must stay clean.

**Spec:** `docs/superpowers/specs/2026-08-26-shareable-map-url-design.md`

---

## File structure

| File | Change | Responsibility |
| --- | --- | --- |
| `js/app.js` | modify | All logic: `SET_CODES` + encode/decode helpers, `applyMapTokens()` refactor, `shareMode` flag + `persist()` guard, `buildShareURL()`, `loadFromHash()`, `init()` wiring, button handler |
| `index.html` | modify | One new `<button id="btn-copy-share-link">` in the toolbar |
| `README.md` | modify | Move "Shareable map links" from "Not yet built" to the supported list |

No new files. No script-load-order change.

---

### Task 1: Expansion-set URL codes and encode/decode helpers

**Files:**
- Modify: `js/app.js` (after the `TILE_SETS` / `enabledSets` block, currently lines 57-62)

- [ ] **Step 1: Add `SET_CODES` and the two helpers**

Open `js/app.js`. Find this block:

```js
  const TILE_SETS = [
    { key: "pok", label: "Prophecy of Kings" },
    { key: "thunders-edge", label: "Thunder's Edge" },
    { key: "discordant-stars", label: "Discordant Stars" },
  ];
  let enabledSets = new Set(TILE_SETS.map((s) => s.key));
```

Immediately after it (before the `const TRAIT_COLORS = ...` line), add:

```js

  // Short codes for the optional expansion sets in a shared-map URL's
  // "s=" param. "base" is implicit and never encoded. Single source of
  // truth for both directions -- see buildShareURL()/loadFromHash().
  const SET_CODES = { p: "pok", t: "thunders-edge", d: "discordant-stars" };

  function encodeSetsParam(setLike) {
    const enabled = setLike instanceof Set ? setLike : new Set(setLike);
    return Object.keys(SET_CODES)
      .filter((code) => enabled.has(SET_CODES[code]))
      .join(",");
  }

  function decodeSetsParam(str) {
    return new Set(
      String(str)
        .split(",")
        .map((code) => SET_CODES[code])
        .filter(Boolean)
    );
  }
```

- [ ] **Step 2: Verify in-browser**

Start the `static-site` server, open the page, and in the console run:

```js
JSON.stringify([
  encodeSetsParam(new Set(["pok", "thunders-edge", "discordant-stars"])),
  encodeSetsParam(new Set(["pok"])),
  encodeSetsParam(new Set([])),
  [...decodeSetsParam("p,d")].sort(),
  [...decodeSetsParam("")],
  [...decodeSetsParam("p,zzz")],
])
```

Expected: `"[\"p,t,d\",\"p\",\"\",[\"discordant-stars\",\"pok\"],[],[\"pok\"]]"`

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Add expansion-set URL codes and encode/decode helpers"
```

---

### Task 2: Refactor `parseMapString` into `applyMapTokens` + thin wrapper

**Files:**
- Modify: `js/app.js` — replace the whole `parseMapString` function (currently lines 1480-1527)

- [ ] **Step 1: Replace `parseMapString` with `applyMapTokens` + `parseMapString`**

Find the entire current function:

```js
  function parseMapString(str) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    const rest = mapStringCells;
    if (tokens.length !== rest.length) {
      alert(`Expected ${rest.length} numbers (one per non-Mecatol hex), got ${tokens.length}.`);
      return;
    }

    const tilesById = new Map();
    TILE_POOL.forEach((t) => {
      if (!tilesById.has(t.id)) tilesById.set(t.id, []);
      tilesById.get(t.id).push(t);
    });
    const setPriority = { base: 0, pok: 1, "thunders-edge": 2, "discordant-stars": 3 };

    const newBoard = new Map();
    const usedKeys = new Set();
    let badToken = null;

    rest.forEach((c, i) => {
      const token = tokens[i];
      if (token === "0" || token === "-1") return;
      const id = Number(token);
      const candidates = (tilesById.get(id) || [])
        .filter((t) => t.set === "base" || enabledSets.has(t.set))
        .filter((t) => !usedKeys.has(poolKey(t)))
        .sort((a, b) => (setPriority[a.set] ?? 9) - (setPriority[b.set] ?? 9));
      const match = candidates[0];
      if (!Number.isFinite(id) || !match) {
        badToken = token;
        return;
      }
      usedKeys.add(poolKey(match));
      newBoard.set(keyFor(c.q, c.r), match);
    });

    if (badToken !== null) {
      alert(`Could not import that map string — tile "${badToken}" isn't recognized, isn't enabled, or is used twice.`);
      return;
    }

    board = newBoard;
    pool = new Map(TILE_POOL.filter((t) => !usedKeys.has(poolKey(t))).map((t) => [poolKey(t), t]));
    selectedPoolKey = null;
    lockedKeys = new Set();
    persist();
    renderAll();
  }
```

Replace it entirely with:

```js
  // Resolve an already-correct-length array of map-string tokens against
  // the tile pool and apply them to the board. Returns an array of the
  // tokens that could not be resolved (unknown id, set not enabled, or id
  // reused within the string) -- empty on full success.
  //   partial:false -> all-or-nothing; any bad token aborts, board untouched.
  //   partial:true  -> place whatever resolves, skip (and still return) the rest.
  //   persist:true  -> call persist() after a successful apply.
  function applyMapTokens(tokens, { persist: doPersist = false, partial = false } = {}) {
    const tilesById = new Map();
    TILE_POOL.forEach((t) => {
      if (!tilesById.has(t.id)) tilesById.set(t.id, []);
      tilesById.get(t.id).push(t);
    });
    const setPriority = { base: 0, pok: 1, "thunders-edge": 2, "discordant-stars": 3 };

    const newBoard = new Map();
    const usedKeys = new Set();
    const badTokens = [];

    mapStringCells.forEach((c, i) => {
      const token = tokens[i];
      if (token === "0" || token === "-1") return;
      const id = Number(token);
      const candidates = (tilesById.get(id) || [])
        .filter((t) => t.set === "base" || enabledSets.has(t.set))
        .filter((t) => !usedKeys.has(poolKey(t)))
        .sort((a, b) => (setPriority[a.set] ?? 9) - (setPriority[b.set] ?? 9));
      const match = candidates[0];
      if (!Number.isFinite(id) || !match) {
        badTokens.push(token);
        return;
      }
      usedKeys.add(poolKey(match));
      newBoard.set(keyFor(c.q, c.r), match);
    });

    if (badTokens.length && !partial) return badTokens;

    board = newBoard;
    pool = new Map(TILE_POOL.filter((t) => !usedKeys.has(poolKey(t))).map((t) => [poolKey(t), t]));
    selectedPoolKey = null;
    lockedKeys = new Set();
    if (doPersist) persist();
    renderAll();
    return badTokens;
  }

  function parseMapString(str) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    if (tokens.length !== mapStringCells.length) {
      alert(`Expected ${mapStringCells.length} numbers (one per non-Mecatol hex), got ${tokens.length}.`);
      return;
    }
    const bad = applyMapTokens(tokens, { persist: true, partial: false });
    if (bad.length) {
      alert(`Could not import that map string — tile "${bad[0]}" isn't recognized, isn't enabled, or is used twice.`);
    }
  }
```

- [ ] **Step 2: Verify the Import Map String button still behaves identically**

Reload the page. Then:

1. Place a few tiles, click **📋 Export Map String** (copies to clipboard / shows a prompt). Copy that string.
2. Click **🗑️ Clear board**.
3. Click **📥 Import Map String**, paste the string, OK. Expected: the board is restored exactly, no `alert`, console clean.
4. Click **📥 Import Map String**, paste `1 2 3` (too few). Expected: `alert` "Expected N numbers ... got 3.", board unchanged.
5. Click **📥 Import Map String**, paste a full-length string with one token changed to `99999`. Expected: `alert` `Could not import that map string — tile "99999" isn't recognized, isn't enabled, or is used twice.`, board unchanged.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Extract applyMapTokens() core from parseMapString()"
```

---

### Task 3: `shareMode` flag and `persist()` guard

**Files:**
- Modify: `js/app.js` — module-scope declaration (near line 29) and `persist()` (currently lines 1432-1438)

- [ ] **Step 1: Declare `shareMode`**

Find (near the top, around line 29):

```js
  let playerNames = [];
```

Add immediately after it:

```js
  // Set true by loadFromHash() when the page was opened from a shared-map
  // URL. While set, persist() is a no-op so this tab never overwrites the
  // single shared localStorage autosave slot that other tabs rely on.
  let shareMode = false;
```

- [ ] **Step 2: Guard `persist()`**

Find:

```js
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (e) {
      /* localStorage may be unavailable — ignore */
    }
  }
```

Replace with:

```js
  function persist() {
    if (shareMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (e) {
      /* localStorage may be unavailable — ignore */
    }
  }
```

- [ ] **Step 3: Verify the guard**

Reload the page. In the console:

```js
const before = localStorage.getItem("ti4-map-generator-state-v1");
shareMode = true;
// trigger a persist() the normal way: place or remove a tile on the board,
// or run clearBoard() from the console:
clearBoard();
const after = localStorage.getItem("ti4-map-generator-state-v1");
shareMode = false;
JSON.stringify({ unchanged: before === after });
```

Expected: `"{\"unchanged\":true}"`. Then reload the page to restore normal state.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Add shareMode flag that disables localStorage persistence"
```

---

### Task 4: `buildShareURL()` and `loadFromHash()`

**Files:**
- Modify: `js/app.js` — add both functions right after `parseMapString` (which now ends around line 1500 after Task 2)

- [ ] **Step 1: Add `buildShareURL()` and `loadFromHash()`**

Find the end of `parseMapString` (the new thin version from Task 2):

```js
  function parseMapString(str) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    if (tokens.length !== mapStringCells.length) {
      alert(`Expected ${mapStringCells.length} numbers (one per non-Mecatol hex), got ${tokens.length}.`);
      return;
    }
    const bad = applyMapTokens(tokens, { persist: true, partial: false });
    if (bad.length) {
      alert(`Could not import that map string — tile "${bad[0]}" isn't recognized, isn't enabled, or is used twice.`);
    }
  }
```

Add immediately after it:

```js

  // A shareable URL that reproduces the current board with no backend:
  // the map string, the active layout key, and the enabled expansion sets
  // all live in the URL hash. Parsed back by loadFromHash() on page load.
  function buildShareURL() {
    return (
      location.origin +
      location.pathname +
      "#l=" + currentLayout.key +
      "&m=" + serializeMapString().split(" ").join(",") +
      "&s=" + encodeSetsParam(enabledSets)
    );
  }

  function parseHashParams() {
    return new Map(
      location.hash
        .replace(/^#/, "")
        .split("&")
        .filter(Boolean)
        .map((pair) => {
          const eq = pair.indexOf("=");
          return eq === -1 ? [pair, ""] : [pair.slice(0, eq), pair.slice(eq + 1)];
        })
    );
  }

  // If the page was opened from a buildShareURL() link, set up the board
  // from the hash and return true (init() then skips localStorage). Any
  // problem (no "m=", wrong tile count) returns false so the normal
  // localStorage path runs instead. Never alert()s -- a broken shared
  // link must not pop a dialog on page load.
  function loadFromHash() {
    const params = parseHashParams();
    if (!params.has("m")) return false;

    // Layout first: it sets mapStringCells, which the length check needs.
    // Same resolution + fallback as loadFromObject().
    const layout =
      MAP_LAYOUTS.find((l) => l.key === params.get("l")) ||
      MAP_LAYOUTS.find((l) => l.key === DEFAULT_LAYOUT_KEY);
    applyLayout(layout);

    const tokens = params.get("m").split(",").filter(Boolean);
    if (tokens.length !== mapStringCells.length) {
      console.warn(
        `Ignoring shared map URL: layout "${layout.key}" expects ${mapStringCells.length} tiles, got ${tokens.length}.`
      );
      return false;
    }

    if (params.has("s")) enabledSets = decodeSetsParam(params.get("s"));
    renderTileSetToggles();

    shareMode = true;
    const bad = applyMapTokens(tokens, { persist: false, partial: true });
    if (bad.length) {
      console.warn(`Shared map URL: ${bad.length} tile(s) could not be placed:`, bad.join(", "));
    }
    return true;
  }
```

- [ ] **Step 2: Verify `buildShareURL()` output shape**

Reload the page. In the console:

```js
buildShareURL()
```

Expected: a string like
`http://localhost:8420/#l=6p-standard&m=0,0,0,0,0,0,-1,-1,...&s=p,t,d`
— starts with the current origin + path, then `#l=`, then `&m=` with comma-separated tokens (count = 36 for a 3-ring layout), then `&s=p,t,d` (all sets on by default).

- [ ] **Step 3: Verify `loadFromHash()` returns false when there's no hash**

In the console:

```js
loadFromHash()
```

Expected: `false` (current URL has no `#m=`), console clean, board unchanged.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Add buildShareURL() and loadFromHash()"
```

---

### Task 5: Wire `loadFromHash()` into `init()`

**Files:**
- Modify: `js/app.js` — the tail of `init()` (currently lines 1710-1724)

- [ ] **Step 1: Gate the localStorage restore behind `loadFromHash()`**

Find the end of `init()`:

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

Replace with:

```js
    renderLayoutSelectOptions();
    renderTileSetToggles();

    if (!loadFromHash()) {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      } catch (e) {
        saved = null;
      }
      if (saved) {
        loadFromObject(saved);
      } else {
        applyLayout(MAP_LAYOUTS.find((l) => l.key === DEFAULT_LAYOUT_KEY));
        renderAll();
      }
    }
  }
```

- [ ] **Step 2: Verify the no-hash path is unchanged**

Reload the page with no hash in the URL. Expected: the board loads from `localStorage` exactly as before (your last autosaved map, or an empty default board), console clean, the address bar still has no `#`.

- [ ] **Step 3: Verify a hand-built hash loads**

In the console, build a link from the current board and navigate to it:

```js
location.href = buildShareURL();
```

The page reloads. Expected: the same board renders, console shows no errors (it may show the `Shared map URL: N tile(s) could not be placed` warning only if a tile isn't in an enabled set — for a default all-sets-on board it should be silent). Run `shareMode` in the console — expected `true`.

- [ ] **Step 4: Verify share mode blocks persistence**

Still on the hashed URL from Step 3: note `localStorage.getItem("ti4-map-generator-state-v1")`, then place or remove a tile, then check the value again. Expected: unchanged.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "Load shared-map URL hash on startup, ahead of localStorage"
```

---

### Task 6: `🔗 Copy share link` toolbar button

**Files:**
- Modify: `index.html` — toolbar (currently line 19)
- Modify: `js/app.js` — `init()`, right after the `btn-import-mapstring` handler (currently ends line 1708)

- [ ] **Step 1: Add the button to the toolbar**

In `index.html`, find:

```html
        <button id="btn-export-mapstring">📋 Export Map String</button>
        <button id="btn-import-mapstring">📥 Import Map String</button>
```

Change to:

```html
        <button id="btn-export-mapstring">📋 Export Map String</button>
        <button id="btn-import-mapstring">📥 Import Map String</button>
        <button id="btn-copy-share-link" title="Copy a URL that reproduces this map">🔗 Copy share link</button>
```

- [ ] **Step 2: Wire the button in `init()`**

In `js/app.js`, find the import-mapstring handler:

```js
    document.getElementById("btn-import-mapstring").addEventListener("click", () => {
      const str = window.prompt("Paste a map string:");
      if (str) parseMapString(str);
    });
```

Add immediately after it:

```js
    document.getElementById("btn-copy-share-link").addEventListener("click", () => {
      const url = buildShareURL();
      const btn = document.getElementById("btn-copy-share-link");
      const original = btn.textContent;
      const showCopied = () => {
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied, () => window.prompt("Copy this share link:", url));
      } else {
        window.prompt("Copy this share link:", url);
      }
    });
```

- [ ] **Step 3: Verify the round-trip**

Reload the page.

1. Build a map (place several tiles; enable/leave all sets on).
2. Click **🔗 Copy share link**. Expected: button text flips to "✅ Copied!" for ~1.5s.
3. Open a new browser tab, paste the URL, go. Expected: identical board, same layout, same set toggles, console clean.

- [ ] **Step 4: Commit**

```bash
git add index.html js/app.js
git commit -m "Add Copy share link toolbar button"
```

---

### Task 7: Full verification pass and README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the README feature lists**

In `README.md`, find the "Not yet built (ideas for later)" list item:

```
- Shareable map links (currently JSON export/import only).
```

Remove that line. Then in the "It currently supports:" list, find:

```
- Export the board as a PNG image, or as a JSON file you can re-import
  later to keep editing.
```

Add a new bullet immediately after it:

```
- "Copy share link" — a URL that encodes the whole map (layout, tiles,
  enabled expansions) in its hash, so it works on static hosting. Opening
  such a link loads the map without touching your autosaved board.
```

- [ ] **Step 2: Run the full spec test matrix in-browser**

Reload after any change. Console must be clean on every path unless a step says otherwise.

1. **Round-trip** — build a map using expansion tiles → **🔗 Copy share link** → open in a fresh tab → board, layout, and set checkboxes all match.
2. **Layout round-trip** — pick a non-default layout from the dropdown (test both `4p-warp` and a 4-ring one such as `7p-standard`), build a map, share it, open the link → the layout dropdown shows that layout and the home / hyperlane slots match; `m=` token count is 36 for 3-ring, 60 for 4-ring.
3. **Share mode is non-persistent** — record `localStorage["ti4-map-generator-state-v1"]`, open a share link, edit the board in that tab → the stored value is byte-for-byte unchanged.
4. **Multi-tab** — tab A (opened with no hash) builds a map and autosaves; open a share link in tab B; reload tab A → tab A still shows tab A's map.
5. **No hash** — normal load restores from `localStorage`; the address bar stays clean.
6. **Broken hash** — take a valid link, change one `m=` token to `99999`, open it → the other tiles load, one `console.warn` names the bad token, no `alert()`.
7. **`s=` absent** — strip `&s=...` from a link, keep `l=` and `m=`, open it → all expansion sets end up enabled, map loads.
8. **`s=` empty / partial** — `&s=` (base only) and `&s=p` load with exactly those sets enabled (check the palette's set toggles).
9. **`l=` absent / unknown** — strip `&l=...` (or set `l=bogus`) from a 3-ring-layout link → falls back to `6p-standard` and loads (token count matches). With a 4-ring link and no `l=`, expect a `console.warn` about the count mismatch and a normal `localStorage` load.
10. **Clipboard fallback** — in the console run `const c = navigator.clipboard; Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true});` then click the button → a `window.prompt` shows the URL. Restore with `Object.defineProperty(navigator, 'clipboard', {value: c, configurable: true});`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document Copy share link feature in README"
```

---

## Self-review notes

- **Spec coverage:** URL format (`l`/`m`/`s`) → Tasks 1, 4, 6. Load behavior + layout resolution → Tasks 4, 5. Share-mode non-persistence → Task 3. Bad/partial hash (`console.warn`, no `alert`) → Tasks 2, 4. `applyMapTokens` refactor with `partial` semantics → Task 2. Helpers + `buildShareURL` → Tasks 1, 4. Toolbar button → Task 6. Every spec test case → Task 7 Step 2.
- **Type/name consistency:** `applyMapTokens(tokens, { persist, partial })` returns `string[]` (bad tokens) everywhere; `parseMapString` calls it with `{ persist: true, partial: false }`, `loadFromHash` with `{ persist: false, partial: true }`. `encodeSetsParam` takes a `Set`/array, `decodeSetsParam` returns a `Set`. `buildShareURL`/`loadFromHash`/`parseHashParams` all use the `#l=…&m=…&s=…` shape. `shareMode` is the single flag name.
- **No placeholders:** every code step shows complete before/after text; every verify step gives an exact console snippet or click sequence and its expected result.
