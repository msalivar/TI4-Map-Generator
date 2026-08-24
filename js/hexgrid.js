/**
 * Flat-top hex grid math (axial coordinates) sized for a TI4-style
 * board: a center tile (Mecatol Rex) surrounded by concentric rings.
 */

const HEX_SIZE = 62; // px, center to corner

// Axial -> pixel (flat-top hexagons)
function axialToPixel(q, r) {
  const x = HEX_SIZE * (1.5 * q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

function hexCorner(cx, cy, i) {
  const angleDeg = 60 * i; // flat-top: corners at 0,60,120...
  const angleRad = (Math.PI / 180) * angleDeg;
  return [cx + HEX_SIZE * Math.cos(angleRad), cy + HEX_SIZE * Math.sin(angleRad)];
}

function hexPolygonPoints(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push(hexCorner(cx, cy, i));
  return pts.map((p) => p.join(",")).join(" ");
}

/**
 * Generate axial coordinates for a hex "spiral" board with the given
 * number of rings around the center (ring 0 = just the center tile).
 * Returns an array of {q, r, ring, indexInRing}.
 */
function generateHexRings(rings) {
  const cells = [{ q: 0, r: 0, ring: 0, indexInRing: 0 }];
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  for (let ring = 1; ring <= rings; ring++) {
    let q = directions[4].q * ring;
    let r = directions[4].r * ring;
    let idx = 0;
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        cells.push({ q, r, ring, indexInRing: idx++ });
        q += directions[side].q;
        r += directions[side].r;
      }
    }
  }
  return cells;
}

function keyFor(q, r) {
  return `${q},${r}`;
}

// Standard axial hex distance (cube-coordinate distance / 2).
function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

/**
 * Standard 6-player TI4 layout: home systems sit on the 6 corner
 * positions of the outermost ring.
 */
function homeSlotKeys(rings) {
  const cells = generateHexRings(rings);
  const outer = cells.filter((c) => c.ring === rings);
  // Corners of the outer ring are every `ring`-th cell starting at 0.
  const corners = [];
  for (let side = 0; side < 6; side++) {
    corners.push(outer[side * rings]);
  }
  return corners.map((c) => keyFor(c.q, c.r));
}
