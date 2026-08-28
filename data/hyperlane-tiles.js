/**
 * TI4 Map Generator — hyperlane tile catalog
 * -------------------------------------------------------------
 * Real Prophecy of Kings hyperlane tiles (numbers 83-91, each a
 * double-sided physical tile with an "A" and "B" face). `connections`
 * is a list of [edgeA, edgeB] pairs -- which of a hex's 6 edges (0-5,
 * same numbering as hexPolygonPoints()/hexCorner() in js/hexgrid.js:
 * edge i runs from corner i to corner i+1) that tile's printed lane
 * segments join. Sourced from github.com/heisenbugged/ti4-lab's system
 * data (app/data/rawSystemData.ts), cross-checked against this app's
 * own edge numbering.
 *
 * This app only ever needs a single-lane (one [edgeA, edgeB] pair)
 * tile at any hyperlane slot -- see drawHyperlaneSlot() in js/app.js,
 * which picks whichever of these four single-lane faces (83A/84A:
 * opposite edges, a straight lane; 85A/86A: edges two apart, a bent
 * lane) matches the connection shape a given position needs, then
 * rotates its connection to align. The full 9-tile/18-face catalog is
 * kept here anyway since it's the complete real component list, even
 * though this app doesn't currently render the multi-lane B faces.
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
  { id: "87A", connections: [[0, 2], [2, 4], [2, 5]] },
  { id: "87B", connections: [[0, 2], [0, 3]] },
  { id: "88A", connections: [[0, 4], [1, 4], [2, 4]] },
  { id: "88B", connections: [[0, 3], [0, 2], [3, 5]] },
  { id: "89A", connections: [[0, 2], [0, 4], [2, 4]] },
  { id: "89B", connections: [[0, 3], [0, 4]] },
  { id: "90A", connections: [[1, 5], [2, 4]] },
  { id: "90B", connections: [[0, 3], [0, 4]] },
  { id: "91A", connections: [[0, 3], [0, 4], [1, 3]] },
  { id: "91B", connections: [[0, 2], [0, 3]] },
];

// The two straight-lane (opposite-edge) faces and the two bent-lane
// (edges-two-apart) faces -- the only shapes this app's hyperlane
// slots ever need (see the module comment above).
const HYPERLANE_STRAIGHT_TILES = HYPERLANE_TILES.filter((t) => ["83A", "84A"].includes(t.id));
const HYPERLANE_BENT_TILES = HYPERLANE_TILES.filter((t) => ["85A", "86A"].includes(t.id));
