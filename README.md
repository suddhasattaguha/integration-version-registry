# Integration Version Registry

A registry and traceability app for integration designs exported from
[Pattern Bench](https://github.com/suddhasattaguha/pattern-bench). It reads a folder
of registry entries and traces scenarios, components, versions and decisions across them.

**Status:** draft 0.6, reads Pattern Bench export schema v0.5 / v0.6.

## How it works

```
Pattern Bench ──"Export for registry"──▶  Registry folder
                                          ├─ *.registry.json  (scenario entries)
                                          ├─ *.canvas.json    (canvas exports, presence only)
                                          ├─ lifecycle.json   (optional, lifecycle stages)
                                          └─ index.json       (cache, rebuildable)
                                                 │
                                          registry-app.html
```

## Run it

Open `registry-app.html` (or the GitHub Pages address, once Pages is enabled). It reads
the registry from **`registry-data/`** in this repo by default — no folder picking.

- **Default source:** `registry-data/` on GitHub (sub-folders included). Read-only: nothing
  is written back. Uses GitHub's public API (about 60 anonymous reads per hour per viewer).
- **Open local folder:** use a folder on your computer instead, for this browser session only.
  **Back to GitHub** (or reopening the app) returns to the default. In Chrome / Edge a local
  folder gets read + write (`index.json` cache); elsewhere it opens read-only.

To add a scenario: put the Pattern Bench registry export (`*.registry.json`, with its
`*.canvas.json`) into `registry-data/` and commit it.

`registry-data/landscape/` holds a generated test landscape: 22 composite scenarios across
Order-to-Cash, master data, Procure-to-Pay, finance and HR (S/4HANA, Salesforce, Ariba,
SuccessFactors, EWM, webshop, banks …) that share APIs, processes, topics and queues — no
versioning yet. Regenerate with `python3 tools/gen_landscape.py registry-data/landscape`.

## What draft 0.6 does

- **Three kinds of things:** **scenarios** (end-to-end flows), **components** (named artifacts inside
  an integration platform or broker — APIs, processes, topics, queues) and **connected systems**
  (the applications at the ends: S/4HANA, Salesforce, DHL …). Connected systems are not components;
  one application is one connected system whether it calls a flow or receives from it.
- **Home = bands:** Scenarios, Components, Connected systems, Open decisions and Relationship map —
  big number, plus how many need attention. A band opens into its own full-frame view; Back reverses it.
  - **Click a scenario row** → its detail page. **Click a component or system row** → its relationship explorer.
- **Relationship explorer — by relationship type.** The selected node shows its relationships as verbs;
  pick one (or several, or "expand all") to expand it into the related scenarios, components or systems:

  | From | Relationship | To |
  |---|---|---|
  | Scenario | made of / triggered by / delivers to | components / connected system |
  | Scenario | feeds / fed by / runs alongside (same path) / shares (API, asset, endpoint) | scenarios |
  | Component | used in / called by / calls / has versions | scenarios / components / versions |
  | Connected system | triggers / receives from / exposes | scenarios / endpoints |

  Click a box to re-centre on it (breadcrumb to step back); double-click or press and hold to dive into its band.
- **Overlap rule (tiers):** same path · feeds / fed by · shared API · shared asset — strong; same
  end-application endpoint — weak. Sharing only the same caller is not an overlap (shown as a note).
- **Scenario detail:** the flow as a chain of named artifacts (connected system → platform / broker
  assets with their components → connected systems; no Pattern Bench pattern blocks), versioning
  decisions, components, connected systems, overlap with other flows, relations, history.
- **Relationship map:** scenarios ↔ shared platform / broker assets, with connected systems as their own group.
- **Flags:** impact (newer version of a shared component elsewhere), lifecycle (deprecated or retired version),
  warning (unacknowledged ⚠ in the design), data (container without platform or asset label).
- **Download marker list** for Pattern Bench's planned marker import.

## Lifecycle file (draft format)

```json
{ "schema": "pattern-bench.lifecycle", "schemaVersion": "0.1",
  "events": [ { "ref": "...", "version": "...", "stage": "planned|inTest|inProduction|deprecated|retired",
                "date": "...", "who": "...", "note": "...", "retireOn": "..." } ] }
```

The latest event per `ref@version` wins. Read-only.

## Next candidates

- One-click lifecycle events (write `lifecycle.json`)
- Acknowledge a flag from the registry
- Virtual scrolling, column chooser, directory export
- "Entry → exit" column (parked)
