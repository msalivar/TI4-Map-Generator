# Expansion tile sets + configurable randomize

## Problem

The map generator currently only ships base-game tiles and a single-click
"randomize empty tiles" button with no options. The user wants:

- Tiles from Prophecy of Kings (PoK), Thunder's Edge, and Discordant Stars,
  each individually toggleable on/off.
- A "Randomize" flow with real options: number of wormholes, blue/red ratio,
  Entropic Scar count (0-2), and a legendary-planet minimum.

## Data model changes (`data/tiles-data.js`)

Each tile gains:

- `set`: `"base" | "pok" | "thunders-edge" | "discordant-stars"`
- `wormholes: string[]` (replaces the single `wormhole` string — some real
  tiles carry two, e.g. Thunder's Edge #117 has both a Gravity Rift and an
  Asteroid Field; Discordant Stars #4276 has two wormholes)
- `anomalies: string[]` (replaces the single `anomaly` string, same reason)
- each planet gains `legendary: boolean`

Existing base-game tiles are reshaped into the new array fields with no
content changes — they stay exactly as inaccurate/placeholder as they are
today (out of scope to "fix" the base set).

`ANOMALY_LABELS` gains an `entropicScar` entry. `WORMHOLE_LABELS` already
covers alpha/beta/gamma/delta; Thunder's Edge introduces an `epsilon`
wormhole on home-system gate tiles only, which are excluded (see below), so
no epsilon label is needed unless a later expansion adds one to a tile we
actually include.

## Tile data source and scope cuts

Sourced from the TI4 wiki's Tiles List
(https://twilight-imperium.fandom.com/wiki/Tiles_List), cross-referenced with
a community-maintained base+PoK dataset for planet traits/tech specialties
(github.com/daveah/ti4_planet_selection) where the wiki table didn't carry
that detail. Raw captures are saved in the session scratchpad
(`wiki-tiles-list-raw.txt`, `wiki-uncharted-space-raw.txt`, `daveah-tiles.py`)
for use during implementation.

Excluded from all three new sets, consistently:

- **Faction home systems** — our board's home slots are generic ("HOME" +
  player name), not filled with a specific faction's tile, so home-system
  tiles (PoK 52-58, Thunder's Edge 92-96 and 118) aren't part of this tool's
  pool.
- **Hyperlane and fracture tiles** (PoK 83-91, Thunder's Edge 119-128) — these
  have directional-path or multi-system mechanics the hex grid doesn't model
  today. Out of scope for this feature.
- **Non-standard specials**: PoK's Muaat-only supernova (#81) and the
  optional Mallice tile (#82), Thunder's Edge's alternate Mecatol Rex (#112)
  — none of these are part of a normal galaxy draw.

Resulting pools (generic, draftable tiles only):

- **PoK** (59-80): 22 tiles — legendary Primor
  (#65) and Hope's End (#66), plus normal/anomaly/wormhole tiles.
- **Thunder's Edge** (97-117): 20 tiles — 4 legendary (#97-100), plus
  normal/anomaly/wormhole tiles including the two Entropic Scar tiles
  (#114, #116 — Lemox, which pairs Entropic Scar with an Industrial planet).
- **Discordant Stars**, via its "Uncharted Space" tile set: 24 tiles — 5
  legendary planets, 12 blue, 7 red — kept under their original community
  numbers (4257-4276) for traceability back to the source instead of being
  renumbered into the 1-128 range.

Planet trait (cultural/hazardous/industrial) is included wherever the source
data made it unambiguous. Tech specialty is only attached to single-planet
tiles, where it's unambiguous which planet it belongs to; multi-planet tiles
are left with `tech: null` rather than guessing an attribution the sources
don't make clear.

## Tile Sets panel (persistent, sidebar)

New section in the palette sidebar, above or below the existing tile lists:
three checkboxes — Prophecy of Kings / Thunder's Edge / Discordant Stars.
Base game is always on (not a checkbox).

Unchecking a set removes its *unplaced* tiles from the palette immediately.
Tiles from that set already placed on the board are left alone (toggling a
set off doesn't rip up an in-progress map) but won't be offered again if
picked back up off the board while the set is disabled. State is persisted
to `localStorage` alongside the rest of the map (extends the existing
`serialize()`/`persist()`/`loadFromObject()` flow).

## Randomize dialog (replaces the one-click button)

The toolbar's "🎲 Randomize empty tiles" button becomes "🎲 Randomize…" and
opens a small modal instead of acting immediately:

- **Blue/Red ratio** — a slider, default set to the enabled pool's actual
  current blue:red ratio (not hardcoded), representing the % of blue tiles
  among the tiles the randomizer will place.
- **Wormhole count** — stepper, 0 to the number of wormhole-tagged tiles
  actually available (enabled sets, not already placed on the board).
- **Entropic Scar count** — stepper, 0-2, further capped to what's actually
  available (0 if Thunder's Edge is disabled).
- **Legendary planet minimum** — stepper, 0 to the number of legendary
  tiles actually available given enabled sets.
- Every control's max bound is computed live each time the dialog opens, so
  there is no way to configure a combination the current pool can't satisfy
  — no error/warning state is needed at randomize-time.
- "Randomize" applies and closes; "Cancel" closes without changing anything.
- Only currently-empty hexes are touched, same as today's behavior.

## Fill algorithm

1. Collect the empty target hexes (ring > 0, not a home slot, not already
   filled) — call this count `N`.
2. From the enabled, not-yet-placed pool, select tiles in priority order,
   never selecting more than `N` total and never re-selecting a tile already
   picked in an earlier step:
   a. Random legendary tiles, up to the legendary-minimum setting.
   b. Random Entropic Scar tiles, up to the entropic-scar setting.
   c. Random wormhole tiles, up to the wormhole-count setting.
   d. Fill the remaining slots from the rest of the pool, drawing blue/red
      at the configured ratio (rounding as needed; if one color runs out,
      fill remaining slots from whichever color is left).
3. Shuffle the combined selection and assign to the (also shuffled) empty
   hexes, same as the existing `randomizeEmpty()` behavior.

## Testing

Manual verification in-browser (as done for the previous drag-and-drop /
fit-to-window change, via a local static file server since this project has
no build step): toggle each tile set on/off and confirm palette contents
change; open the randomize dialog, confirm control max bounds change as sets
are toggled; run a randomize with each option pushed to its max and confirm
the resulting board respects all four constraints; confirm manually-placed
tiles are never touched by randomize.
