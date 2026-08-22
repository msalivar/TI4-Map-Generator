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
  const playerLabelsEl = document.getElementById("player-labels");
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
    const poly = svgEl("polygon", { points: hexPolygonPoints(x, y), class: `hex ${backClass}`, "data-key": key });
    if (removable) {
      poly.addEventListener("click", () => onFilledClick(key));
      poly.addEventListener("pointerdown", (e) => startTileDrag(e, poly, key));
    }
    poly.addEventListener("mousemove", (e) => showTooltip(e, tile));
    poly.addEventListener("mouseleave", hideTooltip);
    g.appendChild(poly);

    const num = svgEl("text", { x, y: y - (tile.planets.length ? 10 : 2), class: "hex-label" });
    num.textContent = tile.type === "mecatol" ? "Mecatol Rex" : `#${tile.id}`;
    g.appendChild(num);

    if (tile.planets.length) {
      const names = tile.planets.map((p) => p.name).join(" / ");
      const sub = svgEl("text", { x, y: y + 6, class: "hex-sublabel" });
      sub.textContent = truncate(names, 16);
      g.appendChild(sub);

      const ri = tile.planets.map((p) => `${p.resources}/${p.influence}`).join("  ");
      const pip = svgEl("text", { x, y: y + 20, class: "hex-sublabel pip" });
      pip.textContent = ri;
      g.appendChild(pip);
    }

    const tags = [];
    tile.wormholes.forEach((w) => tags.push(WORMHOLE_LABELS[w] || w));
    tile.anomalies.forEach((a) => tags.push(ANOMALY_LABELS[a] || a));
    if (tags.length) {
      const tagEl = svgEl("text", { x, y: y + 34, class: "hex-sublabel" });
      tagEl.textContent = tags.join(", ");
      g.appendChild(tagEl);
    }
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function showTooltip(e, tile) {
    const lines = [tile.type === "mecatol" ? "Mecatol Rex" : `Tile #${tile.id}`];
    tile.planets.forEach((p) => {
      lines.push(`${p.name} — ${p.resources}R / ${p.influence}I${p.trait ? " · " + p.trait : ""}${p.tech ? " · " + p.tech + " tech" : ""}`);
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
    tile.planets.forEach((p) => parts.push(`${p.name} ${p.resources}/${p.influence}`));
    tile.wormholes.forEach((w) => parts.push(WORMHOLE_LABELS[w]));
    tile.anomalies.forEach((a) => parts.push(ANOMALY_LABELS[a]));
    return parts.join(" | ");
  }

  function renderPlayerLabels() {
    playerLabelsEl.innerHTML = "";
    playerNames.forEach((name, i) => {
      const input = document.createElement("input");
      input.value = name;
      input.placeholder = `Player ${i + 1}`;
      input.addEventListener("input", () => {
        playerNames[i] = input.value;
        persist();
        renderBoard();
      });
      playerLabelsEl.appendChild(input);
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

    // Wormhole/entropic-scar tiles are excluded here on purpose: those two
    // counts are exact targets, so any tile of those kinds not already
    // claimed above must NOT be swept up by the ratio fill below. Legendary
    // tiles are deliberately left eligible — legendaryMin is a floor, not
    // an exact target, so extra legendaries turning up here is fine.
    const rest = shuffle(
      available.filter((t) => !used.has(poolKey(t)) && t.wormholes.length === 0 && !t.anomalies.includes("entropicScar"))
    );
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
    renderPlayerLabels();
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
    .hex-label { fill: #e8ecf7; font-size: 11px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
    .hex-sublabel { fill: #9aa4c0; font-size: 9px; font-family: "Segoe UI", system-ui, sans-serif; text-anchor: middle; }
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
    renderPlayerLabels();
    renderTileSetToggles();
    if (saved) {
      loadFromObject(saved);
    } else {
      renderAll();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
