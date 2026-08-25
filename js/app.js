/**
 * TI4 Map Generator — app logic
 */
(function () {
  const RINGS = 3; // standard 6-player-sized board (37 hexes)
  const STORAGE_KEY = "ti4-map-generator-state-v1";

  const cells = generateHexRings(RINGS);
  const mapStringCells = generateMapStringOrder(RINGS);
  const homeKeys = new Set(homeSlotKeys(RINGS));
  const keyToCell = new Map(cells.map((c) => [keyFor(c.q, c.r), c]));
  const DRAG_THRESHOLD = 6;

  /** @type {Map<string, object>} key "q,r" -> placed tile object (or undefined) */
  let board = new Map();
  /** pool of tiles not yet placed, keyed by pool-id */
  let pool = new Map(TILE_POOL.map((t) => [poolKey(t), t]));
  let selectedPoolKey = null;
  /** keys of board tiles the user has locked against click-remove/drag/shuffle */
  let lockedKeys = new Set();
  let playerNames = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"];
  const TILE_SETS = [
    { key: "pok", label: "Prophecy of Kings" },
    { key: "thunders-edge", label: "Thunder's Edge" },
    { key: "discordant-stars", label: "Discordant Stars" },
  ];
  let enabledSets = new Set(TILE_SETS.map((s) => s.key));

  const TRAIT_COLORS = { cultural: "#4d7bd1", industrial: "#3fa34d", hazardous: "#d9542f" };
  const TECH_SWATCH_COLORS = { warfare: "#e0524f", propulsion: "#4d7bd1", biotic: "#3fa34d", cybernetic: "#e0b93f" };
  // Order controls how repeated tech-skip letters group on a home tile
  // (e.g. two Biotic + one Cybernetic renders "GGY", not interleaved).
  const TECH_ORDER = ["propulsion", "biotic", "cybernetic", "warfare"];
  const TECH_LETTERS = { propulsion: "B", biotic: "G", cybernetic: "Y", warfare: "R" };

  function orderedTechTypes(techTypes) {
    return TECH_ORDER.flatMap((type) => techTypes.filter((t) => t === type));
  }

  function techLettersFor(techTypes) {
    return orderedTechTypes(techTypes).map((type) => TECH_LETTERS[type]).join("");
  }

  function formatScore(n) {
    const rounded = Math.round(n * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }
  const WORMHOLE_COLORS = { alpha: "#e0902f", beta: "#3fa34d", gamma: "#c9576f", delta: "#7a6fd0", epsilon: "#4d7bd1" };
  const WORMHOLE_SYMBOLS = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε" };
  const WORMHOLE_ICON_SLOTS = [
    { dx: 42, dy: 0 },
    { dx: -42, dy: 0 },
  ];
  // Tiles with a wormhole but no planet have nothing else claiming the
  // tile's center, so the icon(s) sit there instead of out at the side.
  const WORMHOLE_ICON_SLOTS_CENTERED = [
    { dx: -14, dy: 0 },
    { dx: 14, dy: 0 },
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

  // Palette-only display filters (don't affect Randomize or which tile
  // sets are enabled -- purely narrows what's shown in the tile picker).
  // trait/tech/planetCount are multi-select (OR within the category);
  // wormhole/station/legendary are single on/off toggles. A category
  // with nothing selected imposes no constraint.
  const filterState = {
    trait: new Set(),
    tech: new Set(),
    wormhole: false,
    station: false,
    legendary: false,
    planetCount: new Set(),
  };

  function tileMatchesFilters(tile) {
    // Every checked box (within a category and across categories) must be
    // satisfied -- e.g. checking both Cultural and Industrial only shows
    // tiles that have a planet of each, not tiles with either.
    if (filterState.trait.size) {
      const tileTraits = new Set(tile.planets.flatMap((p) => p.traits));
      for (const t of filterState.trait) { if (!tileTraits.has(t)) return false; }
    }
    if (filterState.tech.size) {
      const tileTechs = new Set(tile.planets.flatMap((p) => p.techs));
      for (const t of filterState.tech) { if (!tileTechs.has(t)) return false; }
    }
    if (filterState.wormhole && tile.wormholes.length === 0) return false;
    if (filterState.station && !tile.planets.some((p) => p.station)) return false;
    if (filterState.legendary && !tile.planets.some((p) => p.legendary)) return false;
    if (filterState.planetCount.size && !filterState.planetCount.has(tile.planets.length)) return false;
    return true;
  }

  function renderTileSetToggles() {
    [tileSetsEl, tileSetsModalEl].forEach((container) => {
      if (!container) return;
      container.innerHTML = "";
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
          renderTileSetToggles();
          if (!randomizeModal.classList.contains("hidden")) updateRandomizeBounds();
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + s.label));
        container.appendChild(label);
      });
    });
  }

  const svg = document.getElementById("board-svg");
  const paletteBlue = document.getElementById("palette-blue");
  const paletteRed = document.getElementById("palette-red");
  const tooltip = document.getElementById("tile-tooltip");
  const tileSetsEl = document.getElementById("tile-sets");
  const tileSetsModalEl = document.getElementById("tile-sets-modal");
  const randomizeErrorEl = document.getElementById("randomize-error");
  const boardStatsEl = document.getElementById("board-stats");
  const sliceBalanceEl = document.getElementById("slice-balance");
  const randomizeModal = document.getElementById("randomize-modal");
  const optBlueCount = document.getElementById("opt-blue-count");
  const blueCountLabel = document.getElementById("blue-count-label");
  const optWormholes = document.getElementById("opt-wormholes");
  const optEntropic = document.getElementById("opt-entropic");
  const optLegendary = document.getElementById("opt-legendary");
  const optTechSkip = document.getElementById("opt-tech-skip");
  const optMaxTraitGap = document.getElementById("opt-max-trait-gap");
  const traitGapLabel = document.getElementById("trait-gap-label");
  const optAvoidAdjacentAnomalies = document.getElementById("opt-avoid-adjacent-anomalies");

  const BLUE_PER_PLAYER = 3; // matches the "Recommended: 3 blue / 2 red per player" hint in index.html
  const MAX_WORMHOLES = 8;
  const MAX_ENTROPIC_SCAR = 2;
  const MAX_TECH_SKIP = 15;

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

    const homeSlices = computeHomeSlices(board, homeKeys, RINGS);

    cells.forEach((c) => {
      const key = keyFor(c.q, c.r);
      const { x, y } = axialToPixel(c.q, c.r);
      const g = svgEl("g", { class: "hex-group" });

      if (c.ring === 0) {
        drawTile(g, x, y, MECATOL_REX, "mecatol", key, false);
      } else if (homeKeys.has(key)) {
        drawHomeSlot(g, x, y, key, homeSlices.get(key));
      } else if (board.has(key)) {
        const tile = board.get(key);
        drawTile(g, x, y, tile, tile.back, key, true);
      } else {
        drawEmpty(g, x, y, key);
      }
      svg.appendChild(g);
    });

    // Adjacent hexes share an edge, and whichever one is drawn later in the
    // loop above paints over that shared edge. Every tile now uses the
    // same border color (see .hex in style.css), so that no longer causes
    // any visible inconsistency -- except for locked tiles, which are
    // deliberately a different color (red) and would otherwise get partly
    // covered by whichever neighbor is drawn afterward. Redrawing a
    // locked tile's outline again here, as the very last things appended
    // to the <svg>, guarantees it paints on top of every neighbor.
    lockedKeys.forEach((key) => {
      if (!board.has(key)) return;
      const cell = keyToCell.get(key);
      if (!cell) return;
      const { x, y } = axialToPixel(cell.q, cell.r);
      svg.appendChild(svgEl("polygon", {
        points: hexPolygonPoints(x, y),
        class: "hex-lock-outline",
        "pointer-events": "none",
      }));
    });

    renderBoardStats();
    renderSliceBalance(homeSlices);
  }

  function renderSliceBalance(homeSlices) {
    const entries = [...homeSlices.entries()].map(([key, breakdown]) => ({
      name: playerNameForHomeKey(key),
      total: breakdown.total,
    }));
    if (!entries.length) {
      sliceBalanceEl.innerHTML = "";
      return;
    }
    const highest = entries.reduce((a, b) => (b.total > a.total ? b : a));
    const lowest = entries.reduce((a, b) => (b.total < a.total ? b : a));
    const gap = highest.total - lowest.total;
    sliceBalanceEl.innerHTML = `
      <div class="stats-heading">Slice Balance</div>
      <div>Gap: <span class="stats-num">${formatScore(gap)}</span></div>
      <div>Highest: ${highest.name} (${formatScore(highest.total)})</div>
      <div>Lowest: ${lowest.name} (${formatScore(lowest.total)})</div>
    `;
  }

  // Shared with the randomizer's trait-balance option, so both the
  // overlay and the randomizer agree on what "planet trait counts" means.
  function computeTraitCounts(tiles) {
    const traitCounts = { cultural: 0, industrial: 0, hazardous: 0 };
    tiles.forEach((tile) => {
      tile.planets.forEach((p) => {
        // A dual-trait planet counts toward both trait buckets (matches the
        // real rule: it counts as having both traits for objective scoring).
        p.traits.forEach((t) => { if (traitCounts[t] !== undefined) traitCounts[t]++; });
      });
    });
    return traitCounts;
  }

  function traitCountGap(traitCounts) {
    const values = Object.values(traitCounts);
    return Math.max(...values) - Math.min(...values);
  }

  function renderBoardStats() {
    const allTiles = [MECATOL_REX, ...board.values()];
    let blueCount = 0;
    let redCount = 0;
    let resources = 0;
    let influence = 0;
    let legendaryCount = 0;
    const techCounts = { warfare: 0, propulsion: 0, biotic: 0, cybernetic: 0 };

    allTiles.forEach((tile) => {
      if (tile.back === "blue") blueCount++;
      else if (tile.back === "red") redCount++;
      tile.planets.forEach((p) => {
        resources += p.resources;
        influence += p.influence;
        p.techs.forEach((t) => { if (techCounts[t] !== undefined) techCounts[t]++; });
        if (p.legendary) legendaryCount++;
      });
    });
    const traitCounts = computeTraitCounts(allTiles);

    function swatch(color) {
      return color ? `<span class="stats-swatch" style="background:${color}"></span>` : "";
    }
    function item(color, value, label) {
      return `<div class="stats-item">${swatch(color)}<span class="stats-num">${value}</span> ${label}</div>`;
    }
    const TECH_LABELS = { warfare: "Warfare", propulsion: "Propulsion", biotic: "Biotic", cybernetic: "Cybernetic" };
    const TRAIT_LABELS = { cultural: "Cultural", industrial: "Industrial", hazardous: "Hazardous" };

    boardStatsEl.innerHTML = `
      <div class="stats-heading">Tiles</div>
      <div class="stats-grid">
        ${item("var(--blue-tile-edge)", blueCount, "Blue")}
        ${item("var(--red-tile-edge)", redCount, "Red")}
      </div>
      <div class="stats-heading">Totals</div>
      <div class="stats-grid">
        ${item(null, resources, "Resources")}
        ${item(null, influence, "Influence")}
        ${item("#ffd76a", legendaryCount, "Legendary")}
      </div>
      <div class="stats-heading">Tech Skips</div>
      <div class="stats-grid">
        ${Object.entries(techCounts).map(([k, v]) => item(TECH_SWATCH_COLORS[k], v, TECH_LABELS[k])).join("")}
      </div>
      <div class="stats-heading">Planet Traits</div>
      <div class="stats-grid">
        ${Object.entries(traitCounts).map(([k, v]) => item(TRAIT_COLORS[k], v, TRAIT_LABELS[k])).join("")}
      </div>
    `;
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

  function playerNameForHomeKey(key) {
    const idx = [...homeKeys].indexOf(key);
    return playerNames[idx] || `Player ${idx + 1}`;
  }

  function drawHomeSlot(g, x, y, key, breakdown) {
    const poly = svgEl("polygon", { points: hexPolygonPoints(x, y), class: "hex home", "data-key": key });
    poly.addEventListener("mousemove", (e) => showHomeTooltip(e, key, breakdown));
    poly.addEventListener("mouseleave", hideTooltip);
    g.appendChild(poly);

    const nameLabel = svgEl("text", { x, y: y - 26, class: "hex-label" });
    nameLabel.textContent = playerNameForHomeKey(key);
    g.appendChild(nameLabel);

    const scoreLabel = svgEl("text", { x, y: y - 8, class: "hex-sublabel" });
    scoreLabel.textContent = `Score: ${formatScore(breakdown.total)}`;
    g.appendChild(scoreLabel);

    const resInfLabel = svgEl("text", { x, y: y + 10, class: "hex-sublabel" });
    const resSpan = svgEl("tspan", { class: "planet-number-res" });
    resSpan.textContent = `${formatScore(breakdown.optimalResources)}R`;
    const infSpan = svgEl("tspan", { class: "planet-number-inf" });
    infSpan.textContent = `${formatScore(breakdown.optimalInfluence)}I`;
    resInfLabel.appendChild(resSpan);
    resInfLabel.appendChild(document.createTextNode(" / "));
    resInfLabel.appendChild(infSpan);
    g.appendChild(resInfLabel);

    // Colored per-letter (matching TECH_SWATCH_COLORS) rather than plain
    // text -- the resources/influence line above already uses "R" for
    // Resources, so an uncolored "R" here (Warfare) would be ambiguous.
    const techTypesOrdered = orderedTechTypes(breakdown.techTypes);
    if (techTypesOrdered.length) {
      const techLabel = svgEl("text", { x, y: y + 28, class: "hex-sublabel" });
      techTypesOrdered.forEach((type) => {
        const letterSpan = svgEl("tspan", { fill: TECH_SWATCH_COLORS[type] });
        letterSpan.textContent = TECH_LETTERS[type];
        techLabel.appendChild(letterSpan);
      });
      g.appendChild(techLabel);
    }
  }

  // Draws everything about a tile's appearance (hex fill, anomaly art, id
  // label, planets, wormholes) with no interactivity attached, so the exact
  // same visual can be reused both for a placed board tile and for its
  // palette swatch. `clipId` must be unique per <svg> the caller draws
  // into, since clip-path ids are looked up document-wide, not per-<svg>.
  function buildTileVisual(g, x, y, tile, backClass, clipId) {
    const isAnomaly = tile.anomalies.length > 0;
    const poly = svgEl("polygon", {
      points: hexPolygonPoints(x, y),
      class: `hex ${backClass}`,
    });
    g.appendChild(poly);

    if (isAnomaly) drawAnomalyBackground(g, x, y, tile.anomalies, clipId);

    const num = svgEl("text", { x, y: y - 40, class: "hex-label hex-id-label" });
    num.textContent = tile.type === "mecatol" ? "Mecatol Rex" : `#${tile.id}`;
    g.appendChild(num);

    if (tile.planets.length) {
      drawPlanetCluster(g, x, y, tile.planets);
    }

    const wormholeSlots = wormholeSlotsFor(tile);
    tile.wormholes.forEach((w, i) => {
      const slot = wormholeSlots[i] || wormholeSlots[wormholeSlots.length - 1];
      drawWormholeIcon(g, x + slot.dx, y + slot.dy, w);
    });

    return poly;
  }

  function drawTile(g, x, y, tile, backClass, key, removable) {
    const poly = buildTileVisual(g, x, y, tile, backClass, "hex-clip");
    poly.setAttribute("data-key", key);
    // Only real placed tiles can be locked -- not Mecatol Rex (removable is
    // false for it) and not the palette swatches (which never call drawTile
    // at all, only the shared buildTileVisual).
    const locked = removable && lockedKeys.has(key);
    if (locked) poly.classList.add("locked");
    if (removable) {
      if (lockToolActive) {
        // While the locking tool is active, a click anywhere on the tile
        // toggles its lock instead of removing it, and dragging is
        // disabled entirely so an accidental drag can't move a tile the
        // user is trying to lock in place.
        poly.addEventListener("click", () => toggleLock(key));
      } else if (!locked) {
        poly.addEventListener("click", () => onFilledClick(key));
        poly.addEventListener("pointerdown", (e) => startTileDrag(e, poly, key));
      }
    }
    poly.addEventListener("mousemove", (e) => showTooltip(e, tile));
    poly.addEventListener("mouseleave", hideTooltip);
  }

  const LEGENDARY_SCALE = 1.25;

  const PLANET_RADIUS = 20;
  // Slightly smaller than PLANET_RADIUS: the triangle's top slot has to
  // clear the tile's own "#id" label directly above it (fixed at y-40),
  // which a full-size circle can't do without the two touching.
  const TRIANGLE_RADIUS = 15;
  const TRIANGLE_SLOTS = [
    { dx: 0, dy: -14 },
    { dx: -30, dy: 10 },
    { dx: 30, dy: 10 },
  ];

  function drawPlanetCluster(g, cx, cy, planets) {
    const count = planets.length;
    if (count === 3) {
      // Name boxes are capped tighter than the single-planet default here
      // since three of them share much less room side-to-side.
      planets.forEach((p, i) => drawPlanet(g, cx + TRIANGLE_SLOTS[i].dx, cy + TRIANGLE_SLOTS[i].dy, TRIANGLE_RADIUS, p, 24));
      return;
    }
    const spacing = count === 1 ? 0 : 48;
    const maxBoxWidth = count === 1 ? undefined : spacing - 6;
    planets.forEach((p, i) => {
      const offset = (i - (count - 1) / 2) * spacing;
      drawPlanet(g, cx + offset, cy, PLANET_RADIUS, p, maxBoxWidth);
    });
  }

  function drawPlanet(g, cx, cy, baseRadius, planet, maxBoxWidth) {
    // Everything drawn for a planet is purely decorative and sits on top of
    // the hex polygon as a DOM sibling (not a descendant), so without this
    // it would silently swallow the polygon's own hover/click/drag
    // listeners underneath (e.g. tooltips not showing, or a tile becoming
    // impossible to click/drag wherever a circle or image covers it).
    const planetGroup = svgEl("g", { "pointer-events": "none" });
    g.appendChild(planetGroup);

    const r = planet.legendary ? baseRadius * LEGENDARY_SCALE : baseRadius;
    // A dual-trait planet (Thunder's Edge) splits the circle into two
    // color wedges instead of picking one -- the outline is drawn as a
    // separate final circle (below) so the split doesn't cover it.
    const traitFill = (t) => TRAIT_COLORS[t] || "#5a6580";
    planetGroup.appendChild(svgEl("circle", { cx, cy, r, fill: traitFill(planet.traits[0]) }));
    if (planet.traits.length > 1) {
      planetGroup.appendChild(svgEl("path", {
        d: `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`,
        fill: traitFill(planet.traits[1]),
      }));
    }
    planetGroup.appendChild(svgEl("circle", {
      cx, cy, r, fill: "none",
      stroke: planet.legendary ? "#ffd76a" : "#0b0e17",
      "stroke-width": planet.legendary ? 2.5 : 1,
    }));

    // Legendary badge and tech-skip icon(s) share the circle's top edge.
    // Most planets need at most one of these, but some legendary planets
    // also carry a tech specialty, and Thunder's Edge has dual-tech
    // planets (with no real tile needing all three at once) -- lay out
    // however many items are actually present instead of hardcoding pairs.
    const techIconHrefs = planet.techs.map((t) => TECH_ICON_DATA_URIS[t]).filter(Boolean);
    const topItems = [];
    if (planet.legendary) topItems.push(LEGENDARY_BADGE_DATA_URI);
    topItems.push(...techIconHrefs);

    if (topItems.length === 1) {
      const size = r * (topItems[0] === LEGENDARY_BADGE_DATA_URI ? 0.8 : 0.78);
      planetGroup.appendChild(svgEl("image", {
        href: topItems[0], x: cx - size / 2, y: cy - r - size / 2, width: size, height: size,
      }));
    } else if (topItems.length === 2) {
      const size = r * 0.6;
      const offsetX = r * 0.44;
      topItems.forEach((href, i) => {
        const x = cx + (i === 0 ? -offsetX : offsetX);
        planetGroup.appendChild(svgEl("image", { href, x: x - size / 2, y: cy - r - size / 2, width: size, height: size }));
      });
    } else if (topItems.length === 3) {
      const size = r * 0.5;
      const offsetX = r * 0.6;
      const xs = [cx - offsetX, cx, cx + offsetX];
      topItems.forEach((href, i) => {
        planetGroup.appendChild(svgEl("image", { href, x: xs[i] - size / 2, y: cy - r - size / 2, width: size, height: size }));
      });
    }

    if (planet.station) {
      // A small ringed-station glyph on the upper-left of the circle --
      // no real icon asset for this, so it's an abstract "orbital ring"
      // symbol rather than official artwork. The resource number's own
      // bounding box (stroke + font metrics) is tall enough to span
      // nearly the whole circle vertically, so a pure left-mid position
      // still collides with it; pulling the glyph up clears that.
      const sx = cx - r * 0.85;
      const sy = cy - r * 0.85;
      const ringR = r * 0.24;
      planetGroup.appendChild(svgEl("line", {
        x1: sx - ringR - 2, y1: sy, x2: sx + ringR + 2, y2: sy, stroke: "#d7deee", "stroke-width": 1.4,
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

    // Cap width drives wrapping (same as before -- long names still wrap
    // at the same point), but the box itself only needs to be as wide as
    // its longest actual line, so short names don't carry the same empty
    // padding a long name needs.
    const CHAR_WIDTH_ESTIMATE = 3.9; // px per character at .planet-name's font-size
    const capWidth = Math.max(30, Math.min(maxBoxWidth != null ? maxBoxWidth : r * 3.4, 70));
    const maxChars = Math.max(4, Math.floor((capWidth - 6) / CHAR_WIDTH_ESTIMATE));
    const nameLines = wrapPlanetName(planet.name, maxChars);
    const longestLine = Math.max(...nameLines.map((line) => line.length));
    const boxWidth = Math.max(16, Math.min(longestLine * CHAR_WIDTH_ESTIMATE + 6, capWidth));
    const lineHeight = 8;
    const boxHeight = nameLines.length * lineHeight + 3;
    // Overlaps the lower part of the circle instead of sitting below it,
    // so the whole planet takes noticeably less vertical room.
    const nameTop = cy + r * 0.58;
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

  function wormholeSlotsFor(tile) {
    if (tile.planets.length > 0) return WORMHOLE_ICON_SLOTS;
    if (tile.wormholes.length <= 1) return [{ dx: 0, dy: 0 }];
    return WORMHOLE_ICON_SLOTS_CENTERED;
  }

  const WORMHOLE_SWIRL_COLOR = "#ff9d2e";

  function spiralArmPoints(cx, cy, startAngle, startR, endR, turns, steps) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + t * turns * Math.PI * 2;
      const r = startR + (endR - startR) * t;
      points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
    }
    return points.join(" ");
  }

  // Two mirrored spiral arms read as a small galaxy/whirlpool shape
  // rather than a single comet-tail streak.
  function drawWormholeSwirl(g, cx, cy) {
    [0, Math.PI].forEach((startAngle) => {
      g.appendChild(svgEl("polyline", {
        points: spiralArmPoints(cx, cy, startAngle, 3, 13, 0.85, 16),
        fill: "none",
        stroke: WORMHOLE_SWIRL_COLOR,
        "stroke-width": 2,
        "stroke-linecap": "round",
        opacity: 0.75,
      }));
    });
  }

  function drawWormholeIcon(g, x, y, type) {
    // pointer-events: none for the same reason every other decorative
    // planet/anomaly layer needs it -- this sits on top of the hex
    // polygon as a DOM sibling, not a child, so without it the swirl
    // would swallow the polygon's own click/hover/drag listeners
    // wherever it covers them.
    const wrapper = svgEl("g", { "pointer-events": "none" });
    drawWormholeSwirl(wrapper, x, y);
    const color = WORMHOLE_COLORS[type] || "#9aa4c0";
    const label = svgEl("text", { x, y: y + 4, class: "wormhole-icon-label", fill: color });
    label.textContent = WORMHOLE_SYMBOLS[type] || "?";
    wrapper.appendChild(label);
    g.appendChild(wrapper);
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
      // Flattening the ring/disk distance (not the core) suggests an
      // accretion disk viewed at an angle, like a black hole.
      const diskDist = Math.hypot(px, py * 1.8);
      if (dist < 13) {
        g.appendChild(pixelRect(px, py, "#000000", 1));
        return;
      }
      if (diskDist >= 13 && diskDist < 19) {
        g.appendChild(pixelRect(px, py, "#fff3d6", 0.95));
        return;
      }
      if (diskDist >= 19 && diskDist < 34) {
        const t = (diskDist - 19) / 15;
        const color = t < 0.4 ? "#ffb347" : t < 0.75 ? "#ff7a3c" : "#a83a1f";
        g.appendChild(pixelRect(px, py, color, 0.8 - t * 0.3));
        return;
      }
      g.appendChild(pixelRect(px, py, "#0a0a12", 0.5));
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

  function drawAnomalyBackground(g, x, y, anomalies, clipId) {
    // pointer-events: none so hovering the pixel art doesn't block the
    // hex polygon's own mousemove/mouseleave listeners underneath (the art
    // is drawn on top of the polygon, but as a DOM sibling, not a child,
    // so those events wouldn't otherwise reach the polygon's tooltip).
    const wrapper = svgEl("g", {
      transform: `translate(${x},${y})`, "clip-path": `url(#${clipId})`, "pointer-events": "none",
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

  function showTooltipLines(e, lines) {
    tooltip.textContent = lines.join("\n");
    tooltip.style.whiteSpace = "pre-line";
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
    tooltip.classList.remove("hidden");
  }

  function showTooltip(e, tile) {
    const lines = [tile.type === "mecatol" ? "Mecatol Rex" : `Tile #${tile.id}`];
    tile.planets.forEach((p) => {
      lines.push(`${p.name} — ${p.resources}R / ${p.influence}I${p.traits.length ? " · " + p.traits.join("/") : ""}${p.techs.length ? " · " + p.techs.join("/") + " tech" : ""}${p.station ? " · space station" : ""}`);
    });
    tile.wormholes.forEach((w) => lines.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => lines.push(ANOMALY_LABELS[a] || a));
    lines.push(`Value: ${formatScore(tileValue(tile))}`);
    showTooltipLines(e, lines);
  }

  const VALUE_CATEGORY_LABELS = {
    base: "Planets",
    tech: "Tech skips",
    legendary: "Legendary",
    station: "Space stations",
    wormhole: "Wormholes",
    entropicScar: "Entropic Scars",
  };
  const VALUE_CATEGORY_ORDER = ["base", "tech", "legendary", "station", "wormhole", "entropicScar"];

  function showHomeTooltip(e, key, breakdown) {
    const playerName = playerNameForHomeKey(key);
    const lines = [`${playerName} — Slice value ${formatScore(breakdown.total)}`];
    VALUE_CATEGORY_ORDER.forEach((category) => {
      const amount = breakdown.categoryTotals[category];
      if (amount > 0) lines.push(`${VALUE_CATEGORY_LABELS[category]}: ${formatScore(amount)}`);
    });
    if (breakdown.pathPenalty > 0) lines.push(`Path penalty: -${formatScore(breakdown.pathPenalty)}`);
    const sharedCount = breakdown.tiles.filter((t) => t.splitWith.length > 0).length;
    const sharedNote = sharedCount > 0 ? `, ${sharedCount} shared` : "";
    lines.push(`${breakdown.tiles.length} tiles counted${sharedNote}`);
    showTooltipLines(e, lines);
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
    if (lockedKeys.has(targetKey)) return false;
    const cell = keyToCell.get(targetKey);
    if (!cell || cell.ring === 0) return false;
    return true;
  }

  function toggleLock(key) {
    if (lockedKeys.has(key)) lockedKeys.delete(key);
    else lockedKeys.add(key);
    persist();
    renderAll();
  }

  let lockToolActive = false;

  function setLockToolActive(active) {
    lockToolActive = active;
    document.getElementById("btn-lock-tool").classList.toggle("active", active);
    svg.classList.toggle("lock-tool-active", active);
    renderAll();
  }

  function shuffleUnlocked() {
    const entries = [...board.entries()].filter(([key]) => !lockedKeys.has(key));
    if (entries.length < 2) return;
    const shuffledTiles = shuffle(entries.map(([, tile]) => tile));
    entries.forEach(([key], i) => board.set(key, shuffledTiles[i]));
    selectedPoolKey = null;
    persist();
    renderAll();
  }

  function sliceBalanceGap(homeSlices) {
    const totals = [...homeSlices.values()].map((breakdown) => breakdown.total);
    return Math.max(...totals) - Math.min(...totals);
  }

  // Greedy local search (same idea as ti4-lab's improveBalance.ts): try
  // random pairs of unlocked tiles, keep a swap only if it shrinks the
  // gap between the highest and lowest home slice value, and repeat
  // passes until a full pass finds no further improvement (a local
  // optimum) or MAX_BALANCE_ITERATIONS is hit as a safety cap -- the
  // board is small (well under 40 tiles) so this is cheap either way.
  const MAX_BALANCE_ITERATIONS = 2000;

  function balanceUnlocked() {
    const eligibleKeys = [...board.keys()].filter((key) => !lockedKeys.has(key));
    if (eligibleKeys.length < 2) return;

    const swapTiles = (keyA, keyB) => {
      const tileA = board.get(keyA);
      const tileB = board.get(keyB);
      board.set(keyA, tileB);
      board.set(keyB, tileA);
    };

    let currentGap = sliceBalanceGap(computeHomeSlices(board, homeKeys, RINGS));
    let iterations = 0;
    let improved = true;

    while (improved && iterations < MAX_BALANCE_ITERATIONS) {
      improved = false;
      const pairs = [];
      for (let i = 0; i < eligibleKeys.length; i++) {
        for (let j = i + 1; j < eligibleKeys.length; j++) {
          pairs.push([eligibleKeys[i], eligibleKeys[j]]);
        }
      }
      shuffle(pairs);

      for (const [keyA, keyB] of pairs) {
        iterations++;
        swapTiles(keyA, keyB);
        const newGap = sliceBalanceGap(computeHomeSlices(board, homeKeys, RINGS));
        if (newGap < currentGap) {
          currentGap = newGap;
          improved = true;
          break;
        }
        swapTiles(keyA, keyB); // revert -- this swap didn't help
        if (iterations >= MAX_BALANCE_ITERATIONS) break;
      }
    }

    selectedPoolKey = null;
    persist();
    renderAll();
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

  // Bounding box of a single hex centered at (0,0): HEX_SIZE=62 corner-to-
  // corner horizontally, HEX_SIZE*sqrt(3) flat-to-flat vertically, with a
  // small margin. Matches the actual hex shape used on the board, just at
  // swatch scale, so the palette shows the exact same tile art.
  const PALETTE_VIEWBOX = "-66 -58 132 116";

  function renderPalette() {
    paletteBlue.innerHTML = "";
    paletteRed.innerHTML = "";
    visiblePoolTiles()
      .filter(tileMatchesFilters)
      .sort((a, b) => a.id - b.id)
      .forEach((tile) => {
        const key = poolKey(tile);
        const div = document.createElement("div");
        div.className = "palette-tile" + (tile.back === "red" ? " red" : "") + (key === selectedPoolKey ? " selected" : "");
        div.addEventListener("click", () => {
          selectedPoolKey = key === selectedPoolKey ? null : key;
          renderAll();
        });

        const tileSvg = svgEl("svg", { viewBox: PALETTE_VIEWBOX, class: "palette-tile-svg" });
        const clipId = `hex-clip-pal-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        const defs = svgEl("defs", {});
        const clipPath = svgEl("clipPath", { id: clipId });
        clipPath.appendChild(svgEl("polygon", { points: hexPolygonPoints(0, 0) }));
        defs.appendChild(clipPath);
        tileSvg.appendChild(defs);
        const g = svgEl("g", {});
        tileSvg.appendChild(g);
        const poly = buildTileVisual(g, 0, 0, tile, tile.back, clipId);
        poly.addEventListener("mousemove", (e) => showTooltip(e, tile));
        poly.addEventListener("mouseleave", hideTooltip);
        div.appendChild(tileSvg);

        (tile.back === "red" ? paletteRed : paletteBlue).appendChild(div);
      });
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
    randomizeErrorEl.classList.add("hidden");
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
    const techSkipAvail = available.filter((t) => t.planets.some((p) => p.techs.length)).length;

    populateSelectRange(optWormholes, Math.min(wormholeAvail, MAX_WORMHOLES, n));
    populateSelectRange(optEntropic, Math.min(entropicAvail, MAX_ENTROPIC_SCAR, n));
    populateSelectRange(optLegendary, Math.min(legendaryAvail, n));
    populateSelectRange(optTechSkip, Math.min(techSkipAvail, MAX_TECH_SKIP, n));

    optBlueCount.max = String(n);
    if (!optBlueCount.dataset.touched) {
      optBlueCount.value = String(Math.min(BLUE_PER_PLAYER * playerNames.length, n));
    } else {
      optBlueCount.value = String(Math.min(Number(optBlueCount.value) || 0, n));
    }
    updateBlueCountLabel();
    randomizeErrorEl.classList.add("hidden");
  }

  // Necessary AND sufficient conditions for randomizeWithOptions to fully
  // satisfy `opts` given the current visible pool and empty-hex count `n`.
  // (Derivation: legendary/Entropic Scar/wormhole/tech-skip tiles are
  // treated as independent forced-pick categories, each drawing from
  // tiles not already claimed by an earlier category in the priority
  // order -- so this check is precise as long as those categories don't
  // overlap. Legendary and tech-skip DO overlap now (several legendary
  // planets also carry a tech specialty), so in the rare case where both
  // minimums are pushed high enough to jointly exceed the true number of
  // distinct tiles satisfying either, the fill can still come up short of
  // what this validation promised -- same known trade-off already
  // accepted for the original three categories. Every tile is exactly
  // blue or red, so once the forced picks are satisfied, the blue/red
  // ratio-fill succeeds in full iff blueCount/redCount don't exceed total
  // blue/red availability.)
  function describeUnmetRandomizeOptions(opts, n) {
    const available = visiblePoolTiles();
    const legendaryAvail = available.filter((t) => t.planets.some((p) => p.legendary)).length;
    const entropicAvail = available.filter((t) => t.anomalies.includes("entropicScar")).length;
    const wormholeAvail = available.filter((t) => t.wormholes.length > 0).length;
    const techSkipAvail = available.filter((t) => t.planets.some((p) => p.techs.length)).length;
    const blueAvail = available.filter((t) => t.back === "blue").length;
    const redAvail = available.filter((t) => t.back === "red").length;

    if (opts.legendaryMin > legendaryAvail) {
      return `Only ${legendaryAvail} legendary-planet tile(s) available in the selected tile sets, but ${opts.legendaryMin} requested.`;
    }
    if (opts.entropicScarCount > entropicAvail) {
      return `Only ${entropicAvail} Entropic Scar tile(s) available in the selected tile sets, but ${opts.entropicScarCount} requested.`;
    }
    if (opts.wormholeCount > wormholeAvail) {
      return `Only ${wormholeAvail} wormhole tile(s) available in the selected tile sets, but ${opts.wormholeCount} requested.`;
    }
    if (opts.techSkipMin > techSkipAvail) {
      return `Only ${techSkipAvail} tech-skip tile(s) available in the selected tile sets, but ${opts.techSkipMin} requested.`;
    }
    const forcedTotal = opts.legendaryMin + opts.entropicScarCount + opts.wormholeCount + opts.techSkipMin;
    if (forcedTotal > n) {
      return `The legendary + Entropic Scar + wormhole + tech-skip minimums add up to ${forcedTotal}, but there are only ${n} empty hex(es) to fill.`;
    }
    if (opts.blueCount > blueAvail) {
      return `Only ${blueAvail} blue tile(s) available in the selected tile sets, but ${opts.blueCount} requested.`;
    }
    if (opts.redCount > redAvail) {
      return `Only ${redAvail} red tile(s) available in the selected tile sets, but ${opts.redCount} requested.`;
    }
    return null;
  }

  function keysAdjacent(keyA, keyB) {
    const a = parseKey(keyA);
    const b = parseKey(keyB);
    return hexDistance(a.q, a.r, b.q, b.r) === 1;
  }

  // Assigns `selected` tiles to `emptyKeys` positions. With
  // avoidAdjacentAnomalies off, this is a plain random shuffle+zip (the
  // prior behavior, unchanged). With it on, anomaly tiles are placed
  // one at a time into whichever remaining empty position isn't
  // hex-adjacent to another anomaly -- either one already placed this
  // pass, or one already sitting on the board outside emptyKeys (e.g. a
  // locked tile). This is best-effort, not a hard guarantee: if too
  // many anomaly tiles are being placed into too few/cramped empty
  // slots, some remaining position is picked anyway rather than leaving
  // tiles unplaced.
  function assignTilesToKeys(emptyKeys, selected, avoidAdjacentAnomalies) {
    const assignment = new Map();

    if (!avoidAdjacentAnomalies) {
      const shuffled = shuffle([...selected]);
      emptyKeys.forEach((key, i) => {
        if (shuffled[i]) assignment.set(key, shuffled[i]);
      });
      return assignment;
    }

    const emptyKeySet = new Set(emptyKeys);
    const existingAnomalyKeys = [...board.entries()]
      .filter(([key, tile]) => !emptyKeySet.has(key) && tile.anomalies.length > 0)
      .map(([key]) => key);

    const anomalyTiles = shuffle(selected.filter((t) => t.anomalies.length > 0));
    const otherTiles = shuffle(selected.filter((t) => t.anomalies.length === 0));
    const remainingKeys = shuffle([...emptyKeys]);
    const placedAnomalyKeys = [];

    anomalyTiles.forEach((tile) => {
      const safeIndex = remainingKeys.findIndex((key) =>
        !existingAnomalyKeys.some((ak) => keysAdjacent(ak, key))
        && !placedAnomalyKeys.some((ak) => keysAdjacent(ak, key)),
      );
      const index = safeIndex === -1 ? 0 : safeIndex;
      const [key] = remainingKeys.splice(index, 1);
      assignment.set(key, tile);
      placedAnomalyKeys.push(key);
    });

    otherTiles.forEach((tile) => {
      const key = remainingKeys.shift();
      if (key) assignment.set(key, tile);
    });

    return assignment;
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
    // legendary and wormhole, or legendary and tech-skip) is claimed by
    // whichever category runs first and is then unavailable to a later
    // one, even if that later count was reported as achievable by
    // updateRandomizeBounds (which counts each category independently).
    takeRandom(available.filter((t) => t.planets.some((p) => p.legendary)), opts.legendaryMin);
    takeRandom(available.filter((t) => t.anomalies.includes("entropicScar")), opts.entropicScarCount);
    takeRandom(available.filter((t) => t.wormholes.length > 0), opts.wormholeCount);
    takeRandom(available.filter((t) => t.planets.some((p) => p.techs.length)), opts.techSkipMin);

    // Tiles picked above to satisfy a minimum are off-limits to the
    // trait-balance pass below -- swapping one away could drop that
    // minimum's actual count under what was promised. Tiles from the
    // ratio-fill/leftover-fill steps that follow aren't protected, since
    // they were never guaranteeing anything specific.
    const protectedPoolKeys = new Set(selected.map(poolKey));

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

    const assignment = assignTilesToKeys(emptyKeys, selected, opts.avoidAdjacentAnomalies);
    assignment.forEach((tile, key) => {
      pool.delete(poolKey(tile));
      board.set(key, tile);
    });

    improveTraitBalance(assignment, protectedPoolKeys, opts.maxTraitGap);

    selectedPoolKey = null;
    persist();
    renderAll();
  }

  // Best-effort: swaps a just-placed, unprotected tile for a same-color
  // tile from the pool whenever that reduces the whole-board gap between
  // the highest and lowest Cultural/Industrial/Hazardous count, repeating
  // until the gap is within maxGap or a full pass finds no improving
  // swap. Never touches tiles outside `assignment` (so locked/pre-existing
  // tiles are untouched, matching Randomize's existing "only fills empty
  // hexes" guarantee) or tiles in `protectedPoolKeys` (so it can't starve
  // a minimum -- legendary/Entropic Scar/wormhole/tech-skip -- that was
  // just satisfied above). Swapping in a same-color pool tile can still
  // change other things about a slot (e.g. reintroduce an anomaly
  // adjacency avoidAdjacentAnomalies just avoided); that's an accepted
  // trade-off of running this pass last, same spirit as every other
  // "best effort" option here.
  function improveTraitBalance(assignment, protectedPoolKeys, maxGap) {
    const swappableKeys = [...assignment.keys()].filter((key) => !protectedPoolKeys.has(poolKey(assignment.get(key))));
    if (swappableKeys.length === 0) return;

    const MAX_TRAIT_BALANCE_ITERATIONS = 500;
    let iterations = 0;
    let improved = true;

    while (improved && iterations < MAX_TRAIT_BALANCE_ITERATIONS) {
      const gap = traitCountGap(computeTraitCounts([MECATOL_REX, ...board.values()]));
      if (gap <= maxGap) return;
      improved = false;

      for (const key of shuffle([...swappableKeys])) {
        const currentTile = board.get(key);
        const candidates = shuffle(visiblePoolTiles().filter((t) => t.back === currentTile.back));

        for (const candidate of candidates) {
          iterations++;
          board.set(key, candidate);
          pool.delete(poolKey(candidate));
          pool.set(poolKey(currentTile), currentTile);

          const newGap = traitCountGap(computeTraitCounts([MECATOL_REX, ...board.values()]));
          if (newGap < gap) {
            improved = true;
            break;
          }
          board.set(key, currentTile);
          pool.delete(poolKey(currentTile));
          pool.set(poolKey(candidate), candidate);
          if (iterations >= MAX_TRAIT_BALANCE_ITERATIONS) break;
        }
        if (improved || iterations >= MAX_TRAIT_BALANCE_ITERATIONS) break;
      }
    }
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
    lockedKeys = new Set();
    persist();
    renderAll();
  }

  function serialize() {
    return {
      version: 1,
      rings: RINGS,
      playerNames,
      enabledSets: [...enabledSets],
      lockedKeys: [...lockedKeys],
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
    lockedKeys = new Set(Array.isArray(data.lockedKeys) ? data.lockedKeys.filter((k) => board.has(k)) : []);
    selectedPoolKey = null;
    renderTileSetToggles();
    renderAll();
  }

  // Map strings list one number per hex in ring order (skipping Mecatol
  // Rex, which is always the center), starting north of Mecatol and
  // sweeping clockwise within each ring -- the same convention other TI4
  // map tools use. "0" for a home system, a tile's id otherwise, "-1" for
  // a non-home hex that's still empty. `mapStringCells` (from
  // generateMapStringOrder() in hexgrid.js) provides exactly that order;
  // it's deliberately separate from `cells`, which rendering/home-slot
  // assignment rely on its own (different) order for.
  function serializeMapString() {
    return mapStringCells
      .map((c) => {
        const key = keyFor(c.q, c.r);
        if (homeKeys.has(key)) return "0";
        const tile = board.get(key);
        return tile ? String(tile.id) : "-1";
      })
      .join(" ");
  }

  function parseMapString(str) {
    const tokens = str.trim().split(/\s+/).filter(Boolean);
    const rest = mapStringCells;
    if (tokens.length !== rest.length) {
      alert(`Expected ${rest.length} numbers (one per non-Mecatol hex), got ${tokens.length}.`);
      return;
    }

    const tilesById = new Map();
    TILE_POOL.forEach((t) => {
      if (!tilesById.has(t.id)) tilesById.set(t.id, []);
      tilesById.get(t.id).push(t);
    });
    const setPriority = { base: 0, pok: 1, "thunders-edge": 2, "discordant-stars": 3 };

    const newBoard = new Map();
    const usedKeys = new Set();
    let badToken = null;

    rest.forEach((c, i) => {
      const token = tokens[i];
      if (token === "0" || token === "-1") return;
      const id = Number(token);
      const candidates = (tilesById.get(id) || [])
        .filter((t) => t.set === "base" || enabledSets.has(t.set))
        .filter((t) => !usedKeys.has(poolKey(t)))
        .sort((a, b) => (setPriority[a.set] ?? 9) - (setPriority[b.set] ?? 9));
      const match = candidates[0];
      if (!Number.isFinite(id) || !match) {
        badToken = token;
        return;
      }
      usedKeys.add(poolKey(match));
      newBoard.set(keyFor(c.q, c.r), match);
    });

    if (badToken !== null) {
      alert(`Could not import that map string — tile "${badToken}" isn't recognized, isn't enabled, or is used twice.`);
      return;
    }

    board = newBoard;
    pool = new Map(TILE_POOL.filter((t) => !usedKeys.has(poolKey(t))).map((t) => [poolKey(t), t]));
    selectedPoolKey = null;
    lockedKeys = new Set();
    persist();
    renderAll();
  }

  // The board's colors/fonts come from css/style.css via class names.
  // A cloned SVG rendered outside the document (as a standalone image)
  // has no access to that stylesheet, so we inline the relevant rules
  // directly into the exported SVG.
  const EXPORT_STYLE = `
    .hex { stroke: #5c6780; stroke-width: 2; }
    .hex.empty { fill: #171d2c; }
    .hex.blue { fill: #24406e; }
    .hex.red { fill: #5a2733; }
    .hex.home { fill: #2e3a2a; }
    .hex.mecatol { fill: #4a3a1a; }
    .hex-lock-outline { fill: none; stroke: #ff2d2d; stroke-width: 5; }
    .hex-label { fill: #e8ecf7; font-size: 11px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .hex-id-label { font-size: 8px; opacity: 0.7; }
    .hex-sublabel { fill: #9aa4c0; font-size: 9px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .planet-number { font-weight: 800; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; paint-order: stroke fill; stroke: #0b0e17; stroke-width: 2.5px; stroke-linejoin: round; }
    .planet-number-res { fill: #6fdc8c; }
    .planet-number-inf { fill: #b98eff; }
    .planet-name { fill: #9aa4c0; font-size: 6.5px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .wormhole-icon-label { font-size: 15px; font-weight: 800; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; paint-order: stroke fill; stroke: #0b0e17; stroke-width: 2.5px; stroke-linejoin: round; }
  `;

  function exportPng() {
    const serializer = new XMLSerializer();
    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // The live <svg> only has width/height:100% via CSS, which isn't
    // available to a standalone image loaded from a blob URL -- without
    // explicit width/height attributes here, browsers fall back to the
    // default replaced-element size (300x150) instead of the viewBox,
    // silently cropping the exported PNG to a corner of the map.
    const [vbX, vbY, vbW, vbH] = svg.getAttribute("viewBox").split(" ");
    svgClone.setAttribute("width", vbW);
    svgClone.setAttribute("height", vbH);
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = EXPORT_STYLE;
    svgClone.insertBefore(styleEl, svgClone.firstChild);
    // Inline a background so the exported PNG isn't transparent.
    const bg = svgEl("rect", { x: vbX, y: vbY, width: vbW, height: vbH, fill: "#060810" });
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

  function init() {
    const filterInputs = [...document.querySelectorAll("#palette-panel [data-filter]")];
    filterInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const category = input.dataset.filter;
        if (category === "wormhole" || category === "station" || category === "legendary") {
          filterState[category] = input.checked;
        } else if (category === "planetCount") {
          // Only one planet-count value makes sense at a time (a tile
          // can't have both 1 and 2 planets) -- picking one clears any
          // other, but clicking the active one again still turns it off.
          if (input.checked) {
            filterInputs
              .filter((other) => other.dataset.filter === "planetCount" && other !== input)
              .forEach((other) => { other.checked = false; });
            filterState.planetCount = new Set([Number(input.value)]);
          } else {
            filterState.planetCount.clear();
          }
        } else {
          if (input.checked) filterState[category].add(input.value);
          else filterState[category].delete(input.value);
        }
        renderPalette();
      });
    });
    document.getElementById("btn-clear-filters").addEventListener("click", () => {
      filterInputs.forEach((input) => { input.checked = false; });
      filterState.trait.clear();
      filterState.tech.clear();
      filterState.wormhole = false;
      filterState.station = false;
      filterState.legendary = false;
      filterState.planetCount.clear();
      renderPalette();
    });

    document.getElementById("btn-randomize").addEventListener("click", openRandomizeModal);
    document.getElementById("btn-randomize-cancel").addEventListener("click", closeRandomizeModal);
    document.getElementById("btn-randomize-apply").addEventListener("click", () => {
      const n = emptySlotKeys().length;
      const blueCount = Number(optBlueCount.value);
      const opts = {
        blueCount,
        redCount: Math.max(0, n - blueCount),
        wormholeCount: Number(optWormholes.value),
        entropicScarCount: Number(optEntropic.value),
        legendaryMin: Number(optLegendary.value),
        techSkipMin: Number(optTechSkip.value),
        maxTraitGap: Number(optMaxTraitGap.value),
        avoidAdjacentAnomalies: optAvoidAdjacentAnomalies.checked,
      };
      const error = describeUnmetRandomizeOptions(opts, n);
      if (error) {
        randomizeErrorEl.textContent = error;
        randomizeErrorEl.classList.remove("hidden");
        return;
      }
      randomizeWithOptions(opts);
      closeRandomizeModal();
    });
    optBlueCount.addEventListener("input", () => {
      optBlueCount.dataset.touched = "1";
      updateBlueCountLabel();
    });
    optMaxTraitGap.addEventListener("input", () => {
      traitGapLabel.textContent = `Max planet-trait gap: ${optMaxTraitGap.value}`;
    });
    const layoutEl = document.querySelector(".layout");
    const btnTogglePalette = document.getElementById("btn-toggle-palette");
    btnTogglePalette.addEventListener("click", () => {
      const collapsed = layoutEl.classList.toggle("palette-collapsed");
      btnTogglePalette.textContent = collapsed ? "⮜" : "⮞";
      btnTogglePalette.title = collapsed ? "Expand tile selector" : "Collapse tile selector";
    });

    document.getElementById("btn-shuffle-unlocked").addEventListener("click", shuffleUnlocked);
    document.getElementById("btn-balance").addEventListener("click", balanceUnlocked);
    document.getElementById("btn-lock-tool").addEventListener("click", () => setLockToolActive(!lockToolActive));
    document.getElementById("btn-clear").addEventListener("click", clearBoard);
    document.getElementById("btn-export-png").addEventListener("click", exportPng);
    document.getElementById("btn-export-mapstring").addEventListener("click", () => {
      const str = serializeMapString();
      const btn = document.getElementById("btn-export-mapstring");
      const original = btn.textContent;
      const showCopied = () => {
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).then(showCopied, () => window.prompt("Copy this map string:", str));
      } else {
        window.prompt("Copy this map string:", str);
      }
    });
    document.getElementById("btn-import-mapstring").addEventListener("click", () => {
      const str = window.prompt("Paste a map string:");
      if (str) parseMapString(str);
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
