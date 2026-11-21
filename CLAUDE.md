# Integration Version Registry — notes for Claude

## Working rules (from the project owner, Suddha)
- Build only on an explicit "build"; plan only on "plan"; otherwise collect points into the docs.
- "small fix" = patch directly, skip full browser tests / screenshots.
- Concise answers, schematic visuals.
- Docs live in the claude.ai project, not here: one short file per review round (`claude/review-*.md`),
  one global `claude/registry-open-items.md` (open, parked, reference notes). Don't rewrite big docs for one point.

## What this is
Single self-contained `registry-app.html` (no build step, no libraries). Reads Pattern Bench registry
entries (`*.registry.json`, schema 0.6) + canvas exports (`*.canvas.json`) from `registry-data/` on GitHub
(default) or a local folder. Companion: Pattern Bench (`suddhasattaguha/pattern-bench`, branch `feature/v2.0`).

## Code map of registry-app.html (search for the markers / function names; line numbers drift)
| Area | Find it by |
|---|---|
| CSS (all) | `<style>`; newest blocks at the end: `draft 0.6: relationship types`, `draft 0.7: one detail-page pattern` |
| Constants, identity helpers | `RECORD_FORMAT`, `isSystemKind`, `appNameOf`, `endpointNameOf`, `sysKey`, `slug` |
| 1. Reading the folder | `1. Reading the folder`, `loadFromGitHub`, `openFolder`, `loadFromHandle`, `window.__registryLoad` (test hook) |
| 2. Record per entry (index.json cache) | `function extract(` — bump `RECORD_FORMAT` when the record shape changes |
| 3. Derive scenarios / refs / systems / flags | `function derive(` (S.scenarios, S.refs, S.assets, **S.systems**, S.refSys), `flagsFor`, `attnRefs`, `sysAttn` |
| Overlap tiers (R-12) | `TIERS`, `overlapBetween`, `overlapsOf`, `sameSourceOf` |
| Router / navigation | `function go(` (views: home, band, scenario, component, system), `openDetail` (row → page morph), `pushNav`, `keyView`, `goKey`, act `back` |
| Home bands, worlds | `BANDS`, `bandStats`, `homeView`, `worldView`, `openWorld`, `closeWorld` |
| Lists | `LIST_COLS` + `listTable` (scenarios: Source → Platforms → Targets, PB column), `compTable` (one row per component, `partChips`), `sysTable`, `decisionsTable` |
| Relationship map = explorer start (V-1, 0.8) | `MTYPES`, `mapObjects`, `mapList`, `mapWorld`, `S.mx` (type, q, stack, via), events `data-mtype` / `data-mstart` / act `mreset` |
| Explorer (verbs) | `scRel`, `coRel` (component), `plRel` (platform), `sysRel`, `compNeighbours`; `relSvg` (drawing; left column = previous node, V-3), `explorerHtml`, `toggleVerb`, `pivot(key, via)`, `crumbTo`, `X.via`, `dive`, `#pageRel` |
| Detail pages | `factsHtml`, `sideLists`, `detailHead`, `componentView`, `platformView`, `systemView`, `scenarioView`, `madeOfRows` |
| Flow diagram (named artifacts) | `chainSvg`, `flowPanel` |
| Open in Pattern Bench (R-14) | `pbAddress`, `canvasEntry`, `pbButton`, `statusMarkers`, `pbPayload`, `openInPB`, `pbDialog`, `toast`, `saveBlob` |
| 5. Events | `5. Events` — one delegated click handler (data-act, data-go, data-rowopen, data-node, data-verb …), input, dblclick / hold |

## Data model in memory (after derive)
- `S.scenarios: id → { latest, history[], flags[] }`; record: `components[] {ref, kind, app, endpoint, …}`, `links[] "a > b"`, `containers[]`, `sys {triggeredBy[], deliversTo[]}`.
- Two concepts (0.8): **platform / broker** › **integration component** (= container ref, e.g. `btp/salesorderiflow`). API / process / topic / queue are its **parts** (`…#api`).
- `S.comps: key → {name, platform, platKey, kind, parts Set, scenarios}`; `S.partComp: part ref → component key`; `S.platforms: plat/<slug> → {name, kinds, comps, scenarios}`. Helpers `compKeyOf`, `compName`, `platName`, `partLabel`, `partsIn`, `compAttn`.
- `S.refs: ref → {kind, type, platform, asset, versions, scenarios, max}` — part level; links, overlaps, flags and lifecycle stay on parts.
- `S.systems: sys/<slug> → {name, endpoints Map, triggers Map, receives Map, refs}`; `S.refSys: ref → system key`.
- Node keys in the explorer: `s|<scenarioId>`, `c|<componentKey>`, `p|<platformKey>`, `a|<systemKey>`.

## Testing
- Headless: Playwright (Python). Load data with `page.evaluate("items => window.__registryLoad(items, 'landscape')", items)`
  where items = `[{path:"landscape/<file>", text, lastModified}]` from `registry-data/landscape/*.json`; abort `https://api.github.com/**`.
- Open in Pattern Bench: put `registry-app.html` and `pattern-bench.html` in one temp folder, use `context.expect_page()`;
  Pattern Bench exposes `window.__debug.rgState()`.
- Test landscape: `python3 tools/gen_landscape.py registry-data/landscape`.

## Commits
End commit messages with the attribution lines the session gives; push to `main`.
