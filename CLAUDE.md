# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based, unofficial Twilight Imperium 4th Edition galaxy map builder. Pick system tiles from a palette, place them on a hex board, randomize the rest, and export as a PNG or a "map string". Static site, no backend.

## Running it

No build step, no package.json, no bundler.

- Open `index.html` directly in a browser, or
- Use the preconfigured local server: `.claude/launch.json` defines a `static-site` config that runs `.claude/serve.ps1` (a pure PowerShell `HttpListener`, no Python/Node dependency) on port 8420. If using the Claude Code Browser tool, `preview_start` with `{"name": "static-site"}`.

There is no test suite, linter, or build/lint/typecheck command in this repo — don't go looking for one. Verify changes by loading the page and exercising the UI (see "Testing changes" below).

## Testing changes

Since there's no test framework, verification is done live in a browser:
1. Start the server (see above), reload the tab after any JS/CSS edit.
2. Check the console for errors.
3. Exercise the actual feature (place tiles, randomize, drag-swap, export, etc.).
4. For layout/visual changes, this project has repeatedly needed **element-overlap verification via `getBBox()`**, not just eyeballing — a plain axis-aligned bounding-box overlap check gives false positives between two circles (their square boxes touch before the round shapes do) and false negatives between a circle and a rect/text. When checking planet-cluster layouts, use a circle-aware check: distance-vs-sum-of-radii for circle/circle pairs, closest-point-on-rect for circle/rect pairs.

## Architecture

Four plain `<script>` tags, no modules, load order matters (each file is a bare global scope, later files depend on earlier ones):
```
data/tiles-data.js      → data/legendary-badge.js → data/tech-icons.js → js/hexgrid.js → js/app.js
```
- `js/hexgrid.js` — pure hex-grid math (axial coordinates ↔ pixel, ring generation). Top-level functions, not wrapped in an IIFE, so they're callable directly from a browser console for debugging (`generateHexRings`, `homeSlotKeys`, `keyFor`, `axialToPixel`, `hexPolygonPoints`).
- `data/tiles-data.js` — all tile/planet data plus `TILE_POOL` (the flattened, built pool every tile is drawn from) and the `ANOMALY_LABELS`/`WORMHOLE_LABELS` lookup tables.
- `data/legendary-badge.js`, `data/tech-icons.js` — image assets (from `assets/*.webp`) embedded as base64 data URI constants (`LEGENDARY_BADGE_DATA_URI`, `TECH_ICON_DATA_URIS`), not linked as files. This is deliberate: PNG export clones the live SVG and serializes it standalone with no access to the page's other resources, so any image reference has to be self-contained.
- `js/app.js` — everything else, one large IIFE (~1000 lines: rendering, interaction, randomize, persistence). See below.

### Tile/planet data model

Every tile in `TILE_POOL` (built by `buildTilePool()`/`addPoolTile()` in `tiles-data.js`) has: `id`, `type`, `back` (`"blue"|"red"|"none"`), `set`, `name`, `planets[]`, `wormholes[]`, `anomalies[]` (the latter two are arrays — several real tiles carry more than one). Each planet (via `makePlanet(name, resources, influence, trait, tech, legendary, station)`) has `traits[]` (each `cultural|industrial|hazardous`), `techs[]` (each `warfare|propulsion|biotic|cybernetic`), `legendary`, and `station` booleans. `trait`/`tech` args accept a single string (most planets) or an array (Thunder's Edge has dual-trait/dual-tech planets — a planet counts as having both, per its rules) and are normalized into `traits`/`techs` arrays by `makePlanet()`; every consumer (rendering, filters, scoring, randomizer) treats them as arrays, never singular.

Four tile sets, each a separate array merged by `buildTilePool()`: `NAMED_BLUE_TILES`/`WORMHOLE_TILES`/`RED_TILES` (base game) and `POK_TILES`/`THUNDERS_EDGE_TILES`/`DISCORDANT_STARS_TILES` — all six are real, wiki-sourced data; each array's comment documents its specific source and what's deliberately excluded, e.g. faction home systems and hyperlane tiles, which don't fit this tool's generic-home-slot model.

**Tile `id` is not globally unique across sets in general** — real tile numbers do reset per expansion (Discordant Stars in particular assigns its own numbering independent of the official range), so `poolKey(tile)` is `${set}-${back}-${id}`, not just `id`; don't shorten it.

### `js/app.js` internals

- **Board state**: `board` (Map of hex key → placed tile) and `pool` (Map of not-yet-placed tiles, keyed by `poolKey`). `enabledSets` (Set of enabled expansion keys) filters what `visiblePoolTiles()` exposes to the palette/randomizer without ever mutating `pool` itself — toggling a set off/on never loses tiles.
- **Rendering** (`renderBoard` → `drawTile`/`drawEmpty`/`drawHomeSlot`): builds the board as one SVG per render pass (full `svg.innerHTML = ""` and rebuild — no diffing). Planet circles, wormhole letters, and anomaly backgrounds are all separate SVG elements drawn as siblings *on top of* the hex polygon (not children of it). **Every one of those decorative layers must carry `pointer-events: none`**, or it silently swallows the polygon's own click/drag/tooltip listeners underneath — this has been a recurring real bug (tooltips not showing, tiles impossible to click/drag wherever a circle or image covers them), not a hypothetical.
- **Anomaly art** (`drawSupernovaPixels`, `drawAsteroidFieldPixels`, `drawNebulaPixels`, `drawGravityRiftPixels`, `drawEntropicScarPixels`, dispatched via `ANOMALY_DRAWERS`): procedural "pixel art" — a grid of small `<rect>`s (`PIXEL_CELL`/`PIXEL_COLS`/`PIXEL_ROWS`) covering the whole tile, clipped to the hex shape via a single shared `<clipPath id="hex-clip">` defined once per render and referenced by a per-tile `transform: translate(...)` wrapper group.
- **Interaction**: click-to-place/remove (`onEmptyClick`/`onFilledClick`) and drag-to-swap (`startTileDrag`/`moveOrSwapTile`, pointer-events based, not HTML5 DnD) both live on the hex polygon itself.
- **Randomize** (`openRandomizeModal`/`updateRandomizeBounds`/`randomizeWithOptions`): blue/red tile count, wormhole count, Entropic Scar count, and legendary-planet count are all **minimums**, not exact targets — the fill algorithm tops up with a priority order (legendary → Entropic Scar → wormhole → ratio-fill) and each control's max is recomputed from what's actually available in the enabled/unplaced pool every time the dialog opens, so there's no way to request more than the pool can satisfy.
- **Persistence**: `serialize()`/`loadFromObject()`/`persist()` back the automatic localStorage autosave/restore — this is separate from the user-facing Export/Import buttons, which use a different format (below). Don't conflate the two when changing either.
- **Export/Import format**: "map strings", not JSON — one number per hex in ring order (nearest ring first, skipping Mecatol Rex since it's always the center), `"0"` for a home system, a tile's `id` otherwise, `"-1"` for an empty non-home hex. Within each ring, cells are ordered starting at the tile directly above Mecatol (north) and sweeping clockwise — this is the convention other community TI4 map tools use. That traversal order (`generateMapStringOrder()` in `js/hexgrid.js`) is intentionally separate from `generateHexRings()`'s own cell order (which starts southwest and sweeps counterclockwise, and is what rendering and home-slot corner assignment rely on) — don't conflate the two or point `serializeMapString`/`parseMapString` back at `cells`.
- **Board stats overlay** (`renderBoardStats`): recomputed on every `renderBoard()` call from `board` + `MECATOL_REX`, so it's always live — no separate invalidation to remember.

## Licensing note

This is an unofficial fan tool. Don't add real Fantasy Flight Games / Asmodee artwork or copyrighted rules text — tile data is limited to gameplay-relevant stats (numbers, trait/tech/wormhole/anomaly types), and non-photorealistic/abstract art for anything visual (wormholes, anomalies, legendary/tech icons already in `assets/` are the exception, provided directly by the repo owner).
