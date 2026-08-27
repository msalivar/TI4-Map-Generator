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
