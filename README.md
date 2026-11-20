# Integration Version Registry

A registry and traceability app for integration designs exported from
[Pattern Bench](https://github.com/suddhasattaguha/pattern-bench). It reads a folder
of registry entries and traces scenarios, components, versions and decisions across them.

**Status:** draft 0.5, reads Pattern Bench export schema v0.5.

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

## What draft 0.3 does

- **Home = bands:** Scenarios, Components, Open decisions and Relationship map — big number,
  plus how many need attention. No top menu: the bands are the navigation.
- **A band opens into its own full-frame view** (the band morphs open; Back reverses it):
  - **Scenarios / Components:** sortable, searchable lists; rows that need attention are
    highlighted and come first ("Needs attention only" filter).
    - **Click a scenario row** → its full detail page. **Click a component row** → its relationship
      explorer opens directly; "Open component" there leads to the component page (versions and
      lifecycle, who uses which version, open decisions, direct neighbours, relationships).
    - **Explore** (the button on each row) → the **relationship explorer** grows open: overlapping
      scenarios (or users of a component) on the left, its components grouped by asset (or its
      versions) on the right. **Click a box** to explore it in place (breadcrumb to step back);
      **double-click or press and hold** to dive into it in its own band.
  - **Open decisions:** every versioning decision across scenarios; rows with open warnings highlighted.
  - **Relationship map:** scenarios ↔ shared assets or components; click to highlight.
- **Overlap rule (tiers):** same path (shared connection) · feeds / fed by (one publishes on a topic
  the other consumes) · shared API (an integration API called by several apps) · shared asset
  (process, queue, topic) — all strong; shared endpoint (same end-application API or folder) — weak.
  Sharing only the same source (caller) is not an overlap; it is shown as a note.
- **Scenario detail:** simplified Pattern Bench canvas (from the exported `*.canvas.json` in the
  registry folder; falls back to a generated diagram), versioning decisions, versioning decisions, components, overlap with other flows, relations, history.
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
