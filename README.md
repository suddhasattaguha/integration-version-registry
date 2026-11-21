# Integration Version Registry

A registry and traceability app for integration designs exported from
[Pattern Bench](https://github.com/suddhasattaguha/pattern-bench). It reads a folder
of registry entries and traces scenarios, components, versions and decisions across them.

**Status:** draft 0.7, reads Pattern Bench export schema v0.5 / v0.6.

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

## What draft 0.7 does

- **Three kinds of things:** **scenarios** (end-to-end flows), **components** (named artifacts inside
  an integration platform or broker — APIs, processes, topics, queues) and **connected systems**
  (the applications at the ends: S/4HANA, Salesforce, DHL …; one application = one connected system,
  whether it calls a flow or receives from it).
- **Home = bands:** Scenarios, Components, Connected systems, Open decisions, Relationship map.
- **Lists:** Scenarios show the flow in order — **Source → Platforms → Targets** — and an
  **Open in Pattern Bench** button per row. Components and Connected systems lists are plain lists.
- **One detail page per object type, opened the same way** (the row lifts into the page):
  header facts (scenario: id, type, description · component: platform, type, asset, versions ·
  system: role, endpoints), the main frame, and a side panel with the relationships grouped by type.
  - Scenario: the flow as named artifacts leads, then made-of components, versioning decisions and the explorer.
  - Component / connected system: the relationship explorer, open, plus versions & lifecycle / endpoints.
- **Relationship explorer — by relationship type (verbs):** made of · triggered by · delivers to · feeds ·
  fed by · runs alongside · shares · used in · called by · calls · has versions · triggers · receives from · exposes.
  Click a box to re-centre; double-click or hold to open its page.
- **Open in Pattern Bench:** opens Pattern Bench 2.0 in its own window with this scenario's canvas export
  (`<id>.v<n>.canvas.json` next to the registry entry) and its **current status** as view-only markers
  (lifecycle, newer version elsewhere, flags, shared with other scenarios). Pattern Bench address: ⚙ next to
  the button; default = `pattern-bench.html` **in the same folder as `registry-app.html`** (local use), or
  `/pattern-bench/pattern-bench.html` on GitHub Pages. If it can't be reached, download canvas + markers instead.
  Not inside claude.ai artifact previews (new windows are blocked there).
- **Overlap rule (tiers):** same path · feeds / fed by · shared API · shared asset — strong; same
  end-application endpoint — weak. Sharing only the same caller is not an overlap (shown as a note).
- **Relationship map:** scenarios ↔ shared platform / broker assets, with connected systems as their own group.
- **Flags:** impact, lifecycle, warning, data. **Download marker list** (same status markers as a file).

```
Integration Registry\          (local use)
├─ registry-app.html
├─ pattern-bench.html          ← Pattern Bench 2.0, same folder
└─ registry-data\              ← "Open local folder" points here
```

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
