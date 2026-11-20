# Integration Version Registry

A registry and traceability app for integration designs exported from
[Pattern Bench](https://github.com/suddhasattaguha/pattern-bench). It reads a folder
of registry entries and traces scenarios, components, versions and decisions across them.

**Status:** draft 0.2, reads Pattern Bench export schema v0.5.

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

`registry-data/_sample/` holds generated sample scenarios to try the app — delete that
folder when real data is in.

## What draft 0.2 does

- **Overview:** clickable tiles that drill down (scenarios, shared components, open decisions,
  flagged scenarios); a **relationship map** (scenarios ↔ shared assets or components — click a
  scenario, asset/component to see what it touches and which scenarios overlap); a
  scenario × scenario **overlap matrix**; needs attention, recently changed, upcoming retirements.
- **Decisions:** every versioning decision across all scenarios, searchable, open only or all.
- **All scenarios:** searchable, sortable directory with flags.
- **Components:** each `ref` with its versions, lifecycle stage and which scenarios use which version.
- **Scenario detail:** simple flow diagram, versioning decisions, components, overlap with other flows, relations, history.
- **Flags:** impact (newer version of a shared component elsewhere), lifecycle (deprecated or retired version),
  warning (unacknowledged ⚠ in the design), data (container without platform or asset label).
- **Download marker list** for Pattern Bench's planned marker import.

## Lifecycle file (draft format)

```json
{ "schema": "pattern-bench.lifecycle", "schemaVersion": "0.1",
  "events": [ { "ref": "...", "version": "...", "stage": "planned|inTest|inProduction|deprecated|retired",
                "date": "...", "who": "...", "note": "...", "retireOn": "..." } ] }
```

The latest event per `ref@version` wins. Read-only in draft 0.1.

## Next candidates

- One-click lifecycle events (write `lifecycle.json`)
- Acknowledge a flag from the registry
- Virtual scrolling, column chooser, directory export
- "Entry → exit" column (parked)
