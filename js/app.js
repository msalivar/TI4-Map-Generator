/**
 * TI4 Map Generator — app logic
 */
(function () {
  const RINGS = 3; // standard 6-player-sized board (37 hexes)
  const STORAGE_KEY = "ti4-map-generator-state-v1";

  const cells = generateHexRings(RINGS);
  const homeKeys = new Set(homeSlotKeys(RINGS));
  const keyToCell = new Map(cells.map((c) => [keyFor(c.q, c.r), c]));
  const DRAG_THRESHOLD = 6;

  /** @type {Map<string, object>} key "q,r" -> placed tile object (or undefined) */
  let board = new Map();
  /** pool of tiles not yet placed, keyed by pool-id */
  let pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
  let selectedPoolKey = null;
  let playerNames = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
  const TILE_SETS = [
    { key: "pok", label: "Prophecy of Kings" },
    { key: "thunders-edge", label: "Thunder's Edge" },
    { key: "discordant-stars", label: "Discordant Stars" },
  ];
  let enabledSets = new Set(TILE_SETS.map((s) => s.key));

  const TRAIT_COLORS = { cultural: "#3fa34d", industrial: "#4d7bd1", hazardous: "#d9542f" };
  const WORMHOLE_COLORS = { alpha: "#e0902f", beta: "#3fa34d", gamma: "#c9576f", delta: "#7a6fd0", epsilon: "#4d7bd1" };
  const WORMHOLE_SYMBOLS = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε" };
  const WORMHOLE_ICON_SLOTS = [
    { dx: 50, dy: 0 },
    { dx: -50, dy: 0 },
  ];
  const PIXEL_CELL = 2;
  const PIXEL_COLS = 68;
  const PIXEL_ROWS = 60;

  function poolKey(tile) {
    return `${tile.set}-${tile.back}-${tile.id}`;
  }

  function visiblePoolTiles() {
    return [...pool.values()].filter((t) => t.set === "base" || enabledSets.has(t.set));
  }

  function renderTileSetToggles() {
    tileSetsEl.innerHTML = "";
    TILE_SETS.forEach((s) => {
      const label = document.createElement("label");
      label.className = "tile-set-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = enabledSets.has(s.key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) enabledSets.add(s.key);
        else enabledSets.delete(s.key);
        persist();
        renderAll();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + s.label));
      tileSetsEl.appendChild(label);
    });
  }

  const svg = document.getElementById("board-svg");
  const paletteBlue = document.getElementById("palette-blue");
  const paletteRed = document.getElementById("palette-red");
  const tooltip = document.getElementById("tile-tooltip");
  const tileSetsEl = document.getElementById("tile-sets");
  const randomizeModal = document.getElementById("randomize-modal");
  const optBlueCount = document.getElementById("opt-blue-count");
  const blueCountLabel = document.getElementById("blue-count-label");
  const optWormholes = document.getElementById("opt-wormholes");
  const optEntropic = document.getElementById("opt-entropic");
  const optLegendary = document.getElementById("opt-legendary");

  const BLUE_PER_PLAYER = 3; // matches the "Recommended: 3 blue / 2 red per player" hint in index.html
  const MAX_WORMHOLES = 8;
  const MAX_ENTROPIC_SCAR = 2;

  function computeViewBox() {
    const pts = cells.map((c) => axialToPixel(c.q, c.r));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = HEX_SIZE * 1.3;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function renderBoard() {
    svg.innerHTML = "";
    const vb = computeViewBox();
    svg.setAttribute("viewBox", `${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`);

    const defs = svgEl("defs", {});
    const clipPath = svgEl("clipPath", { id: "hex-clip" });
    clipPath.appendChild(svgEl("polygon", { points: hexPolygonPoints(0, 0) }));
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    cells.forEach((c) => {
      const key = keyFor(c.q, c.r);
      const { x, y } = axialToPixel(c.q, c.r);
      const g = svgEl("g", { class: "hex-group" });

      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key);
      } else if (board.has(key)) {
        const tile = board.get(key);
        drawTile(g, x, y, tile, tile.back, key, true);
      } else {
        drawEmpty(g, x, y, key);
      }
      svg.appendChild(g);
    });
  }

  function drawEmpty(g, x, y, key) {
    const poly = svgEl("polygon", {
      points: hexPolygonPoints(x, y),
      class: "hex empty" + (selectedPoolKey ? " placeable" : ""),
      "data-key": key,
    });
    poly.addEventListener("click", () => onEmptyClick(key));
    g.appendChild(poly);
  }

  function drawHomeSlot(g, x, y, key) {
    const idx = [...homeKeys].indexOf(key);
    const poly = svgEl("polygon", { points: hexPolygonPoints(x, y), class: "hex home", "data-key": key });
    g.appendChild(poly);
    const label = svgEl("text", { x, y: y - 4, class: "hex-label" });
    label.textContent = "HOME";
    g.appendChild(label);
    const sub = svgEl("text", { x, y: y + 12, class: "hex-sublabel" });
    sub.textContent = playerNames[idx] || `Player ${idx + 1}`;
    g.appendChild(sub);
  }

  function drawTile(g, x, y, tile, backClass, key, removable) {
    const isAnomaly = tile.anomalies.length > 0;
    const poly = svgEl("polygon", {
      points: hexPolygonPoints(x, y),
      class: `hex ${backClass}` + (isAnomaly ? " anomaly-tile" : ""),
      "data-key": key,
    });
    if (removable) {
      poly.addEventListener("click", () => onFilledClick(key));
      poly.addEventListener("pointerdown", (e) => startTileDrag(e, poly, key));
    }
    poly.addEventListener("mousemove", (e) => showTooltip(e, tile));
    poly.addEventListener("mouseleave", hideTooltip);
    g.appendChild(poly);

    if (isAnomaly) drawAnomalyBackground(g, x, y, tile.anomalies);

    const num = svgEl("text", { x, y: y - 40, class: "hex-label hex-id-label" });
    num.textContent = tile.type === "mecatol" ? "Mecatol Rex" : `#${tile.id}`;
    g.appendChild(num);

    if (tile.planets.length) {
      drawPlanetCluster(g, x, y, tile.planets);
    }

    tile.wormholes.forEach((w, i) => {
      const slot = WORMHOLE_ICON_SLOTS[i] || WORMHOLE_ICON_SLOTS[WORMHOLE_ICON_SLOTS.length - 1];
      drawWormholeIcon(g, x + slot.dx, y + slot.dy, w);
    });
  }

  const LEGENDARY_SCALE = 1.25;

  const TRIANGLE_SLOTS = [
    { dx: 0, dy: -18 },
    { dx: -24, dy: 13 },
    { dx: 24, dy: 13 },
  ];

  function drawPlanetCluster(g, cx, cy, planets) {
    const count = planets.length;
    if (count === 3) {
      planets.forEach((p, i) => drawPlanet(g, cx + TRIANGLE_SLOTS[i].dx, cy + TRIANGLE_SLOTS[i].dy, 9, p));
      return;
    }
    const spacing = count === 1 ? 0 : 34;
    const radius = count === 1 ? 20 : 15;
    planets.forEach((p, i) => {
      const offset = (i - (count - 1) / 2) * spacing;
      drawPlanet(g, cx + offset, cy, radius, p);
    });
  }

  function drawPlanet(g, cx, cy, baseRadius, planet) {
    // Everything drawn for a planet is purely decorative and sits on top of
    // the hex polygon as a DOM sibling (not a descendant), so without this
    // it would silently swallow the polygon's own hover/click/drag
    // listeners underneath (e.g. tooltips not showing, or a tile becoming
    // impossible to click/drag wherever a circle or image covers it).
    const planetGroup = svgEl("g", { "pointer-events": "none" });
    g.appendChild(planetGroup);

    const r = planet.legendary ? baseRadius * LEGENDARY_SCALE : baseRadius;
    const fill = TRAIT_COLORS[planet.trait] || "#5a6580";
    planetGroup.appendChild(svgEl("circle", {
      cx, cy, r, fill,
      stroke: planet.legendary ? "#ffd76a" : "#0b0e17",
      "stroke-width": planet.legendary ? 2.5 : 1,
    }));

    if (planet.legendary) {
      const badgeSize = r * 0.8;
      planetGroup.appendChild(svgEl("image", {
        href: LEGENDARY_BADGE_DATA_URI,
        x: cx - badgeSize / 2,
        y: cy - r - badgeSize / 2,
        width: badgeSize,
        height: badgeSize,
      }));
    } else if (planet.tech && TECH_ICON_DATA_URIS[planet.tech]) {
      // Centered on the circle's top edge, straddling the boundary, rather
      // than floating above it.
      const iconSize = r * 0.78;
      planetGroup.appendChild(svgEl("image", {
        href: TECH_ICON_DATA_URIS[planet.tech],
        x: cx - iconSize / 2,
        y: cy - r - iconSize / 2,
        width: iconSize,
        height: iconSize,
      }));
    }

    if (planet.station) {
      // A small ringed-station glyph on the lower-right edge of the circle
      // -- no real icon asset for this, so it's an abstract "orbital ring"
      // symbol rather than official artwork.
      const sx = cx + r * 0.72;
      const sy = cy + r * 0.52;
      const ringR = r * 0.24;
      planetGroup.appendChild(svgEl("line", {
        x1: sx - ringR - 3, y1: sy, x2: sx + ringR + 3, y2: sy, stroke: "#d7deee", "stroke-width": 1.4,
      }));
      planetGroup.appendChild(svgEl("circle", { cx: sx, cy: sy, r: ringR, fill: "#232a3d", stroke: "#d7deee", "stroke-width": 1.6 }));
    }

    // Resource (green) and influence (blue) render as large plain numbers
    // directly on the circle. A dark stroke outline (see .planet-number in
    // CSS) keeps them legible regardless of the trait color underneath,
    // instead of relying on a separate badge background.
    const numFontSize = Math.max(13, r * 0.82);
    const numOffsetX = r * 0.42;
    const numY = cy + numFontSize * 0.32;

    const resText = svgEl("text", {
      x: cx - numOffsetX, y: numY, class: "planet-number planet-number-res", "font-size": numFontSize,
    });
    resText.textContent = planet.resources;
    planetGroup.appendChild(resText);

    const infText = svgEl("text", {
      x: cx + numOffsetX, y: numY, class: "planet-number planet-number-inf", "font-size": numFontSize,
    });
    infText.textContent = planet.influence;
    planetGroup.appendChild(infText);

    const boxWidth = Math.max(30, Math.min(r * 3.4, 70));
    const maxChars = Math.max(4, Math.floor((boxWidth - 6) / 3.9));
    const nameLines = wrapPlanetName(planet.name, maxChars);
    const lineHeight = 8;
    const boxHeight = nameLines.length * lineHeight + 3;
    const nameTop = cy + r + 6;
    planetGroup.appendChild(svgEl("rect", {
      x: cx - boxWidth / 2, y: nameTop, width: boxWidth, height: boxHeight, rx: 2,
      fill: "#0b0e17", opacity: 0.82,
    }));
    nameLines.forEach((line, i) => {
      const nameText = svgEl("text", { x: cx, y: nameTop + lineHeight * i + 7, class: "planet-name" });
      nameText.textContent = line;
      planetGroup.appendChild(nameText);
    });
  }

  function drawWormholeIcon(g, x, y, type) {
    const color = WORMHOLE_COLORS[type] || "#9aa4c0";
    const label = svgEl("text", { x, y: y + 4, class: "wormhole-icon-label", fill: color });
    label.textContent = WORMHOLE_SYMBOLS[type] || "?";
    g.appendChild(label);
  }

  // Anomaly backgrounds are drawn as a grid of square "pixels" covering the
  // whole hex, clipped to the hex shape (see the shared #hex-clip def in
  // renderBoard). Each drawer receives a <g> already translated to the
  // tile's center, so it draws in tile-relative (0,0) coordinates.
  function pixelRect(px, py, color, opacity) {
    return svgEl("rect", {
      x: px - PIXEL_CELL / 2, y: py - PIXEL_CELL / 2,
      width: PIXEL_CELL, height: PIXEL_CELL,
      fill: color, opacity: opacity == null ? 1 : opacity,
    });
  }

  function forEachPixelCell(callback) {
    for (let row = 0; row < PIXEL_ROWS; row++) {
      for (let col = 0; col < PIXEL_COLS; col++) {
        const px = (col - (PIXEL_COLS - 1) / 2) * PIXEL_CELL;
        const py = (row - (PIXEL_ROWS - 1) / 2) * PIXEL_CELL;
        callback(px, py, col, row);
      }
    }
  }

  function drawSupernovaPixels(g) {
    forEachPixelCell((px, py) => {
      const dist = Math.hypot(px, py);
      const angle = Math.atan2(py, px);
      const rayBoost = Math.pow(Math.abs(Math.cos(angle * 4)), 10) * 28;
      const edge = 28 + rayBoost;
      if (dist > edge) return;
      const color = dist < 8 ? "#fffbe0" : dist < 16 ? "#ffe066" : dist < 26 ? "#ff9d2e" : "#d6311f";
      g.appendChild(pixelRect(px, py, color, 0.97));
    });
  }

  const ASTEROID_ROCKS = [
    { x: -42, y: -30, r: 14 }, { x: 10, y: -40, r: 16 }, { x: 40, y: -16, r: 12 },
    { x: -18, y: 2, r: 17 }, { x: 24, y: 16, r: 13 }, { x: -46, y: 20, r: 11 },
    { x: 0, y: 38, r: 14 }, { x: 42, y: 34, r: 10 }, { x: -8, y: -10, r: 9 },
  ];

  function drawAsteroidFieldPixels(g) {
    forEachPixelCell((px, py) => {
      for (const rock of ASTEROID_ROCKS) {
        const dx = px - rock.x;
        const dy = py - rock.y;
        const angle = Math.atan2(dy, dx);
        const wobble = Math.sin(angle * 5 + rock.x * 0.3) * 1.6;
        const dist = Math.hypot(dx, dy);
        const edge = rock.r + wobble;
        if (dist > edge) continue;
        const edgeFrac = dist / edge;
        const lit = Math.cos(angle - 0.8) > 0.2;
        const color = edgeFrac > 0.82 ? "#242833" : lit ? "#aeb6c9" : "#5c6577";
        g.appendChild(pixelRect(px, py, color, 0.95));
        return;
      }
    });
  }

  function drawNebulaPixels(g) {
    forEachPixelCell((px, py) => {
      const dist = Math.hypot(px, py);
      if (dist > 66) return;
      const angle = Math.atan2(py, px);
      const swirl1 = Math.sin(angle * 3 + dist * 0.09);
      const swirl2 = Math.sin(angle * 5 - dist * 0.05 + 1.5);
      const turbulence = swirl1 * 0.6 + swirl2 * 0.4;
      const fade = 1 - dist / 66;
      const intensity = turbulence * 0.5 + 0.5;
      if (intensity * fade < 0.18) return;
      const color = intensity > 0.78 ? "#ffe3fb" : intensity > 0.55 ? "#f0a6f0" : intensity > 0.35 ? "#b95fd9" : "#5a3494";
      g.appendChild(pixelRect(px, py, color, Math.min(0.9, 0.35 + fade * 0.5)));
    });
  }

  function drawGravityRiftPixels(g) {
    forEachPixelCell((px, py) => {
      const dist = Math.hypot(px, py);
      if (dist > 46) return;
      const angle = Math.atan2(py, px);
      const spiral = ((angle + dist * 0.16) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2);
      if (dist < 9) {
        g.appendChild(pixelRect(px, py, "#020103", 1));
      } else if (spiral > 1.0 && spiral < 1.45) {
        g.appendChild(pixelRect(px, py, "#d9baff", 0.95));
      } else {
        g.appendChild(pixelRect(px, py, "#120a1e", 0.8));
      }
    });
  }

  // A jagged bolt of "chaotic energy" crossing the tile, plus scattered
  // sparkles, over a dark black/purple base.
  const ENTROPIC_LINE = [
    { x: -62, y: -30 }, { x: -34, y: -8 }, { x: -44, y: 6 }, { x: -10, y: 2 },
    { x: -18, y: 24 }, { x: 20, y: 14 }, { x: 10, y: 38 }, { x: 62, y: 20 },
  ];
  const ENTROPIC_SPARKLES = [
    { x: -30, y: -20 }, { x: 15, y: -35 }, { x: 38, y: -8 }, { x: -45, y: 10 },
    { x: 5, y: 30 }, { x: -12, y: -6 }, { x: 30, y: 22 }, { x: -20, y: 35 },
    { x: 45, y: -25 }, { x: -40, y: -35 }, { x: 0, y: -2 }, { x: 50, y: 4 },
  ];

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function drawEntropicScarPixels(g) {
    forEachPixelCell((px, py) => {
      let lineDist = Infinity;
      for (let i = 0; i < ENTROPIC_LINE.length - 1; i++) {
        const a = ENTROPIC_LINE[i];
        const b = ENTROPIC_LINE[i + 1];
        lineDist = Math.min(lineDist, distToSegment(px, py, a.x, a.y, b.x, b.y));
      }
      if (lineDist < 3) {
        g.appendChild(pixelRect(px, py, "#ffe0ff", 0.98));
        return;
      }
      if (lineDist < 7) {
        g.appendChild(pixelRect(px, py, "#e04dff", 0.85));
        return;
      }
      if (ENTROPIC_SPARKLES.some((s) => Math.hypot(px - s.x, py - s.y) < 2.4)) {
        g.appendChild(pixelRect(px, py, "#f6d9ff", 0.95));
        return;
      }
      const mottle = Math.sin(px * 0.15 + py * 0.11) + Math.cos(px * 0.09 - py * 0.13);
      g.appendChild(pixelRect(px, py, mottle > 0.6 ? "#241333" : "#120819", 0.92));
    });
  }

  const ANOMALY_DRAWERS = {
    supernova: drawSupernovaPixels,
    asteroid: drawAsteroidFieldPixels,
    nebula: drawNebulaPixels,
    rift: drawGravityRiftPixels,
    entropicScar: drawEntropicScarPixels,
  };

  function drawAnomalyBackground(g, x, y, anomalies) {
    // pointer-events: none so hovering the pixel art doesn't block the
    // hex polygon's own mousemove/mouseleave listeners underneath (the art
    // is drawn on top of the polygon, but as a DOM sibling, not a child,
    // so those events wouldn't otherwise reach the polygon's tooltip).
    const wrapper = svgEl("g", {
      transform: `translate(${x},${y})`, "clip-path": "url(#hex-clip)", "pointer-events": "none",
    });
    anomalies.forEach((type) => {
      const drawer = ANOMALY_DRAWERS[type];
      if (drawer) drawer(wrapper);
    });
    g.appendChild(wrapper);
  }

  function wrapPlanetName(name, maxChars) {
    const words = name.split(" ");
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function showTooltip(e, tile) {
    const lines = [tile.type === "mecatol" ? "Mecatol Rex" : `Tile #${tile.id}`];
    tile.planets.forEach((p) => {
      lines.push(`${p.name} — ${p.resources}R / ${p.influence}I${p.trait ? " · " + p.trait : ""}${p.tech ? " · " + p.tech + " tech" : ""}${p.station ? " · space station" : ""}`);
    });
    tile.wormholes.forEach((w) => lines.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => lines.push(ANOMALY_LABELS[a] || a));
    tooltip.textContent = lines.join("\n");
    tooltip.style.whiteSpace = "pre-line";
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
    tooltip.classList.remove("hidden");
  }
  function hideTooltip() {
    tooltip.classList.add("hidden");
  }

  function onEmptyClick(key) {
    if (!selectedPoolKey) return;
    const tile = pool.get(selectedPoolKey);
    if (!tile) return;
    pool.delete(selectedPoolKey);
    board.set(key, tile);
    selectedPoolKey = null;
    persist();
    renderAll();
  }

  function onFilledClick(key) {
    const tile = board.get(key);
    if (!tile) return;
    board.delete(key);
    pool.set(poolKey(tile), tile);
    persist();
    renderAll();
  }

  function isValidDropTarget(targetKey, sourceKey) {
    if (!targetKey || targetKey === sourceKey) return false;
    if (homeKeys.has(targetKey)) return false;
    const cell = keyToCell.get(targetKey);
    if (!cell || cell.ring === 0) return false;
    return true;
  }

  function moveOrSwapTile(sourceKey, targetKey) {
    const sourceTile = board.get(sourceKey);
    if (!sourceTile) return;
    const targetTile = board.get(targetKey);
    board.set(targetKey, sourceTile);
    if (targetTile) board.set(sourceKey, targetTile);
    else board.delete(sourceKey);
    selectedPoolKey = null;
    persist();
    renderAll();
  }

  function startTileDrag(e, poly, key) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let targetPoly = null;

    function clearTargetHighlight() {
      if (targetPoly) {
        targetPoly.classList.remove("drop-target", "drop-invalid");
        targetPoly = null;
      }
    }

    function onMove(ev) {
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        svg.classList.add("dragging");
        poly.classList.add("drag-source");
        hideTooltip();
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const hex = el && el.closest(".hex");
      if (hex !== targetPoly) {
        clearTargetHighlight();
        targetPoly = hex || null;
        if (targetPoly) {
          const valid = isValidDropTarget(targetPoly.dataset.key, key);
          targetPoly.classList.add(valid ? "drop-target" : "drop-invalid");
        }
      }
    }

    function onUp(ev) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (dragging) {
        svg.classList.remove("dragging");
        poly.classList.remove("drag-source");
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const hex = el && el.closest(".hex");
        clearTargetHighlight();
        const targetKey = hex && hex.dataset.key;
        if (isValidDropTarget(targetKey, key)) moveOrSwapTile(key, targetKey);
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  }

  function renderPalette() {
    paletteBlue.innerHTML = "";
    paletteRed.innerHTML = "";
    visiblePoolTiles()
      .sort((a, b) => a.id - b.id)
      .forEach((tile) => {
        const div = document.createElement("div");
        div.className = "palette-tile" + (tile.back === "red" ? " red" : "") + (poolKey(tile) === selectedPoolKey ? " selected" : "");
        div.innerHTML = `<div class="tnum">#${tile.id}</div><div>${tile.planets.length || "—"}</div>`;
        div.title = tooltipText(tile);
        div.addEventListener("click", () => {
          selectedPoolKey = poolKey(tile) === selectedPoolKey ? null : poolKey(tile);
          renderAll();
        });
        (tile.back === "red" ? paletteRed : paletteBlue).appendChild(div);
      });
  }

  function tooltipText(tile) {
    const parts = [`Tile #${tile.id}`];
    tile.planets.forEach((p) => parts.push(`${p.name} ${p.resources}/${p.influence}${p.station ? " (Station)" : ""}`));
    tile.wormholes.forEach((w) => parts.push(WORMHOLE_LABELS[w]));
    tile.anomalies.forEach((a) => parts.push(ANOMALY_LABELS[a]));
    return parts.join(" | ");
  }

  function renderAll() {
    renderBoard();
    renderPalette();
  }

  function updateBlueCountLabel() {
    const n = emptySlotKeys().length;
    const blue = Number(optBlueCount.value) || 0;
    const red = Math.max(0, n - blue);
    blueCountLabel.textContent = `${blue} blue / ${red} red`;
  }

  function populateSelectRange(select, max) {
    const current = Math.max(0, Math.min(Number(select.value) || 0, max));
    select.innerHTML = "";
    for (let i = 0; i <= max; i++) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = String(i);
      select.appendChild(option);
    }
    select.value = String(current);
  }

  function openRandomizeModal() {
    updateRandomizeBounds();
    randomizeModal.classList.remove("hidden");
  }

  function closeRandomizeModal() {
    randomizeModal.classList.add("hidden");
  }

  function emptySlotKeys() {
    return cells
      .filter((c) => c.ring > 0 && !homeKeys.has(keyFor(c.q, c.r)) && !board.has(keyFor(c.q, c.r)))
      .map((c) => keyFor(c.q, c.r));
  }

  function updateRandomizeBounds() {
    const available = visiblePoolTiles();
    const n = emptySlotKeys().length;

    const wormholeAvail = available.filter((t) => t.wormholes.length > 0).length;
    const entropicAvail = available.filter((t) => t.anomalies.includes("entropicScar")).length;
    const legendaryAvail = available.filter((t) => t.planets.some((p) => p.legendary)).length;

    populateSelectRange(optWormholes, Math.min(wormholeAvail, MAX_WORMHOLES, n));
    populateSelectRange(optEntropic, Math.min(entropicAvail, MAX_ENTROPIC_SCAR, n));
    populateSelectRange(optLegendary, Math.min(legendaryAvail, n));

    optBlueCount.max = String(n);
    if (!optBlueCount.dataset.touched) {
      optBlueCount.value = String(Math.min(BLUE_PER_PLAYER * playerNames.length, n));
    } else {
      optBlueCount.value = String(Math.min(Number(optBlueCount.value) || 0, n));
    }
    updateBlueCountLabel();
  }

  function randomizeWithOptions(opts) {
    const emptyKeys = shuffle(emptySlotKeys());
    const n = emptyKeys.length;

    const available = visiblePoolTiles();
    const used = new Set();
    const selected = [];

    function takeRandom(candidates, count) {
      const pickable = shuffle(candidates.filter((t) => !used.has(poolKey(t))));
      const take = pickable.slice(0, Math.max(0, Math.min(count, n - selected.length)));
      take.forEach((t) => {
        used.add(poolKey(t));
        selected.push(t);
      });
    }

    // Priority order matters: a tile matching more than one category (e.g.
    // legendary and wormhole) is claimed by whichever category runs first
    // and is then unavailable to a later one, even if that later count was
    // reported as achievable by updateRandomizeBounds (which counts each
    // category independently). No current tile is in more than one of
    // these categories, but a future tile set could change that.
    takeRandom(available.filter((t) => t.planets.some((p) => p.legendary)), opts.legendaryMin);
    takeRandom(available.filter((t) => t.anomalies.includes("entropicScar")), opts.entropicScarCount);
    takeRandom(available.filter((t) => t.wormholes.length > 0), opts.wormholeCount);

    // blueCount/redCount are targets for the WHOLE fill (including tiles
    // already claimed above by the forced picks), not just for what's left
    // — so a blue tile picked as e.g. a wormhole counts against blueCount.
    const blueSoFar = selected.filter((t) => t.back === "blue").length;
    const redSoFar = selected.filter((t) => t.back === "red").length;
    const blueNeeded = Math.max(0, opts.blueCount - blueSoFar);
    const redNeeded = Math.max(0, opts.redCount - redSoFar);

    // Legendary minimum, Entropic Scar count, and wormhole count are all
    // minimums, not exact targets — so the ratio-fill below is free to pick
    // up extra tiles of those kinds too. Nothing needs excluding here.
    const rest = shuffle(available.filter((t) => !used.has(poolKey(t))));
    const blues = rest.filter((t) => t.back === "blue");
    const reds = rest.filter((t) => t.back === "red");
    const takeBlue = Math.min(blueNeeded, blues.length);
    const takeRed = Math.min(redNeeded, reds.length);
    selected.push(...blues.slice(0, takeBlue), ...reds.slice(0, takeRed));

    const remaining = n - selected.length;
    if (remaining > 0) {
      const usedNow = new Set(selected.map(poolKey));
      const leftover = rest.filter((t) => !usedNow.has(poolKey(t))).slice(0, remaining);
      selected.push(...leftover);
    }

    shuffle(selected);
    emptyKeys.forEach((key, i) => {
      const tile = selected[i];
      if (!tile) return;
      pool.delete(poolKey(tile));
      board.set(key, tile);
    });

    selectedPoolKey = null;
    persist();
    renderAll();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function clearBoard() {
    board.forEach((tile) => pool.set(poolKey(tile), tile));
    board = new Map();
    selectedPoolKey = null;
    persist();
    renderAll();
  }

  function serialize() {
    return {
      version: 1,
      rings: RINGS,
      playerNames,
      enabledSets: [...enabledSets],
      placements: [...board.entries()].map(([key, tile]) => ({ key, tileId: tile.id, back: tile.back, name: tile.name })),
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (e) {
      /* localStorage may be unavailable — ignore */
    }
  }

  function loadFromObject(data) {
    if (!data || !Array.isArray(data.placements)) return;
    pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
    board = new Map();
    if (Array.isArray(data.playerNames)) playerNames = data.playerNames;
    if (Array.isArray(data.enabledSets)) enabledSets = new Set(data.enabledSets);
    data.placements.forEach((p) => {
      const match = [...pool.values()].find((t) => t.id === p.tileId && t.back === p.back && t.name === p.name);
      if (match) {
        pool.delete(poolKey(match));
        board.set(p.key, match);
      }
    });
    selectedPoolKey = null;
    renderTileSetToggles();
    renderAll();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ti4-map.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // The board's colors/fonts come from css/style.css via class names.
  // A cloned SVG rendered outside the document (as a standalone image)
  // has no access to that stylesheet, so we inline the relevant rules
  // directly into the exported SVG.
  const EXPORT_STYLE = `
    .hex { stroke-width: 2; }
    .hex.empty { fill: #171d2c; stroke: #2a3350; }
    .hex.blue { fill: #24406e; stroke: #4d7bd1; }
    .hex.red { fill: #5a2733; stroke: #c9576f; }
    .hex.home { fill: #2e3a2a; stroke: #7fae5a; }
    .hex.mecatol { fill: #4a3a1a; stroke: #ffb347; }
    .hex.anomaly-tile { stroke: #ff5566; stroke-dasharray: 5 3; stroke-width: 2.5; }
    .hex-label { fill: #e8ecf7; font-size: 11px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .hex-id-label { font-size: 8px; opacity: 0.7; }
    .hex-sublabel { fill: #9aa4c0; font-size: 9px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .planet-number { font-weight: 800; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; paint-order: stroke fill; stroke: #0b0e17; stroke-width: 2.5px; stroke-linejoin: round; }
    .planet-number-res { fill: #6fdc8c; }
    .planet-number-inf { fill: #7fb3ff; }
    .planet-name { fill: #9aa4c0; font-size: 6.5px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .wormhole-icon-label { font-size: 15px; font-weight: 800; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; paint-order: stroke fill; stroke: #0b0e17; stroke-width: 2.5px; stroke-linejoin: round; }
  `;

  function exportPng() {
    const serializer = new XMLSerializer();
    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = EXPORT_STYLE;
    svgClone.insertBefore(styleEl, svgClone.firstChild);
    // Inline a background so the exported PNG isn't transparent.
    const bg = svgEl("rect", {
      x: svg.getAttribute("viewBox").split(" ")[0],
      y: svg.getAttribute("viewBox").split(" ")[1],
      width: svg.getAttribute("viewBox").split(" ")[2],
      height: svg.getAttribute("viewBox").split(" ")[3],
      fill: "#060810",
    });
    svgClone.insertBefore(bg, svgClone.firstChild);
    const svgStr = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "ti4-map.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
    };
    img.src = url;
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        loadFromObject(data);
        persist();
      } catch (e) {
        alert("Could not read that file — is it a valid TI4 Map Generator JSON export?");
      }
    };
    reader.readAsText(file);
  }

  function init() {
    document.getElementById("btn-randomize").addEventListener("click", openRandomizeModal);
    document.getElementById("btn-randomize-cancel").addEventListener("click", closeRandomizeModal);
    document.getElementById("btn-randomize-apply").addEventListener("click", () => {
      const n = emptySlotKeys().length;
      const blueCount = Number(optBlueCount.value);
      randomizeWithOptions({
        blueCount,
        redCount: Math.max(0, n - blueCount),
        wormholeCount: Number(optWormholes.value),
        entropicScarCount: Number(optEntropic.value),
        legendaryMin: Number(optLegendary.value),
      });
      closeRandomizeModal();
    });
    optBlueCount.addEventListener("input", () => {
      optBlueCount.dataset.touched = "1";
      updateBlueCountLabel();
    });
    const layoutEl = document.querySelector(".layout");
    const btnTogglePalette = document.getElementById("btn-toggle-palette");
    btnTogglePalette.addEventListener("click", () => {
      const collapsed = layoutEl.classList.toggle("palette-collapsed");
      btnTogglePalette.textContent = collapsed ? "⮜" : "⮞";
      btnTogglePalette.title = collapsed ? "Expand tile selector" : "Collapse tile selector";
    });

    document.getElementById("btn-clear").addEventListener("click", clearBoard);
    document.getElementById("btn-export-png").addEventListener("click", exportPng);
    document.getElementById("btn-export-json").addEventListener("click", exportJson);
    document.getElementById("input-import-json").addEventListener("change", (e) => {
      if (e.target.files[0]) importJsonFile(e.target.files[0]);
      e.target.value = "";
    });

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
      renderAll();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
