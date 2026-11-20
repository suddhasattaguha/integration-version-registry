# Integration Version Registry

A registry and traceability app for integration designs exported from
[Pattern Bench](https://github.com/suddhasattaguha/pattern-bench). It reads a folder
of registry entries and traces scenarios, components, versions and decisions across them.

**Status:** draft 0.1, reads Pattern Bench export schema v0.5.

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

1. Open `registry-app.html` directly in Chrome or Edge.
2. Click **Open registry folder** and pick your registry folder.

The folder is picked each time the app opens. Chrome and Edge get read and write access
(so `index.json` can be cached). Other browsers, or the app opened inside a preview frame,
fall back to a read-only folder upload.

## What draft 0.1 does

- **Overview:** counts, needs attention, recently changed, upcoming retirements.
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
- Remember the folder between sessions
- "Entry → exit" column (parked)
