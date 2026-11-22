"""X-1 / C-5 test example (contract 1.0: data object Sales Order, Region EU) "Sales order distribution", written by Pattern Bench itself (so refs and names are exactly what it exports).
  inbound API (caller S/4HANA) → BTP iFlow → topic → fan-out (a) iFlow → Salesforce API, (b) iFlow → Legacy WMS folder (proposed),
  (c) iFlow → DHL API on a v1 ║ v2 parallel version (application attached without endpoint).
Writes: registry-data/landscape/scn-sod001.v1.{registry,canvas}.json (finished state)
        <pattern-bench>/examples/sales-order-distribution.json (walk-through start: all 4 ends empty) + examples/landscape.json
Usage: python3 tools/gen_sales_order.py <path to pattern-bench.html> [registry-data]"""
import json, os, sys, copy, shutil
from playwright.sync_api import sync_playwright
PB = os.path.abspath(sys.argv[1]); DATA = sys.argv[2] if len(sys.argv) > 2 else "registry-data"
EX = os.path.join(os.path.dirname(PB), "examples"); os.makedirs(EX, exist_ok=True)
cfg = json.load(open(os.path.join(DATA, "landscape.json")))
B = lambda p, l: {"pattern": p, "label": l}
start = {"format": "pattern-bench-flow", "version": 1, "origin": {"x": 260, "y": 420},
  "blocks": [B("api-to-process", "API-to-Process"), B("process-to-publish", "Process-to-Publish"), B("consume-to-process", "Consume-to-Process"), B("process-to-api", "Process-to-API")],
  "buildOrder": [0, 1, 2, 3], "versions": [],
  "containers": [{"block": 0, "at": "in", "platform": "BTP IS", "asset": "SOD-Intake"}, {"block": 0, "at": "out", "platform": "BTP IS", "asset": "SOD-Intake"},
                 {"block": 2, "at": "m0", "platform": "Solace", "asset": "Q-SOD-CRM"}, {"block": 2, "at": "out", "platform": "BTP IS", "asset": "SOD-CRM-Sync"}],
  "caller": False, "ripples": [], "marks": [], "mode": "composite",
  "branches": [{"kind": "out", "row": 1, "anchor": [{"ref": "t1", "side": "out"}, {"ref": "t2", "side": "in"}], "blocks": [B("consume-to-process", "Consume-to-Process"), B("process-to-file", "Process-to-File")]},
               {"kind": "out", "row": -1, "anchor": [{"ref": "t1", "side": "out"}, {"ref": "t2", "side": "in"}], "blocks": [B("consume-to-process", "Consume-to-Process"), B("process-to-api", "Process-to-API")]}],
  "callers": [], "branchVersions": [{"ref": "b1.1", "variant": "p2a-contract-parallel"}], "lineFlips": [], "callerVer": [], "laneChoice": [], "compositeRipples": [],
  "componentAssets": [{"key": "@t1:out", "name": "SOD-Order-Events"}],
  "std": {"pb": "2.2", "branchContainers": [{"key": "@b0.0:m0", "platform": "Solace", "asset": "Q-SOD-WMS"}, {"key": "@b0.0:out", "platform": "BTP IS", "asset": "SOD-WMS-Feed"},
                                            {"key": "@b1.0:m0", "platform": "Solace", "asset": "Q-SOD-Carrier"}, {"key": "@b1.0:out", "platform": "BTP IS", "asset": "SOD-Carrier-Sync"}]}}
done = copy.deepcopy(start)
done["caller"] = True
done["containers"] += [{"block": 3, "at": "out", "name": "Salesforce Sales Cloud", "process": "Order sync"}, {"block": 0, "at": "caller", "name": "SAP S/4HANA (P01)", "process": "Sales order creation"}]
done["componentAssets"] += [{"key": "@t3:out", "name": "Salesforce Order API"}, {"key": "@b0.1:out", "name": "/inbound/orders"}]
done["std"]["branchContainers"] += [{"key": "@b0.1:out", "name": "Legacy WMS", "process": "Warehouse inbound"}, {"key": "@b1.1:out", "name": "DHL Parcel", "process": "Shipment booking"}]
META = {"id": "scn-sod001", "version": 1, "name": "Sales order distribution", "description": "Sales orders from S/4HANA are published once and fan out to Salesforce, the legacy warehouse (file) and DHL (API v1 ║ v2).",
        "author": "Suddhasatta Guha", "tags": ["O2C", "sales order", "C-5 example"], "relations": [], "why": [],
        "dataObject": {"name": "Sales Order", "code": "SO"}, "attributes": {"region": "EU", "domain": "O2C"}}
done["scenario"] = dict(META)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1600, "height": 1000}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file:///" + PB.replace(os.sep, "/").lstrip("/")); pg.wait_for_timeout(300)
    pg.evaluate("c => window.__debug.setLandscape(c, 'Registry', false)", cfg)
    for flow in (start, done):
        prob = pg.evaluate("f => window.__debug.validateFlow(f)", flow)
        assert not prob, prob
    pg.evaluate("f => window.__debug.loadFlow(f)", start)
    miss = pg.evaluate("() => window.__debug.missingEnds()")
    assert len(miss) == 4, miss
    s0 = pg.evaluate("() => window.__debug.serializeFlow()"); s0["savedAt"] = "2026-11-22T13:00:00.000Z"
    json.dump(s0, open(os.path.join(EX, "sales-order-distribution.json"), "w"), indent=2)
    pg.evaluate("f => window.__debug.loadFlow(f)", done)
    pg.evaluate("() => { window.__debug.setDataObject('Sales Order'); window.__debug.setScnAttrs({ region:'EU', domain:'O2C' }); }")
    assert pg.evaluate("() => window.__debug.missingEnds().length") == 0
    meta = dict(META, exportedAt="2026-11-22T13:00:00.000Z")
    spec = pg.evaluate("m => window.__debug.buildSpec(m, 'scn-sod001.v1.canvas.json')", meta)
    canvas = pg.evaluate("() => window.__debug.serializeFlow()"); canvas["savedAt"] = meta["exportedAt"]
    assert not errs, errs
    b.close()
for fn, obj in (("scn-sod001.v1.registry.json", spec), ("scn-sod001.v1.canvas.json", canvas)):
    json.dump(obj, open(os.path.join(DATA, "landscape", fn), "w"), indent=2)
shutil.copy(os.path.join(DATA, "landscape.json"), os.path.join(EX, "landscape.json"))
print("Sales order distribution: proposed", spec["proposed"], "· versions", [v["label"] for v in spec["versions"]])
