# Slice Scoring & Home Balance — Design

## Goal

Compute a numeric "value" for tiles and for each home system's reachable slice, and surface it on the board: a per-home breakdown shown directly on that home's tile, a per-tile value in tooltips, and a top-right overlay showing the balance gap between the strongest and weakest home this game.

## Background

Researched two existing open-source implementations before designing this:
- **ti4-lab** (`heisenbugged/ti4-lab`, TypeScript): additive per-planet scoring (`max(resources, influence)` + flat bonuses for tech/legendary/station/entropic-scar), aggregated per home slice within hex-distance 2, with equidistant-tile value splitting and a distance-to-Mecatol adjustment.
- **ti4-cartographer** (`acodcha/ti4-cartographer`, C++): more granular composite scoring including a per-named-legendary-planet value table.

This design follows ti4-lab's additive/transparent model as the base (it maps directly onto this repo's existing tile/planet data and hex-grid math), borrowing ti4-cartographer's per-named-legendary table for a bit more nuance than a single flat legendary bonus.

## Non-goals (explicitly out of scope for this feature)

- No automatic balancing. Randomize and Shuffle Unlocked are untouched; this feature only computes and displays numbers. Using the score to *drive* randomization/shuffling is a natural follow-up but a separate piece of work.
- No distance-to-Mecatol point adjustment. In ti4-lab, home distance to Mecatol can vary by slice shape, so a "closer/farther than baseline" adjustment differentiates players. In this app, home slots are always the outer-ring corners of a fixed 3-ring board — every home is always exactly hex-distance 3 from Mecatol. That term would always compute to exactly 0 here, so it's dropped entirely rather than implemented as dead code.
- No trait-based scoring (cultural/industrial/hazardous contribute nothing) and no anomaly bonuses/penalties beyond what's listed below (asteroid field, gravity rift, and non-path nebula/supernova contribute 0).

## Architecture

New file `js/scoring.js`: pure functions, no DOM access, no IIFE wrapper (matching `js/hexgrid.js`'s existing style, since this is the same kind of "pure math module" split out from `app.js` for the same reason). Script load order becomes:

```
data/tiles-data.js → data/legendary-badge.js → data/tech-icons.js → js/hexgrid.js → js/scoring.js → js/app.js
```

`js/scoring.js` depends on `js/hexgrid.js` (needs `keyFor`) and on the tile/planet shape defined in `data/tiles-data.js`, but has no knowledge of the DOM, SVG, or rendering.

`app.js`'s `renderBoard()` calls into `js/scoring.js` once per render (no caching) to get all the numbers it needs, exactly matching the existing pattern `renderBoardStats()` already uses ("recomputed on every `renderBoard()` call... so it's always live, no separate invalidation to remember" — see `CLAUDE.md`). The board is 37 hexes; recomputing everything fresh every render is trivially cheap.

## Scoring formula

### Per-planet value

Base value: `max(resources, influence)`.

Added on top:

| Bonus | Value | Notes |
|---|---|---|
| Tech specialty | +0.5 | per tech skip on the planet |
| Named legendary | 1.0–3.0 | see table below |
| Any other legendary (not in the named table) | +1.5 | flat fallback |
| Space station | +1 | |

Named legendary table (borrowed from ti4-cartographer, matched by planet name):

| Planet | Value |
|---|---|
| Thunder's Edge, Styx | 3.0 |
| Hope's End, Garbozia | 2.5 |
| Mallice, Emelpar, Industrex | 2.0 |
| Primor, Faunus, Tempesta, Mecatol Rex | 1.5 |
| Mirage | 1.0 |

Any legendary planet not in this table (there are more legendary planets in this repo's PoK/Thunder's Edge/Discordant Stars data than either reference tool covers) uses the +1.5 flat fallback instead.

A planet's `optimalResources` is its `resources` if `resources >= influence`, else 0. Its `optimalInfluence` is its `influence` if `influence > resources`, else 0. (These separately-tracked totals are what line 2 of the home-tile display shows — see Display section.)

### Per-tile value

`tileValue(tile) = sum of planetValue(planet) for planet in tile.planets` plus:

| Bonus | Value |
|---|---|
| Per wormhole | +1 |
| Entropic Scar anomaly | +2 |

This is the number shown in every tile's own tooltip (see Display section) and is also the unsplit value fed into slice aggregation below.

## Slice aggregation

For each home system, its "slice" is every board tile within hex-distance ≤2 of that home (standard convention, matches this board's fixed layout). Empty hexes and hexes outside that radius contribute 0. Mecatol Rex never contributes to any home's slice (even though `tileValue()` still computes a number for it, for its own tooltip).

**Equidistant tiles:** if a tile is within distance ≤2 of more than one home, its value (and its `optimalResources`/`optimalInfluence` sub-totals) splits evenly across every home that reaches it — e.g. a tile equidistant between 2 homes contributes half its value to each. This generalizes to any number of ties, not just 2-way.

**Tech-skip letters are not split.** If a shared tile has a tech skip, every home that reaches it gets credit for that letter — a tech skip isn't a divisible resource the way a point value is.

A home's total slice score is the sum of (possibly split) tile values across its reachable tiles.

## Path-to-Mecatol anomaly penalty

Each home sits at `direction × RINGS` for one of the 6 primary axial directions already used by `generateHexRings` (RINGS = 3). Its path to Mecatol is therefore always the same 2 intermediate tiles, no branching: the tile at `direction × 2` and the tile at `direction × 1`.

Penalty per home, checked against those exact 2 tiles:
- **-2** if either intermediate tile has a supernova anomaly
- **-1** if either intermediate tile has a nebula anomaly

Both penalties can apply simultaneously (checked independently, e.g. if the two intermediate tiles have one of each). This is the only piece of ti4-lab's "path to Mecatol" scoring that survives in this design — the distance-adjustment term is dropped (see Non-goals).

## Display

### Home tiles

Currently: `HOME` (line 1) + player name (line 2). New layout:
1. Player name (kept)
2. Total slice score
3. Optimal resources / optimal influence (e.g. `12R / 8I`, reusing the existing green-resource/blue-influence coloring convention)
4. Tech-skip letters, one per tech-skip planet reachable in the slice: **B** = Propulsion, **G** = Biotic, **Y** = Cybernetic, **R** = Warfare (these map to the existing `TECH_SWATCH_COLORS` in `app.js` — blue/green/yellow/red respectively). E.g. two Biotic skips + one Cybernetic skip reachable renders `GGY`.

`HOME` no longer displays.

Hovering a home tile shows a tooltip with a per-reachable-tile breakdown: each tile's id, its contribution to this home (noting when it's split with another home and with whom), and what made up that value (base + bonuses). The per-tile contributions in the tooltip must sum to the total shown on the tile.

### Regular tile tooltips

Every tile's existing hover tooltip (built in `showTooltip()`) gets one additional line: its own `tileValue()`.

### New overlay: slice balance

A new panel, top-right of the map (mirroring the existing top-left `#board-stats`), recomputed live on every `renderBoard()` call the same way `renderBoardStats()` is. Shows:
- The gap between the highest and lowest home slice value this game
- Which player is highest and which is lowest (with their values)

## Testing

No test framework or build step in this repo (per `CLAUDE.md`). Verification is manual in-browser:
1. Randomize a full board.
2. Hand-compute the expected slice value for at least one home (pick one with a mix of tech skips, a legendary planet, and at least one equidistant-shared tile) and compare against what's displayed.
3. Confirm the home tile's tooltip breakdown sums to the total shown on the tile.
4. Confirm the top-right panel's max/min match the actual values shown on the corresponding home tiles.
5. Spot-check the path-to-Mecatol penalty by placing a supernova or nebula on one of a home's two fixed path tiles and confirming that home's score drops by the expected amount.
