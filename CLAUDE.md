# Integration Version Registry — notes for Claude

## Working rules (from the project owner, Suddha)
- Build only on an explicit "build"; plan only on "plan"; otherwise collect points into the docs.
- "small fix" = patch directly, skip full browser tests / screenshots.
- Concise answers, schematic visuals.
- Docs live in the claude.ai project, not here: one short file per review round (`claude/review-*.md`),
  one global `claude/registry-open-items.md` (open, parked, reference notes). Don't rewrite big docs for one point.

## What this is
Single self-contained `registry-app.html` (no build step, no libraries). Reads Pattern Bench registry
entries (`*.registry.json`, schema 1.0; 0.7 / 0.6 still accepted) + canvas exports (`*.canvas.json`) from `registry-data/` on GitHub
(default) or a local folder. Companion: Pattern Bench (`suddhasattaguha/pattern-bench`, branch `feature/v2.0`).

## Code map of registry-app.html (search for the markers / function names; line numbers drift)
| Area | Find it by |
|---|---|
| CSS (all) | `<style>`; newest blocks: `draft 0.9: pinned header…` (sticky vars `--stk-app/head/tool`), `draft 0.8.1: high-level design`, `draft 0.8: two concepts` |
| Constants, identity helpers | `RECORD_FORMAT`, `isSystemKind`, `appNameOf`, `endpointNameOf`, `sysKey`, `slug` |
| 1. Reading the folder | `1. Reading the folder`, `loadFromGitHub`, `openFolder`, `loadFromHandle`, `window.__registryLoad` (test hook) |
| 2. Record per entry (index.json cache) | `function extract(` — bump `RECORD_FORMAT` when the record shape changes |
| 3. Derive scenarios / refs / systems / flags | `function derive(` (S.scenarios, S.refs, S.assets, **S.systems**, S.refSys), `flagsFor`, `attnRefs`, `sysAttn` |
| Overlap tiers (R-12) | `TIERS`, `overlapBetween`, `overlapsOf`, `sameSourceOf` |
| Router / navigation | `function go(` (views: home, band, scenario, component, system), `openDetail` (row → page morph), `pushNav`, `keyView`, `goKey`, act `back` |
| Home bands, worlds | `BANDS`, `bandStats`, `homeView`, `worldView`, `openWorld`, `closeWorld` |
| Lists | `LIST_COLS` + `listTable` (scenarios: Source → Platforms → Targets, PB column), `compTable` (one row per component, `partChips`), `intPlats` / `platChips` (iPaaS teal, broker violet), `sysTable`, `decisionsTable` |
| Relationship map = explorer start (V-1, 0.8) | `MTYPES`, `mapObjects`, `mapList`, `mapWorld`, `S.mx` (type, q, stack, via), events `data-mtype` / `data-mstart` / act `mreset` |
| Explorer (verbs) | `scRel`, `coRel` (component), `plRel` (platform), `sysRel`, `compNeighbours`; `relSvg` (drawing; left column = previous node, V-3), `explorerHtml`, `toggleVerb`, `pivot(key, via)` (stores the inverse verb, `INVERSE` / `FLIP`, W-1), `crumbTo`, `X.via`, `dive`, `#pageRel` |
| Detail pages | `factsHtml`, `sideLists`, `detailHead`, `componentView`, `platformView`, `systemView`, `scenarioView`, `madeOfRows` |
| Flow diagram (named artifacts) | `chainSvg`, `flowPanel` |
| High-level design (trial, 0.8.1) | `hldModel` (nodes, ordered links, steps), `hldDoc` (13 sections → blocks p / list / table / note / diagram), `hldHtml`, `hldMarkdown` + `hldMermaid`, `hldView`; route `hld`; acts `hld`, `hldcopy`, `hldmd`, `hldprint` |
| Open in Pattern Bench (R-14) | `pbAddress`, `canvasEntry`, `pbButton`, `statusMarkers`, `pbPayload`, `openInPB`, `pbDialog`, `toast`, `saveBlob` |
| Sticky layers (W-4, 0.9) | `measureSticky`, `onScrollSticky` (`.world.compact`), Escape / Alt+← = back; `.world` uses `overflow: clip` (hidden would break sticky) |
| Scenario export ≠ version (W-2, 0.9) | no version shown; Exports panel "Export n · date"; `rec.version` kept internally (file names, PB payloads, `data-v`) |
| Draft 0.10 block (before the test hook) | `Draft 0.10`: R-1 `readConfigFiles` (landscape.json, inbox.json), `renderCfgBadge`, `configBanner`; R-5 `extract010` (edgeMissing, names, liveVersions, integ, apps); R-3 `inboxItems`, `inboxTriage` (in `derive`, export order, first released keeps names), `flags010`, `inboxView`, `inboxApprove` / `inboxMapDialog` / `inboxReject`; saving `saveRegistryFile` / `saveConfig` / `saveInbox` / `addLifecycle` (FS Access into the folder, else download; `S.saved` test hook); R-2 `openSettings010`; R-4 `pbPayload010`; R-6 `versionHistoryHtml`; R-7 `retireDeps` / `retireBlocked` / `retireWizard`, `removeDeps` / `removeBlocked` / `removeWizard`; `act010`; `window.__registry` |
| Draft 0.11 block (before the test hook) | `Draft 0.11`: `buildLifecycle` wrapper (object events: artifact / component retired · active · removed), `scenario-ids.json` (`displayIdOf`, `assignIds`, `saveIds`), `derive` wrapper (`S.arts`, `S.allComps`, `S.dobjs`, canonical platforms + inferred subtypes, orphans), bands `ar` + Connected applications (W-16), `listTable` (W-11), `coWorld`/`compTable`, `arWorld`/`artTable`, `componentView` / `artifactView` (W-9), `detailHead` actions (W-13), `scenarioView` wrapper (W-14), `overlapBetween` / `scRel` (feeds both ways, W-12), `objRetireWizard` / `objRemove` / `objReactivate` (W-10), `inboxItems` wrapper (data object, required attributes, retired / reserved, data-object spelling), `pbPayload` 1.0 |
| Shared helpers | `<script id="landscape-shared">` = `tools/landscape-shared.js` (same file in Pattern Bench) → `window.__shared`; edit the .js then `python3 tools/sync_shared.py` |
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
- Test landscape (X-1): `python3 tools/gen_landscape.py registry-data` (landscape.json + 24 scenarios entry 0.7 + test-cases/), then
  `python3 tools/gen_sales_order.py <pattern-bench.html> registry-data` (Sales order distribution, written through Pattern Bench; also copies
  examples/ into the Pattern Bench folder).
- Suites: `tests/test_registry_010.py` (54), `tests/test_registry_011.py` (42), `tests/test_cross_app.py` (15, PB_HTML=path to pattern-bench.html).
- Files in `registry-data/`: `landscape.json` (config), `inbox.json` (Inbox decisions, names changed), `lifecycle.json` (retire / remove events,
  who · date · why), `test-cases/` (never loaded by the app).

## Commits
End commit messages with the attribution lines the session gives; push to `main` (draft 0.11 round: `feature/0.11`, merge after Suddha's test).
