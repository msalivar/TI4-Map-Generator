# Shareable Map URL — Design

## Goal

Let a user share a built map by copying a single URL. Opening that URL on any
device reproduces the board exactly, with no backend — it works on the existing
GitHub Pages static hosting. Adds a `🔗 Copy share link` toolbar button and
URL-hash loading on page start.

This is the "Shareable map links" item already listed in `README.md` under "Not
yet built".

## Background

The repo already has a compact serialization for the board:

- `serializeMapString()` (`js/app.js`) emits one token per non-Mecatol hex in
  `generateMapStringOrder(RINGS)` order — `"0"` for a home slot, a tile's `id`
  otherwise, `"-1"` for an empty non-home hex. The token count is layout-dependent
  (36 for a 3-ring layout, 60 for a 4-ring one).
- `parseMapString(str)` splits on whitespace, checks the token count, resolves
  each `id` against `TILE_POOL` (`tilesById` map), filters candidates by
  `enabledSets`, breaks ties by a `setPriority` order, rebuilds `board`/`pool`,
  then calls `persist()`.

That string is the natural payload for a share URL. Two pieces of extra state are
needed to reproduce a map:

- **Which expansion sets are enabled** (`enabledSets`) — `parseMapString` resolves
  bare ids and tile `id` is not globally unique across sets.
- **Which map layout is active** (`currentLayout.key`) — since the map-layouts
  feature landed (`data/map-layouts.js`, `MAP_LAYOUTS`), board shape, ring count,
  home-slot positions, and decorative hyperlane slots all vary by layout. A
  map string alone is ambiguous about board shape. `loadFromObject()` already
  restores the layout for the autosave path via `data.layoutKey`; the hash loader
  mirrors that.

Out of scope of the map-string format (and therefore of this feature): player
names, locked tiles.

## URL format

Hash fragment — never sent to the server, needs no Pages routing:

```
https://msalivar.github.io/TI4-Map-Generator/#l=6p-standard&m=0,0,-1,39,40,...&s=p,t,d
```

Params are `&`-separated `key=value` pairs after the `#`. Order is not
significant; the loader reads each by name.

- `l=` — the active layout's `key` from `MAP_LAYOUTS` (e.g. `6p-standard`,
  `4p-warp`), verbatim, ~11 chars.
  - If **absent** (hand-made or pre-feature link) or unrecognized: default to
    `DEFAULT_LAYOUT_KEY` (`6p-standard`), matching `loadFromObject()`'s fallback.
- `m=` — the map-string tokens joined by `,` instead of the space that
  `serializeMapString()` uses. Same content; 36 tokens for a 3-ring layout, 60
  for 4-ring; ~100–250 chars.
- `s=` — enabled expansion sets as single-letter codes:
  `p` = `pok`, `t` = `thunders-edge`, `d` = `discordant-stars`.
  Comma-separated, any subset, may be empty (`s=` with nothing after it means no
  expansions).
  - If the `s=` param is **absent entirely** (hand-made or pre-feature link):
    default to all sets enabled, matching the app's current default.
- No compression. The token list is short enough as-is.

## Load behavior

New `loadFromHash()`, called as the first thing in `init()`:

1. Parse `location.hash` into a param map. Return `false` immediately (→ `init()`
   proceeds with the existing `localStorage` path unchanged) unless an `m=` param
   is present.
2. Resolve the layout: `MAP_LAYOUTS.find((l) => l.key === params.l) ||
   MAP_LAYOUTS.find((l) => l.key === DEFAULT_LAYOUT_KEY)` — the same expression
   `loadFromObject()` uses — and call `applyLayout(layout)`. This sets
   `mapStringCells` for the length check in the next step.
3. Split `m=` on `,`. If the count `!== mapStringCells.length`, `console.warn` and
   return `false` (fall through to the normal path). No `alert()`.
4. Set `enabledSets` from the `s=` param (all-on if the param is absent; exactly
   the listed sets otherwise, including empty = base only).
5. Load the board from the tokens via `applyMapTokens(tokens, { persist: false,
   partial: true })` (see Code changes).
6. Set a module-level `shareMode = true`.
7. Return `true`. `init()` skips the `localStorage` restore branch entirely and
   does not call `applyLayout()` / `renderAll()` again (both already happened).

### Share mode is non-persistent

`persist()` gets `if (shareMode) return;` at the top. A tab opened from a share
link never writes `localStorage` — not on load, not on later edits — for the
whole page load. Rationale: `localStorage` is one shared slot across all tabs of
the origin. Without this rule, opening a friend's link in a second tab would
clobber the autosave your first tab depends on. If a user tweaks a shared map and
wants to keep it, they click `🔗 Copy share link` again for the updated URL, or
use the existing Export buttons.

Semantically the share link still **replaces** the in-memory board outright — no
merge, no `confirm()` dialog.

### Bad or partial hash

If a token in `m=` doesn't resolve to an available tile: place the tiles that do
resolve, `console.warn` the unresolved tokens, and do **not** `alert()` — a
broken shared link must not pop a dialog on page load. The manual "Import Map
String" button keeps its existing `alert()` behavior.

## Code changes

All in `js/app.js` unless noted.

- **Refactor `parseMapString`** into two pieces:
  - `applyMapTokens(tokens, { persist, partial })` — the resolve-and-place core:
    the per-cell loop, `tilesById`, `setPriority`, `newBoard`/`pool` rebuild,
    `selectedPoolKey`/`lockedKeys` reset, `renderAll()`. Returns the list of
    unresolved tokens (empty on full success) instead of showing UI itself.
    - `partial: false` (Import button) — all-or-nothing: if any token is
      unresolved, return the bad tokens and leave `board`/`pool` untouched.
    - `partial: true` (hash load) — place every token that resolves, skip the
      rest, still return them.
    - Calls `persist()` at the end only when `persist` is true **and** a board was
      actually applied.
  - `parseMapString(str)` — keeps the whitespace split, the token-count check
    against `mapStringCells.length`, and the `alert()` on bad tokens; delegates
    placement to `applyMapTokens(tokens, { persist: true, partial: false })`. The
    Import Map String button is otherwise unchanged.
  - `loadFromHash()` calls `applyMapTokens(tokens, { persist: false, partial:
    true })` and `console.warn`s any returned unresolved tokens.
- **`persist()`** — add `if (shareMode) return;` as the first line. New
  module-level `let shareMode = false;`.
- **Set-code helpers** (module scope, near `TILE_SETS`):
  - `SET_CODES = { p: "pok", t: "thunders-edge", d: "discordant-stars" }` —
    single source of truth, used both directions.
  - `encodeSetsParam(setLike)` — `Set`/array of set keys → `"p,t,d"` style string
    (only the three expansion keys; `base` is implicit and never encoded).
  - `decodeSetsParam(str)` — `"p,t"` → `Set(["pok", "thunders-edge"])`; unknown
    codes ignored.
- **`buildShareURL()`** —
  ```js
  location.origin + location.pathname +
    "#l=" + currentLayout.key +
    "&m=" + serializeMapString().split(" ").join(",") +
    "&s=" + encodeSetsParam(enabledSets)
  ```
- **`loadFromHash()`** — as described in Load behavior; called first in `init()`,
  gating the existing `saved`/`loadFromObject` branch. Resolves and `applyLayout`s
  the `l=` layout before the `m=` length check, mirroring `loadFromObject()`.
- **Toolbar button** — add `<button id="btn-copy-share-link">🔗 Copy share
  link</button>` to `index.html` next to `btn-export-mapstring`. Wire it in
  `init()` with the same `navigator.clipboard.writeText` + `✅ Copied!`
  text-swap-for-1500ms feedback pattern the Export Map String button already
  uses, falling back to `window.prompt` when clipboard is unavailable.

Nothing else moves. No new files. No script-load-order change.

## Testing (live in browser, per CLAUDE.md)

Start the `static-site` server, reload after edits, console must stay clean on
every path.

1. **Round-trip** — build a map that uses expansion tiles, click `🔗 Copy share
   link`, open the copied URL in a fresh tab: board matches exactly and the same
   expansion sets are checked.
1a. **Layout round-trip** — switch to a non-default layout (e.g. `4p-warp`, and a
   4-ring one like `7p-standard`), build a map, share it, open the link: the
   layout dropdown shows that layout and the home / hyperlane slots match.
2. **Share mode is non-persistent** — record
   `localStorage["ti4-map-generator-state-v1"]`, open a share link, edit the
   board in that tab, confirm the stored value is byte-for-byte unchanged.
3. **Multi-tab** — tab A (opened with no hash) builds a map and autosaves; open a
   share link in tab B; reload tab A — it still shows tab A's map.
4. **No hash** — normal load still restores from `localStorage`; the address bar
   stays clean (no hash appended).
5. **Broken hash** — put a bogus tile id in `m=`: valid tiles load, a
   `console.warn` names the bad token, no `alert()`.
6. **`s=` absent** — a link with only `l=` and `m=`: all expansion sets end up
   enabled and the map loads.
7. **`s=` empty / partial** — `&s=` (base only) and `&s=p` load with exactly
   those sets enabled.
8. **`l=` absent / unknown** — a link with only `m=` (or `l=bogus`): falls back to
   `6p-standard`; if the `m=` length then doesn't match, `console.warn` and the
   normal `localStorage` path runs.
9. **Clipboard fallback** — with `navigator.clipboard` unavailable, the button
   falls back to `window.prompt` showing the URL.
