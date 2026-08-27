# Selectable Player-Count Map Layouts — Design

## Goal

Replace the hardcoded 6-player/3-ring board with a dropdown that lets the
user pick from every player-count layout (3–8 players) we can find,
including the community "alternate hyperlane" variants for asymmetric
player counts.

## Background / research

The app's only board today is a symmetric 3-ring hex spiral with 6 homes
at the outer ring's corners (`RINGS = 3` in `js/app.js`, `homeSlotKeys()`
in `js/hexgrid.js`). Real TI4 (plus well-established community variants)
has many more:

| Layout | Rings | Homes | Hyperlane slots |
|---|---|---|---|
| 3-Player Standard | 3 | 3 | 0 |
| 3-Player Settlers | 3 | 3 | 18 |
| 3-Player Warp | 3 | 3 | 18 |
| 4-Player Standard | 3 | 4 | 0 |
| 4-Player Skinny | 3 | 4 | 10 |
| 4-Player Warp | 3 | 4 | 12 |
| 5-Player Standard | 3 | 5 | 0 |
| 5-Player Skinny | 3 | 5 | 6 |
| 5-Player Warp | 3 | 5 | 6 |
| 6-Player Standard (current default) | 3 | 6 | 0 |
| 6-Player Large Galaxy | 4 | 6 | 0 |
| 7-Player Standard | 4 | 7 | 6 |
| 7-Player Alt Hyperlanes | 4 | 7 | 18 |
| 8-Player Standard | 4 | 8 | 0 |
| 8-Player Alt Hyperlanes | 4 | 8 | 12 |

Source: [heisenbugged/ti4-lab](https://github.com/heisenbugged/ti4-lab)'s
`app/data/defaultLayouts.ts`, an actively-maintained TI4 map tool that
already encodes all 15 of these as real (x, y, z) cube-coordinate lists
with a per-cell role (Mecatol / home / fillable / hyperlane).

**Coordinate system match, verified:** ti4-lab's cube coordinates use the
exact same axial convention and direction ordering as this app's `(q, r)`
system (confirmed by matching both apps' six neighbor-direction vectors
and by cross-checking the "6-Player" layout's home positions against this
app's own `homeSlotKeys(3)` output — identical set). So `q = x, r = y`
converts ti4-lab's data directly into ours with no reprojection.

**Every layout is still a plain N-ring hex spiral.** None of the 15
layouts change the underlying grid shape — they only change which cells
within a standard 3-ring or 4-ring spiral are designated home, hyperlane,
or freely-fillable. That means `generateHexRings()`, `axialToPixel()`,
`generateMapStringOrder()`, and all pixel/geometry math in
`js/hexgrid.js` need **zero changes** — a layout is fully described by
`rings` plus two sets of cell keys (`homeKeys`, `hyperlaneKeys`).

**Non-corner homes exist.** 5/7/8-player layouts can't fit their home
count into the 6 canonical corner positions, so some homes sit at
off-corner positions spread around the outer ring (e.g. 7-Player
Standard has homes at `(3,-4)`, `(4,-2)`, `(3,1)`, `(-3,4)`, `(-4,2)`,
`(0,4)`, `(-3,-1)` — only one of which, `(0,4)`, is a standard corner).
This breaks the current `homePathTiles()` in `js/scoring.js`, which
assumes every home sits exactly on one of the 6 primary directions
(`home.q/rings, home.r/rings` must be a unit direction vector — not true
for an off-corner home).

## Architecture

### New data file: `data/map-layouts.js`

A static `MAP_LAYOUTS` array, loaded after `js/hexgrid.js` and before
`js/app.js` (pure data, no dependencies of its own). One entry per
dropdown option:

```js
{
  key: "7p-standard",              // stable id, used for persistence
  label: "7 Players — Standard",
  playerCount: 7,
  rings: 4,
  homeKeys: ["3,-4", "4,-2", "3,1", "-3,4", "-4,2", "0,4", "-3,-1"],
  hyperlaneKeys: ["0,-2", "1,-3", "-1,-2", "1,-4", "-1,-3", "0,-4"],
}
```

`homeKeys`/`hyperlaneKeys` are literal `"q,r"` lists extracted directly
from ti4-lab's data (already extracted and verified for all 15 layouts
during research — see the table above for exact counts per layout).
`hyperlaneKeys` is empty for the 6 layouts that don't need any.

### `js/scoring.js`: generalize `homePathTiles()`

Replace the direction-vector assumption with a standard cube-coordinate
hex-line algorithm (lerp both endpoints' cube coordinates at each step,
round to the nearest hex) between the home and Mecatol. This produces
the same 2-tile path as today for every existing (corner) home position,
and a sensible path for off-corner homes too — since every home is still
exactly `rings` hexes from center, the line always has exactly
`rings - 1` intermediate tiles, so the "path" concept and its existing
anomaly-penalty logic in `computeHomeSlices()` need no other changes.

### `js/app.js`: layout becomes runtime state, not constants

- `RINGS` stops being a fixed constant; a `currentLayout` variable
  (default: the existing 6-Player layout, so old saves/behavior are
  unaffected) drives `RINGS`, `cells` (`generateHexRings(RINGS)`),
  `homeKeys` (`new Set(currentLayout.homeKeys)`), and a new
  `hyperlaneKeys` set, all rebuilt together whenever the layout changes.
- `mapStringCells` (`generateMapStringOrder(RINGS)`) is rebuilt the same
  way — already fully generic to `rings`.
- `playerNames` resizes to the new layout's home count, keeping existing
  names where an index is still valid and defaulting new slots to
  `"Player N"`.
- Hyperlane cells render via a new `drawHyperlaneSlot()` — non-clickable
  and non-placeable, the same fixed-decoration treatment `drawTile`
  already gives Mecatol Rex. Visual: a distinct tile fill plus a fixed
  pair of gentle curves sweeping across the hex (styled like real
  hyperlane tile art, not tied to any specific official connection
  pattern — purely decorative, since this tool never simulates
  ship-movement adjacency through hyperlanes). Always the same fixed
  look; no rotation, no picking, no interaction.

### UI

A labeled `<select id="layout-select">` in the toolbar, `<optgroup>`-ed by
player count, listing all 15 layouts. Changing it:
1. Confirms first only if the board currently has any placed tiles
   (mirrors the existing "Clear board" confirmation pattern).
2. Rebuilds `currentLayout`/`RINGS`/`cells`/`homeKeys`/`hyperlaneKeys`/
   `mapStringCells`, resets `board`/`pool`/`lockedKeys`, resizes
   `playerNames`, and re-renders. The tile pool itself
   (`TILE_POOL`/`enabledSets`) is untouched — layout is purely a board
   shape, unrelated to which expansions are enabled.

### Persistence

`serialize()` stores the current layout's `key`; `loadFromObject()`
looks it up in `MAP_LAYOUTS` and rebuilds state for that layout before
placing any saved tiles, falling back to the default 6-Player layout key
if the saved data has none (old saves) or an unrecognized key.

### Map strings

Format is unchanged in shape (still ring-ordered, north-of-Mecatol,
clockwise, one token per non-Mecatol hex) — just a different token count
per layout, since `rings` and `homeKeys` differ. Import validates the
token count against the *currently selected* layout, same as today.

## Explicit scope boundaries

- No hyperlane tile picking, placement, or rotation UI — hyperlane slots
  are fixed decoration baked into the layout, matching the "fixed
  decoration" choice made during design review.
- No attempt to replicate the exact official edge-connection pattern per
  hyperlane slot — purely a generic, consistent visual, since this tool
  has no gameplay-adjacency/movement simulation that would ever need it.
- Board-stats/slice-scoring adapts (via the generalized path algorithm)
  but its rendering (board-stats overlay, home-tile score/tooltip) is
  otherwise unchanged — no new UI for the new layouts beyond the extra
  home tiles and hyperlane decoration.

## Testing

No test framework exists (per `CLAUDE.md`) — verification is manual
in-browser: for each of the 15 layouts, switch to it, confirm the board
renders with the right ring count, home count, and hyperlane-decorated
cell count; confirm the 6-Player default layout is byte-identical in
behavior to today (home positions, map-string length, slice-scoring)
before/after this change; confirm switching layouts resets the board
with a confirmation prompt only when tiles are placed; confirm
localStorage round-trips the selected layout across a reload.
