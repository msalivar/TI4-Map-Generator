# TI4 Map Generator

A simple, browser-based tool for building Twilight Imperium 4th Edition
galaxy maps. Pick system tiles from the palette, click them onto the hex
board, label your players' home systems, then export the map as an image
or a JSON file you can reload later.

This is a fan-made, unofficial tool. Twilight Imperium is a trademark of
Fantasy Flight Games / Asmodee — no game artwork or copyrighted text is
included here, only tile numbers and gameplay stats (resources,
influence, wormholes, anomalies).

## Status: early / simple

This is a first pass, built to be easy to extend. It currently supports:

- A fixed 3-ring, 37-hex board (the standard size for up to 6 players),
  with Mecatol Rex locked in the center and 6 home system slots on the
  outer ring.
- A palette of blue (safe) and red (anomaly/wormhole) system tiles —
  click a tile, then click an empty hex to place it; click a placed
  tile to send it back to the palette.
- Editable player name labels for each home system.
- "Randomize empty tiles" to quickly fill the rest of the board.
- Export the board as a PNG image, or as a JSON file you can re-import
  later to keep editing.
- Autosaves your in-progress map to the browser's local storage.

### Not yet built (ideas for later)

- Layouts for 3–5 and 7–8 player games (currently only the 6-player
  sized board exists).
- A "balanced" draft/randomizer that spreads resources, influence,
  wormholes, and anomalies evenly like the real game setup rules.
- Prophecy of Kings / other expansion tiles, legendary planets, and
  hyperlane tiles.
- Shareable map links (currently JSON export/import only).
- Faction-specific home systems instead of a generic "HOME" slot.

## Running it

No build step — it's a static site. Either:

- Open `index.html` directly in a browser, or
- Serve the folder locally, e.g. `python3 -m http.server` from this
  directory and visit `http://localhost:8000`.

## Tile data

`data/tiles-data.js` is a **starter data set** — most resource/influence
numbers and system names are placeholders, not pulled from the physical
game. The general mechanics (Mecatol Rex is 1 resource / 6 influence,
the wormhole types Alpha/Beta/Gamma/Delta, and the anomaly types
Nebula/Supernova/Asteroid Field/Gravity Rift) are accurate, but the
per-tile specifics should be checked against your own tile set.

To fix this up, open `data/tiles-data.js` and edit the `NAMED_BLUE_TILES`
and `RED_TILES` arrays — each entry is just a tile number and a list of
planets with `resources`, `influence`, `trait`, and `tech`. Nothing else
in the app needs to change.

## Project structure

```
index.html          Page shell
css/style.css        Styling
data/tiles-data.js   System tile data (edit this to match your set)
js/hexgrid.js        Hex-grid math (axial coordinates → SVG)
js/app.js             Board state, palette, save/load, export
```
