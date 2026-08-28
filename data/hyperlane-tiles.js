/**
 * TI4 Map Generator — hyperlane tile catalog
 * -------------------------------------------------------------
 * Real Prophecy of Kings hyperlane tiles (numbers 83-91, each a
 * double-sided physical tile with an "A" and "B" face). `connections`
 * is a list of [edgeA, edgeB] pairs -- which of a hex's 6 edges (0-5,
 * same numbering as hexPolygonPoints()/hexCorner() in js/hexgrid.js:
 * edge i runs from corner i to corner i+1) that tile's printed lane
 * segments join. A tile can have 1-3 lanes (83A is a single straight
 * lane; 87A/88A are 3-lane hubs, one edge fanning out to three others).
 *
 * Sourced from github.com/heisenbugged/ti4-lab's system data
 * (app/data/rawSystemData.ts), cross-checked against the wiki's Tiles
 * List (twilight-imperium.fandom.com/wiki/Tiles_List, using its a-f
 * edge lettering mapped to 0-5 in printed order) -- the wiki disagreed
 * with ti4-lab on 87A/88A specifically (both are 3-lane hubs off one
 * edge, not the shape ti4-lab's data implied), corrected here to match
 * the wiki. Every other tile's *shape* (lane count and the relative
 * offsets between a tile's lanes) matched between both sources; where
 * the wiki's page didn't have text to check against (89A/90A/91A),
 * ti4-lab's data is kept as-is.
 *
 * drawHyperlaneSlot() in js/app.js places one of these 18 faces (cycled
 * in this array's order across a layout's hyperlane slots) at each
 * hyperlane-designated cell, at its own printed orientation -- not
 * rotated or chosen to match its neighbors. This app never simulates
 * ship-movement adjacency through hyperlanes, so which exact face lands
 * at which position is cosmetic; using this real catalog (instead of a
 * fabricated pattern) is what matters.
 */

const HYPERLANE_TILES = [
  { id: "83A", connections: [[1, 4]] },
  { id: "83B", connections: [[0, 3], [0, 2], [3, 5]] },
  { id: "84A", connections: [[2, 5]] },
  { id: "84B", connections: [[0, 3], [0, 4], [1, 3]] },
  { id: "85A", connections: [[1, 5]] },
  { id: "85B", connections: [[0, 3], [0, 2], [3, 5]] },
  { id: "86A", connections: [[1, 5]] },
  { id: "86B", connections: [[0, 3], [0, 4], [1, 3]] },
  { id: "87A", connections: [[0, 2], [0, 3], [0, 4]] },
  { id: "87B", connections: [[0, 2], [0, 3]] },
  { id: "88A", connections: [[0, 2], [0, 3], [0, 4]] },
  { id: "88B", connections: [[0, 3], [0, 2], [3, 5]] },
  { id: "89A", connections: [[0, 2], [0, 4], [2, 4]] },
  { id: "89B", connections: [[0, 3], [0, 4]] },
  { id: "90A", connections: [[1, 5], [2, 4]] },
  { id: "90B", connections: [[0, 3], [0, 4]] },
  { id: "91A", connections: [[0, 3], [0, 4], [1, 3]] },
  { id: "91B", connections: [[0, 2], [0, 3]] },
];
