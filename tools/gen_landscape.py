"""Generate the test landscape for the Registry app and Pattern Bench (X-1, Nov 22 2026):
  registry-data/landscape.json           landscape config schema 0.1 (platforms + capabilities, components, applications with codes,
                                         entity types, glossary seed, naming rules N-1..N-3)
  registry-data/landscape/*.json         24 scenarios as registry entry 0.7 + Pattern Bench canvas files (names derived from the rules,
                                         an application on every edge end, two scheduled starts)
  registry-data/test-cases/<case>/       negative set for the Playwright suites (not loaded by default)
Refs are built the way Pattern Bench builds them (slug(platform)/slug(component)#type, endapp/<app>/<endpoint>#type, caller/<app>#app),
so a scenario opened in Pattern Bench and exported again keeps its refs.
Usage: python3 tools/gen_landscape.py registry-data     (the 'Sales order distribution' example comes from tools/gen_sales_order.py)"""
import json, os, sys, re, hashlib, shutil, copy
ROOT_OUT = sys.argv[1] if len(sys.argv) > 1 else "registry-data"
if os.path.basename(os.path.normpath(ROOT_OUT)) == "landscape": ROOT_OUT = os.path.dirname(os.path.normpath(ROOT_OUT))   # old usage
OUT = os.path.join(ROOT_OUT, "landscape"); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".json") and not f.startswith("scn-sod"): os.remove(os.path.join(OUT, f))
AUTHOR = "Suddhasatta Guha"
LANDSCAPE_VERSION = 1
def slug(t): return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", str(t or "").strip().lower()))
def code_of(t, n=12): return re.sub(r"[^A-Z0-9]", "", str(t).upper())[:n]

# ---------- asset catalogue: container ref -> (kind, platform, asset, process/label) ----------
A = {}
def ipaas(ref, platform, asset): A[ref] = dict(kind="iPaaS", platform=platform, asset=asset)
def broker(ref, asset): A[ref] = dict(kind="broker", platform="Solace", asset=asset)
def endapp(ref, app, label, process): A[ref] = dict(kind="endApp", platform="", asset=label, app=app, process=process)
def caller(ref, app, process): A[ref] = dict(kind="caller", platform="", asset=app, app=app, process=process)

# integration platforms
ipaas("btpis/sales-order-exp", "BTP IS", "Sales-Order-Exp")
ipaas("btpis/order-status", "BTP IS", "Order-Status-Dist")
ipaas("btpis/delivery-dist", "BTP IS", "Delivery-Dist")
ipaas("btpis/ewm-warehouse", "BTP IS", "EWM-Warehouse-Sync")
ipaas("btpis/invoice-out", "BTP IS", "Invoice-Outbound-DRC")
ipaas("btpis/invoice-crm", "BTP IS", "Invoice-to-CRM")
ipaas("btpis/bp-replication", "BTP IS", "BP-Replication")
ipaas("btpis/material-master", "BTP IS", "Material-Master-Dist")
ipaas("btpis/price-dist", "BTP IS", "Price-Dist")
ipaas("btpis/ariba-procure", "BTP IS", "Ariba-Procurement")
ipaas("btpis/invoice-scan", "BTP IS", "Invoice-Scan-OCR")
ipaas("btpis/payment-files", "BTP IS", "Payment-Files")
ipaas("btpis/bank-statement", "BTP IS", "Bank-Statement-In")
ipaas("btpis/sf-employee", "BTP IS", "SF-Employee-Sync")
ipaas("btpis/payroll-export", "BTP IS", "Payroll-Export")
ipaas("ais/webshop-gateway", "Azure Logic Apps", "Webshop-Gateway")
ipaas("ais/crm-connector", "Azure Logic Apps", "CRM-Connector")
ipaas("ais/carrier-hub", "Azure Logic Apps", "Carrier-Hub")
ipaas("ais/catalog-sync", "Azure Logic Apps", "Catalog-Sync")
ipaas("ais/datalake-ingest", "Azure Logic Apps", "DataLake-Ingest")
ipaas("ais/hr-identity", "Azure Logic Apps", "HR-Identity")
# brokers: topic assets and one queue asset per subscriber
for r, a in [("solace/sales-order", "Sales-Order-Events"), ("solace/order-status", "Order-Status-Events"), ("solace/delivery", "Delivery-Events"),
             ("solace/invoice", "Invoice-Events"), ("solace/business-partner", "BP-Events"), ("solace/material", "Material-Events"),
             ("solace/price", "Price-Events"), ("solace/purchase-order", "PO-Events"), ("solace/payment", "Payment-Events"), ("solace/employee", "Employee-Events")]:
    broker(r, a)
for q in ["q-s4-order", "q-crm-order", "q-dwh-order", "q-webshop-status", "q-crm-status", "q-ewm-delivery", "q-carrier-delivery", "q-s4-goods-issue",
          "q-webshop-tracking", "q-ksef", "q-peppol", "q-dwh-invoice", "q-crm-invoice", "q-crm-bp", "q-ariba-supplier", "q-dwh-bp", "q-pim-material",
          "q-ewm-product", "q-dwh-material", "q-webshop-material", "q-webshop-price", "q-crm-price", "q-ariba-po", "q-dwh-po", "q-bank-payment",
          "q-treasury", "q-entra", "q-servicenow", "q-s4-employee", "q-payroll", "q-entra-leaver"]:
    broker("solace/" + q, q.upper().replace("Q-", "Q-", 1).title().replace("Q-", "Q-"))
# end applications (one container per API / folder, as the registry keys components container#type)
endapp("endapp/s4-salesorder", "SAP S/4HANA (P01)", "S/4 API_SALES_ORDER_SRV", "Sales order creation")
endapp("endapp/s4-delivery", "SAP S/4HANA (P01)", "S/4 API_OUTBOUND_DELIVERY_SRV", "Goods issue posting")
endapp("endapp/s4-bp", "SAP S/4HANA (P01)", "S/4 API_BUSINESS_PARTNER", "Business partner maintenance")
endapp("endapp/s4-po", "SAP S/4HANA (P01)", "S/4 API_PURCHASEORDER_PROCESS_SRV", "PO confirmation")
endapp("endapp/s4-supplier-invoice", "SAP S/4HANA (P01)", "S/4 API_SUPPLIERINVOICE_PROCESS_SRV", "Supplier invoice posting")
endapp("endapp/s4-bank-statement", "SAP S/4HANA (P01)", "S/4 Bank Statement Import (CAMT.053)", "Electronic bank statement")
endapp("endapp/s4-payment-out", "SAP S/4HANA (P01)", "S/4 Payment Medium folder", "Payment run (F110)")
endapp("endapp/sfdc-order", "Salesforce Sales Cloud", "Salesforce Order API", "Order sync")
endapp("endapp/sfdc-account", "Salesforce Sales Cloud", "Salesforce Account API", "Account sync")
endapp("endapp/sfdc-invoice", "Salesforce Sales Cloud", "Salesforce Invoice API", "Invoice visibility")
endapp("endapp/sfdc-pricebook", "Salesforce Sales Cloud", "Salesforce Pricebook API", "Price list sync")
endapp("endapp/webshop-order", "Webshop (commercetools)", "commercetools Order API", "Order status")
endapp("endapp/webshop-catalog", "Webshop (commercetools)", "commercetools Product API", "Catalogue")
endapp("endapp/webshop-price", "Webshop (commercetools)", "commercetools Price API", "Pricing")
endapp("endapp/ewm-delivery", "SAP EWM", "EWM Warehouse Request API", "Outbound picking")
endapp("endapp/ewm-product", "SAP EWM", "EWM Product API", "Warehouse product master")
endapp("endapp/carrier-dhl", "DHL Parcel", "DHL Shipment API", "Shipment booking")
endapp("endapp/ksef", "KSeF (PL e-invoicing)", "KSeF Invoice API", "Statutory e-invoice")
endapp("endapp/peppol-ap", "Peppol Access Point", "Peppol AP API", "Cross-border e-invoice")
endapp("endapp/datalake", "Azure Data Lake", "Data Lake landing folder", "Analytics ingest")
endapp("endapp/ariba-supplier", "SAP Ariba", "Ariba Supplier API", "Supplier master")
endapp("endapp/ariba-po", "SAP Ariba", "Ariba Purchase Order API", "PO to supplier")
endapp("endapp/ocr-sftp", "Invoice OCR service", "OCR outbox SFTP", "Scanned invoices")
endapp("endapp/pim", "PIM (Akeneo)", "Akeneo Product API", "Product enrichment")
endapp("endapp/bank-nordea-out", "Nordea Bank", "Nordea SFTP outbox (pain.001)", "Payments")
endapp("endapp/bank-nordea-in", "Nordea Bank", "Nordea SFTP inbox (camt.053)", "Statements")
endapp("endapp/treasury-kyriba", "Kyriba Treasury", "Kyriba Payments API", "Cash positioning")
endapp("endapp/entra-id", "Microsoft Entra ID", "Microsoft Graph Users API", "Identity lifecycle")
endapp("endapp/servicenow-hr", "ServiceNow HRSD", "ServiceNow HR Case API", "Onboarding tasks")
endapp("endapp/adp-sftp", "ADP Payroll", "ADP SFTP inbox", "Payroll input")
caller("caller/webshop", "Webshop (commercetools)", "Place order")
caller("caller/mobile-sales", "Sales Rep Mobile App", "Create order")
caller("caller/sfdc", "Salesforce Sales Cloud", "Order / account change")
caller("caller/s4-p01", "SAP S/4HANA (P01)", "Business event")
caller("caller/ewm", "SAP EWM", "Goods issue confirmation")
caller("caller/ariba", "SAP Ariba", "Supplier document")
caller("caller/sf-ec", "SuccessFactors Employee Central", "Employee change")
caller("caller/pim", "PIM (Akeneo)", "Product published")
caller("caller/dhl", "DHL Parcel", "Tracking webhook")

# scheduled starts (C-6)
ipaas("btpis/bank-statement-poll", "BTP IS", "Bank-Statement-Poll")
ipaas("btpis/price-pull", "BTP IS", "Price-Pull")
ipaas("btpis/payment-delivery", "BTP IS", "Payment-Delivery")
# "Sales order distribution" (C-5 example, written by tools/gen_sales_order.py through Pattern Bench) — components in the config
for r, a_ in [("btpis/sod-intake", "SOD-Intake"), ("btpis/sod-crm", "SOD-CRM-Sync"), ("btpis/sod-wms", "SOD-WMS-Feed"), ("btpis/sod-carrier", "SOD-Carrier-Sync")]: ipaas(r, "BTP IS", a_)
for r, a_ in [("solace/sod-events", "SOD-Order-Events"), ("solace/q-sod-crm", "Q-SOD-CRM"), ("solace/q-sod-wms", "Q-SOD-WMS"), ("solace/q-sod-carrier", "Q-SOD-Carrier")]: broker(r, a_)
endapp("endapp/s4-price", "SAP S/4HANA (P01)", "S/4 API_SLSPRICINGCONDITIONRECORD_SRV", "Pricing conditions")

TYPE_NAME = {"api": "API", "process": "Process", "topic": "Topic", "queue": "Queue", "file": "Folder", "app": "App", "scheduler": "Scheduler"}
LABEL = {"api-to-process": "API-to-Process", "process-to-publish": "Process-to-Publish", "consume-to-api": "Consume-to-API",
         "consume-to-process": "Consume-to-Process", "process-to-api": "Process-to-API", "file-to-process": "File-to-Process",
         "process-to-file": "Process-to-File", "consume-to-file": "Consume-to-File",
         "schedule-to-process-api": "Schedule-to-Process (pull API)", "schedule-to-process-file": "Schedule-to-Process (poll folder)"}
# Pattern Bench station keys per pattern: entry (in), mids (m0…), exit (out), pulled source (pull)
KEYS = {"api-to-process": ["in", "out"], "process-to-publish": ["in", "out"], "consume-to-api": ["in", "m0", "out"], "consume-to-process": ["in", "m0", "out"],
        "consume-to-file": ["in", "m0", "out"], "process-to-api": ["in", "out"], "process-to-file": ["in", "out"], "file-to-process": ["in", "out"],
        "schedule-to-process-api": ["in", "out", "pull"], "schedule-to-process-file": ["in", "out", "pull"]}

# ---------- landscape config (schema 0.1) ----------
PLATFORMS = {
  "BTP IS":           dict(id="btp-is", code="BTP", kind="ipaas", capabilities=["api", "process", "file", "scheduler"], aliases=["SAP BTP Integration Suite", "BTP-IS", "btpis"]),
  "Azure Logic Apps": dict(id="azure-logic-apps", code="ALA", kind="ipaas", capabilities=["api", "process", "file", "scheduler"], aliases=["AIS", "Azure Integration Services"]),
  "Azure Functions":  dict(id="azure-functions", code="AFN", kind="ipaas", capabilities=["api", "process", "scheduler"], aliases=[]),
  "SAP API Management": dict(id="sap-apim", code="APIM", kind="ipaas", capabilities=["api"], aliases=["APIM"]),
  "Solace":           dict(id="solace", code="SOL", kind="broker", capabilities=["topic", "queue"], aliases=["Solace PubSub+"]),
}
def plat(name): return PLATFORMS[name]
def cont_ref(cref):
    a = A[cref]
    if a["kind"] in ("iPaaS", "broker"): return slug(a["platform"]) + "/" + slug(a["asset"])
    if a["kind"] == "caller": return "caller/" + slug(a["app"])
    return "endapp/" + slug(a["app"]) + "/" + slug(a["asset"])
def comp_id(cref): a = A[cref]; return plat(a["platform"])["id"] + "/" + slug(a["asset"])
APPS = {}
for r, a in A.items():
    if a["kind"] in ("endApp", "caller"):
        x = APPS.setdefault(a["app"], dict(id=slug(a["app"]), name=a["app"], code="", endpoints=[], aliases=[]))
        if a["kind"] == "endApp" and not any(e["id"] == a["asset"] for e in x["endpoints"]):
            x["endpoints"].append({"id": a["asset"], "type": "file" if any(w in a["asset"].lower() for w in ("sftp", "folder", "outbox", "inbox")) else "api"})
APP_CODES = {"SAP S/4HANA (P01)": "S4P01", "Salesforce Sales Cloud": "SFDC", "Webshop (commercetools)": "CTOOLS", "SAP EWM": "EWM", "DHL Parcel": "DHL",
             "KSeF (PL e-invoicing)": "KSEF", "Peppol Access Point": "PEPPOL", "Azure Data Lake": "ADL", "SAP Ariba": "ARIBA", "Invoice OCR service": "OCR",
             "PIM (Akeneo)": "PIM", "Nordea Bank": "NORDEA", "Kyriba Treasury": "KYRIBA", "Microsoft Entra ID": "ENTRA", "ServiceNow HRSD": "SNOW",
             "ADP Payroll": "ADP", "Sales Rep Mobile App": "MOBSALES", "SuccessFactors Employee Central": "SFEC"}
for k, x in APPS.items(): x["code"] = APP_CODES.get(k, code_of(k, 8))
TMAP = {"api": "API", "process": "IF", "topic": "TP", "queue": "Q", "file": "FL", "scheduler": "SCH"}
RULES = [
  {"id": "N-1", "target": "part", "when": {"partType": "api"}, "mode": "derive",
   "segments": [{"source": "platform.code"}, {"delimiter": "_"}, {"source": "component.code"}, {"delimiter": "_"}, {"source": "partType", "map": TMAP},
                {"delimiter": "_"}, {"source": "free", "label": "Purpose", "optional": True, "maxLength": 20}, {"delimiter": "_"}, {"source": "version", "format": "v{n}", "optional": True}],
   "transforms": ["upper", "noSpaces"], "maxLength": 60, "override": "warn", "level": "block"},
  {"id": "N-2", "target": "part", "when": {"partType": "process"}, "mode": "derive",
   "segments": [{"source": "platform.code"}, {"delimiter": "_"}, {"source": "component.code"}, {"delimiter": "_"}, {"source": "literal", "text": "IF"},
                {"delimiter": "_"}, {"source": "version", "format": "v{n}", "optional": True}],
   "transforms": ["upper", "noSpaces"], "maxLength": 60, "override": "allow", "level": "warn"},
  {"id": "N-3", "target": "part", "when": {}, "mode": "derive",
   "segments": [{"source": "platform.code"}, {"delimiter": "_"}, {"source": "component.code"}, {"delimiter": "_"}, {"source": "partType", "map": TMAP},
                {"delimiter": "_"}, {"source": "version", "format": "v{n}", "optional": True}],
   "transforms": ["upper", "noSpaces"], "maxLength": 60, "override": "block", "level": "warn"},
]
def derive_name(cref, typ, version=1):
    a = A[cref]; p = plat(a["platform"]); c = code_of(a["asset"])
    v = ("_V%d" % version) if version > 1 else ""
    if typ == "api": return f'{p["code"]}_{c}_API{v}'.upper(), "N-1"
    if typ == "process": return f'{p["code"]}_{c}_IF{v}'.upper(), "N-2"
    return f'{p["code"]}_{c}_{TMAP[typ]}{v}'.upper(), "N-3"
ENTITY = [("scenario", "Scenario", "Scenarios"), ("platform", "Platform", "Platforms"), ("component", "Component", "Components"), ("part", "Part", "Parts"),
          ("application", "Application", "Applications"), ("endpoint", "Endpoint", "Endpoints"), ("caller", "Caller", "Callers"), ("version", "Version", "Versions"), ("export", "Export", "Exports")]
GLOSSARY = [("scenario", "An end-to-end integration flow between connected applications.", []),
  ("integration platform (iPaaS)", "A platform that runs integration processes and exposes APIs (e.g. SAP BTP Integration Suite).", []),
  ("message broker", "A platform that carries events on topics and queues (e.g. Solace).", []),
  ("integration component", "A named artifact on a platform or broker (an iFlow, a topic asset …).", ["asset"]),
  ("part", "A piece of a component: API, process, topic, queue, file or scheduler.", []),
  ("connected system / application", "An application that calls a flow or receives from it.", ["connected system"]),
  ("endpoint", "The API or folder of an application a flow uses.", []), ("caller", "The application that calls an exposed API (= an application).", []),
  ("export", "One hand-over from Pattern Bench to the registry — counted, not a version.", []),
  ("version", "A version of a component part (v1, v2 …); at most two live at a time.", [])]
def write_config():
    comps = []
    for r, a in A.items():
        if a["kind"] in ("iPaaS", "broker") and not any(c["id"] == comp_id(r) for c in comps):
            comps.append({"id": comp_id(r), "platform": plat(a["platform"])["id"], "name": a["asset"], "code": code_of(a["asset"]), "aliases": []})
    cfg = {"schema": "landscape-config", "schemaVersion": "0.1", "landscapeVersion": LANDSCAPE_VERSION, "name": "Default landscape",
           "updated": "2026-11-22T12:00:00Z", "origin": "registry",
           "entityTypes": [{"id": i, "label": l, "plural": p} for i, l, p in ENTITY],
           "glossary": [{"id": slug(t), "term": t, "definition": d, "aliases": al} for t, d, al in GLOSSARY],
           "namingRules": RULES,
           "platforms": [dict(name=n, **{k: v for k, v in p.items()}) for n, p in PLATFORMS.items()],
           "components": comps, "applications": list(APPS.values()),
           "changeLog": [{"at": "2026-11-22T12:00:00Z", "action": "import", "item": "settings", "note": "generated by tools/gen_landscape.py (X-1)", "landscapeVersion": LANDSCAPE_VERSION}]}
    for p in cfg["platforms"]: p["id"] = PLATFORMS[p["name"]]["id"]
    with open(os.path.join(ROOT_OUT, "landscape.json"), "w") as f: json.dump(cfg, f, indent=2)
    return cfg

def sid(name): return "scn-" + hashlib.sha1(name.encode()).hexdigest()[:6]

def scenario(name, desc, tags, date, main, branches=(), callers=(), schedule=None, out=None, mutate=None):
    """main / branch blocks: (pattern, [connector refs in order]); callers: (caller-container, attach) with attach = 't0' / 'b1.0'."""
    comps, idx, links, conts = [], {}, [], {}
    def cont_id(cref):
        if cref not in conts:
            a = A[cref]; d = {"id": f"k{len(conts)+1}", "ref": cont_ref(cref), "kind": a["kind"], "platform": a["platform"], "asset": a["asset"]}
            if a["kind"] in ("iPaaS", "broker"): d["platformId"] = plat(a["platform"])["id"]; d["componentId"] = comp_id(cref)
            else: d["asset"] = a["app"]; d["name"] = a["app"]; d["process"] = a["process"]; d["appId"] = slug(a["app"]); d["platform"] = ""
            conts[cref] = d
        return conts[cref]["id"]
    def comp(ref):
        if ref not in idx:
            cref, typ = ref.split("#"); a = A[cref]; k = a["kind"]
            c = {"id": f"c{len(comps)+1}", "ref": cont_ref(cref) + "#" + typ, "type": typ, "version": "v1",
                 "owner": "integration" if k in ("iPaaS", "broker") else k, "container": cont_id(cref)}
            if k in ("iPaaS", "broker"):
                c["name"], c["nameRule"] = derive_name(cref, typ); c["autoName"] = False; c["nameOverridden"] = False
            else:
                c["name"] = a["asset"] if k == "endApp" else a["app"]; c["autoName"] = False; c["nameRule"] = None; c["nameOverridden"] = False
            comps.append(c); idx[ref] = c["id"]
        return idx[ref]
    def link(a, b):
        L = {"from": comp(a), "to": comp(b), "fromRef": cont_ref(a.split("#")[0]) + "#" + a.split("#")[1], "toRef": cont_ref(b.split("#")[0]) + "#" + b.split("#")[1]}
        if L not in links: links.append(L)
    rows = [main] + [br["blocks"] for br in branches]
    blocks = []
    for r, row in enumerate(rows):
        for o, (pat, refs) in enumerate(row):
            for x in refs: comp(x)
            if pat.startswith("schedule-to-process"): link(refs[0], refs[1]); link(refs[2], refs[1])
            else:
                for a, b in zip(refs, refs[1:]): link(a, b)
            blocks.append({"id": f"b{len(blocks)+1}", "templateId": pat, "label": LABEL[pat], "row": r, "order": o, "components": [idx[x] for x in refs]})
    blockref = {f"t{i}": blk for i, blk in enumerate(main)}
    for k, br in enumerate(branches):
        for j, blk in enumerate(br["blocks"]): blockref[f"b{k}.{j}"] = blk
    for ccont, attach in callers:
        app = ccont + "#app"; comp(app); link(app, blockref[attach][1][0])
    # ---- canvas (as Pattern Bench saves it): labels at the station that carries each run, endpoint / topic names, branch containers (P-2)
    cv_cont, branch_cont, assets = [], [], []
    def lab(ref):
        a = A[ref.split("#")[0]]
        return {"platform": a["platform"], "asset": a["asset"]} if a["kind"] in ("iPaaS", "broker") else {"name": a["app"], "process": a["process"]}
    def put(rowref, i, at, ref):
        if rowref == "t": cv_cont.append(dict(block=i, at=at, **lab(ref)))
        else: branch_cont.append(dict(key=f"@{rowref}{i}:{at}", **lab(ref)))
    def name_asset(rowref, i, at, ref):
        a = A[ref.split("#")[0]]; typ = ref.split("#")[1]
        if typ == "topic" or (a["kind"] == "endApp" and typ in ("api", "file")):
            assets.append({"key": f"@{rowref}{i}:{at}", "name": a["asset"]})
    for r, row in enumerate(rows):
        rowref = "t" if r == 0 else f"b{r-1}."
        kind = None if r == 0 else branches[r - 1]["kind"]
        for i, (pat, refs) in enumerate(row):
            keys = KEYS[pat]
            first = i == 0
            for at, ref in zip(keys, refs):
                if at == "in" and not first: continue                 # a seam carries the upstream block's key
                if at == "in" and first and kind == "out": continue     # fan-out: the anchor (topic) is named on its own row
                if at == "out" and i == len(row) - 1 and kind == "in": continue   # multi-source row ends at the shared connector
                typ = ref.split("#")[1]
                if typ == "topic" and at == "out" and i + 1 < len(row) and row[i + 1][0].startswith("consume"):
                    name_asset(rowref, i, at, ref); continue            # the consumer's queue names the broker run; the topic gets its own name (P-5)
                if typ == "topic": name_asset(rowref, i, at, ref)
                if typ == "topic" and at == "in": continue
                put(rowref, i, at, ref); name_asset(rowref, i, at, ref) if typ != "topic" else None
    i_d = sid(name)
    entry = {"schema": "pattern-bench.registry-entry", "schemaVersion": "0.7",
        "scenario": {"id": i_d, "version": 1, "name": name, "description": desc, "author": AUTHOR, "exportedAt": date,
                     "source": {"tool": "Pattern Bench", "toolVersion": "2.1", "mode": "composite" if branches else "single"},
                     "canvas": {"file": f"{i_d}.v1.canvas.json"}, "tags": list(tags)},
        "landscape": {"source": "registry", "landscapeVersion": LANDSCAPE_VERSION}, "proposed": [], "retired": [],
        "base": {"blocks": blocks, "components": comps, "links": links, "containers": list(conts.values())},
        "versions": [], "acknowledgements": [], "relations": []}
    main_callers = [(c, at) for c, at in callers if at == "t0"]
    if main_callers: cv_cont.append(dict(block=0, at="caller", **{"name": A[main_callers[0][0]]["app"], "process": A[main_callers[0][0]]["process"]}))
    extra_callers = [(c, at) for c, at in callers if (c, at) not in main_callers[:1]]
    std = {"pb": "2.1", "landscape": {"source": "Registry", "landscapeVersion": LANDSCAPE_VERSION}}
    if branch_cont: std["branchContainers"] = branch_cont
    if schedule: std["schedule"] = [{"key": "@t0:in", "text": schedule}]
    canvas = {"format": "pattern-bench-flow", "version": 1, "origin": {"x": 80, "y": 300},
        "blocks": [{"pattern": p, "label": LABEL[p]} for p, _ in main], "buildOrder": list(range(len(main))), "versions": [],
        "containers": cv_cont, "caller": bool(main_callers), "ripples": [], "marks": [],
        "componentAssets": assets, "std": std, "scenario": {"id": i_d, "version": 1, "name": name, "description": desc, "author": AUTHOR, "tags": list(tags), "relations": [], "why": []},
        "savedAt": date}
    if branches or extra_callers:
        canvas.update({"mode": "composite",
          "branches": [{"kind": br["kind"], "row": br["row"], "anchor": br["anchor"], "blocks": [{"pattern": p, "label": LABEL[p]} for p, _ in br["blocks"]]} for br in branches],
          "callers": [{"anchor": [{"ref": at, "side": "in"}], "name": A[c]["app"], "process": A[c]["process"]} for c, at in extra_callers],
          "branchVersions": [], "lineFlips": [], "callerVer": [], "laneChoice": [], "compositeRipples": []})
    if mutate: mutate(entry, canvas)
    o = out or OUT; os.makedirs(o, exist_ok=True)
    for fn, obj in ((f"{i_d}.v1.registry.json", entry), (f"{i_d}.v1.canvas.json", canvas)):
        with open(os.path.join(o, fn), "w") as f: json.dump(obj, f, indent=2)
    return i_d

def out_after(t, row, *blocks):   # fan-out from the topic at main block t (a Process-to-Publish block)
    return {"kind": "out", "row": row, "anchor": [{"ref": f"t{t}", "side": "out"}, {"ref": f"t{t+1}", "side": "in"}], "blocks": list(blocks)}
def in_before(t, row, *blocks):   # fan-in into the entry of main block t
    return {"kind": "in", "row": row, "anchor": [{"ref": f"t{t}", "side": "in"}], "blocks": list(blocks)}

CFG = write_config()
# ---------- shared building blocks ----------
def a2p(c): return ("api-to-process", [c + "#api", c + "#process"])
def p2t(c, t): return ("process-to-publish", [c + "#process", t + "#topic"])
def c2a(t, q, e): return ("consume-to-api", [t + "#topic", q + "#queue", e + "#api"])
def c2p(t, q, c): return ("consume-to-process", [t + "#topic", q + "#queue", c + "#process"])
def c2f(t, q, e): return ("consume-to-file", [t + "#topic", q + "#queue", e + "#file"])
def p2a(c, e): return ("process-to-api", [c + "#process", e + "#api"])
def p2f(c, e): return ("process-to-file", [c + "#process", e + "#file"])
def f2p(e, c): return ("file-to-process", [e + "#file", c + "#process"])
S = "solace/"
SO, OS, DL, INV, BP, MAT, PRC, PO, PAY, EMP = (S + x for x in ["sales-order", "order-status", "delivery", "invoice", "business-partner", "material", "price", "purchase-order", "payment", "employee"])
D = lambda d, h=9: f"2026-11-{d:02d}T{h:02d}:30:00.000Z"
n = 0
def mk(*a, **k):
    global n; n += 1; return scenario(*a, **k)

# ---------- Order-to-Cash ----------
mk("O2C-Webshop-Order-Intake", "Webshop and sales-rep app orders enter through the Sales Order experience API, are published once and fan out to S/4HANA and Salesforce.",
   ["O2C", "sales order", "webshop"], D(2),
   [a2p("btpis/sales-order-exp"), p2t("btpis/sales-order-exp", SO), c2a(SO, S + "q-s4-order", "endapp/s4-salesorder")],
   [out_after(1, 1, c2a(SO, S + "q-crm-order", "endapp/sfdc-order")),
    in_before(0, 1, a2p("ais/webshop-gateway"), ("process-to-api", ["ais/webshop-gateway#process", "btpis/sales-order-exp#api"]))],
   [("caller/mobile-sales", "t0"), ("caller/webshop", "b1.0")])
mk("O2C-Salesforce-Order-Intake", "Orders closed in Salesforce are routed by the CRM connector onto the shared sales-order topic; S/4HANA and the data lake subscribe.",
   ["O2C", "sales order", "salesforce"], D(3),
   [a2p("ais/crm-connector"), p2t("ais/crm-connector", SO), c2a(SO, S + "q-s4-order", "endapp/s4-salesorder")],
   [out_after(1, 1, c2p(SO, S + "q-dwh-order", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake"))],
   [("caller/sfdc", "t0")])
mk("O2C-Order-Status-Broadcast", "S/4HANA order status events are distributed to the webshop and back to Salesforce.",
   ["O2C", "order status"], D(4),
   [a2p("btpis/order-status"), p2t("btpis/order-status", OS), c2a(OS, S + "q-webshop-status", "endapp/webshop-order")],
   [out_after(1, 1, c2a(OS, S + "q-crm-status", "endapp/sfdc-order"))], [("caller/s4-p01", "t0")])
mk("O2C-Outbound-Delivery-to-Warehouse", "Outbound deliveries from S/4HANA go to EWM for picking and, via the carrier hub, to DHL for shipment booking.",
   ["O2C", "logistics", "delivery"], D(5),
   [a2p("btpis/delivery-dist"), p2t("btpis/delivery-dist", DL), c2a(DL, S + "q-ewm-delivery", "endapp/ewm-delivery")],
   [out_after(1, 1, c2p(DL, S + "q-carrier-delivery", "ais/carrier-hub"), p2a("ais/carrier-hub", "endapp/carrier-dhl"))], [("caller/s4-p01", "t0")])
mk("O2C-Goods-Issue-Confirmation", "EWM goods issue confirmations are published on the delivery topic; S/4HANA posts goods issue, the carrier hub books the shipment.",
   ["O2C", "logistics", "goods issue"], D(6),
   [a2p("btpis/ewm-warehouse"), p2t("btpis/ewm-warehouse", DL), c2a(DL, S + "q-s4-goods-issue", "endapp/s4-delivery")],
   [out_after(1, 1, c2p(DL, S + "q-carrier-delivery", "ais/carrier-hub"), p2a("ais/carrier-hub", "endapp/carrier-dhl"))], [("caller/ewm", "t0")])
mk("O2C-Carrier-Tracking-Updates", "DHL tracking webhooks enter through the carrier hub, are published on the delivery topic and update the webshop order.",
   ["O2C", "logistics", "tracking"], D(7),
   [a2p("ais/carrier-hub"), p2t("ais/carrier-hub", DL), c2a(DL, S + "q-webshop-tracking", "endapp/webshop-order")], [], [("caller/dhl", "t0")])
mk("O2C-Customer-E-Invoicing", "Customer invoices from S/4HANA DRC are published once and sent to KSeF (Poland) and the Peppol access point; a copy lands in the data lake.",
   ["O2C", "e-invoicing", "DRC", "KSeF"], D(8),
   [a2p("btpis/invoice-out"), p2t("btpis/invoice-out", INV), c2a(INV, S + "q-ksef", "endapp/ksef")],
   [out_after(1, 1, c2a(INV, S + "q-peppol", "endapp/peppol-ap")), out_after(1, -1, c2p(INV, S + "q-dwh-invoice", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake"))], [("caller/s4-p01", "t0")])
mk("O2C-Invoice-Copy-to-Salesforce", "Subscribes to the invoice topic and makes invoices visible on the Salesforce account.",
   ["O2C", "invoice", "salesforce"], D(9),
   [c2p(INV, S + "q-crm-invoice", "btpis/invoice-crm"), p2a("btpis/invoice-crm", "endapp/sfdc-invoice")])
mk("ANA-Sales-Order-to-Data-Lake", "Analytics subscription on the sales-order topic, landing raw order events in the data lake.",
   ["analytics", "sales order"], D(10),
   [c2p(SO, S + "q-dwh-order", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake")])
# ---------- Master data ----------
mk("MDM-Business-Partner-Distribution", "Business partner changes in S/4HANA are published and consumed by Salesforce (accounts), Ariba (suppliers) and the data lake.",
   ["MDM", "business partner"], D(11),
   [a2p("btpis/bp-replication"), p2t("btpis/bp-replication", BP), c2a(BP, S + "q-crm-bp", "endapp/sfdc-account")],
   [out_after(1, 1, c2a(BP, S + "q-ariba-supplier", "endapp/ariba-supplier")),
    out_after(1, -1, c2p(BP, S + "q-dwh-bp", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake"))], [("caller/s4-p01", "t0")])
mk("MDM-Salesforce-Account-to-S4", "New prospects converted in Salesforce, and webshop self-registrations, create business partners in S/4HANA through the CRM connector.",
   ["MDM", "business partner", "salesforce"], D(12),
   [a2p("ais/crm-connector"), p2a("ais/crm-connector", "endapp/s4-bp")],
   [in_before(0, 1, a2p("ais/webshop-gateway"), ("process-to-api", ["ais/webshop-gateway#process", "ais/crm-connector#api"]))],
   [("caller/sfdc", "t0"), ("caller/webshop", "b0.0")])
mk("MDM-Material-Master-Distribution", "Product master changes from S/4HANA are published to PIM, EWM and the data lake.",
   ["MDM", "material", "product"], D(13),
   [a2p("btpis/material-master"), p2t("btpis/material-master", MAT), c2a(MAT, S + "q-pim-material", "endapp/pim")],
   [out_after(1, 1, c2a(MAT, S + "q-ewm-product", "endapp/ewm-product")),
    out_after(1, -1, c2p(MAT, S + "q-dwh-material", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake"))], [("caller/s4-p01", "t0")])
mk("MDM-Product-Catalogue-to-Webshop", "The catalogue sync subscribes to material events and also takes enriched products pushed from PIM, updating the webshop catalogue.",
   ["MDM", "product", "webshop"], D(14),
   [c2p(MAT, S + "q-webshop-material", "ais/catalog-sync"), p2a("ais/catalog-sync", "endapp/webshop-catalog")],
   [in_before(1, 1, a2p("ais/catalog-sync"))], [("caller/pim", "b0.0")])
mk("MDM-Price-Distribution", "Condition records from S/4HANA pricing are published to the webshop price API and the Salesforce price book.",
   ["MDM", "pricing"], D(15),
   [a2p("btpis/price-dist"), p2t("btpis/price-dist", PRC), c2a(PRC, S + "q-webshop-price", "endapp/webshop-price")],
   [out_after(1, 1, c2a(PRC, S + "q-crm-price", "endapp/sfdc-pricebook"))], [("caller/s4-p01", "t0")])
# ---------- Procure-to-Pay ----------
mk("P2P-Purchase-Order-to-Ariba", "Released purchase orders are published and sent to suppliers via Ariba; a copy lands in the data lake.",
   ["P2P", "purchase order", "Ariba"], D(16),
   [a2p("btpis/ariba-procure"), p2t("btpis/ariba-procure", PO), c2a(PO, S + "q-ariba-po", "endapp/ariba-po")],
   [out_after(1, 1, c2p(PO, S + "q-dwh-po", "ais/datalake-ingest"), p2f("ais/datalake-ingest", "endapp/datalake"))], [("caller/s4-p01", "t0")])
mk("P2P-PO-Confirmation-from-Ariba", "Supplier order confirmations from Ariba update the purchase order in S/4HANA through the shared Ariba procurement API.",
   ["P2P", "purchase order", "Ariba"], D(17),
   [a2p("btpis/ariba-procure"), p2a("btpis/ariba-procure", "endapp/s4-po")], [], [("caller/ariba", "t0")])
mk("P2P-Supplier-Invoice-Processing", "Supplier invoices from Ariba, plus scanned paper invoices from the OCR service, are posted in S/4HANA.",
   ["P2P", "supplier invoice", "Ariba"], D(18),
   [a2p("btpis/ariba-procure"), p2a("btpis/ariba-procure", "endapp/s4-supplier-invoice")],
   [in_before(0, 1, f2p("endapp/ocr-sftp", "btpis/invoice-scan"), ("process-to-api", ["btpis/invoice-scan#process", "btpis/ariba-procure#api"]))],
   [("caller/ariba", "t0")])
# ---------- Finance ----------
mk("FIN-Payment-Run-to-Bank", "Payment files from the S/4HANA payment run are published and delivered to Nordea; Kyriba gets the payment details for cash positioning.",
   ["FIN", "payments", "bank"], D(19),
   [f2p("endapp/s4-payment-out", "btpis/payment-files"), p2t("btpis/payment-files", PAY), c2p(PAY, S + "q-bank-payment", "btpis/payment-delivery"), p2f("btpis/payment-delivery", "endapp/bank-nordea-out")],
   [out_after(1, 1, c2a(PAY, S + "q-treasury", "endapp/treasury-kyriba"))])
mk("FIN-Bank-Statement-Import", "Daily camt.053 statements from Nordea are picked up and imported into S/4HANA.",
   ["FIN", "bank statement", "bank"], D(20),
   [f2p("endapp/bank-nordea-in", "btpis/bank-statement"), p2a("btpis/bank-statement", "endapp/s4-bank-statement")])
# ---------- Hire-to-Retire ----------
mk("HR-New-Hire-Onboarding", "New hires in SuccessFactors are published once: Entra ID creates the account, ServiceNow opens onboarding tasks, S/4HANA gets the employee as business partner.",
   ["HR", "onboarding", "SuccessFactors"], D(21),
   [a2p("btpis/sf-employee"), p2t("btpis/sf-employee", EMP), c2a(EMP, S + "q-entra", "endapp/entra-id")],
   [out_after(1, 1, c2a(EMP, S + "q-servicenow", "endapp/servicenow-hr")), out_after(1, -1, c2a(EMP, S + "q-s4-employee", "endapp/s4-bp"))],
   [("caller/sf-ec", "t0")])
mk("HR-Payroll-Export", "Employee events are collected and sent as the payroll input file to ADP.",
   ["HR", "payroll"], D(22),
   [c2p(EMP, S + "q-payroll", "btpis/payroll-export"), p2f("btpis/payroll-export", "endapp/adp-sftp")])
mk("HR-Leaver-Offboarding", "Terminations in SuccessFactors flow over the employee topic to the identity process that disables the Entra ID account; ServiceNow gets the offboarding case.",
   ["HR", "offboarding", "SuccessFactors"], D(23),
   [a2p("btpis/sf-employee"), p2t("btpis/sf-employee", EMP), c2p(EMP, S + "q-entra-leaver", "ais/hr-identity"), p2a("ais/hr-identity", "endapp/entra-id")],
   [out_after(1, 1, c2a(EMP, S + "q-servicenow", "endapp/servicenow-hr"))], [("caller/sf-ec", "t0")])

# ---------- Scheduled starts (C-6) ----------
def s2pa(c, e): return ("schedule-to-process-api", [c + "#scheduler", c + "#process", e + "#api"])
def s2pf(c, e): return ("schedule-to-process-file", [c + "#scheduler", c + "#process", e + "#file"])
mk("FIN-Bank-Statement-Poll", "A scheduler polls the Nordea SFTP inbox every night and imports the camt.053 statements into S/4HANA.",
   ["FIN", "bank statement", "scheduled"], D(24, 7),
   [s2pf("btpis/bank-statement-poll", "endapp/bank-nordea-in"), p2a("btpis/bank-statement-poll", "endapp/s4-bank-statement")], schedule="02:00 daily")
mk("MDM-Price-Pull", "Every 15 minutes the price process pulls changed condition records from the S/4HANA pricing API and publishes them; the webshop and Salesforce subscribe.",
   ["MDM", "pricing", "scheduled"], D(24, 8),
   [s2pa("btpis/price-pull", "endapp/s4-price"), p2t("btpis/price-pull", PRC), c2a(PRC, S + "q-webshop-price", "endapp/webshop-price")],
   [out_after(1, 1, c2a(PRC, S + "q-crm-price", "endapp/sfdc-pricebook"))], schedule="every 15 min")
print("wrote", n, "scenarios to", OUT)

# ---------- negative test set (not loaded by default; used by the Playwright suites) ----------
TC = os.path.join(ROOT_OUT, "test-cases")
if os.path.isdir(TC): shutil.rmtree(TC)
def case(folder, name, main, mutate, branches=(), callers=(), **kw):
    return scenario(name, "Test case: " + folder, ["test"], D(25), main, branches, callers, out=os.path.join(TC, folder), mutate=mutate, **kw)
def drop_app(e, c):                       # the target end application loses its name (hand-edited export)
    k = [x for x in e["base"]["containers"] if x["kind"] == "endApp"][0]; k["name"] = ""; k["asset"] = ""; k["appId"] = ""; k["ref"] = None
case("missing-end-app", "TC-Missing-End-App", [a2p("btpis/order-status"), p2a("btpis/order-status", "endapp/sfdc-order")], drop_app, callers=[("caller/s4-p01", "t0")])
def cross_dup(e, c):                      # an Azure Logic Apps process named like a BTP IS process
    p = [x for x in e["base"]["components"] if x["type"] == "process"][0]; p["name"] = derive_name("btpis/sales-order-exp", "process")[0]; p["nameOverridden"] = True
case("cross-platform-duplicate", "TC-Cross-Platform-Duplicate", [a2p("ais/crm-connector"), p2a("ais/crm-connector", "endapp/sfdc-account")], cross_dup, callers=[("caller/sfdc", "t0")])
case("same-name-same-platform", "TC-Same-Name-Same-Platform", [a2p("btpis/sales-order-exp"), p2a("btpis/sales-order-exp", "endapp/s4-salesorder")], None, callers=[("caller/mobile-sales", "t0")])
def breach(e, c):                         # a hand-typed API name that breaks N-1 (level block) + a hand-edited queue name (N-3 override block)
    a = [x for x in e["base"]["components"] if x["type"] == "api" and x["owner"] == "integration"][0]; a["name"] = "my order api"; a["nameOverridden"] = True
case("naming-breach", "TC-Naming-Breach", [a2p("btpis/delivery-dist"), p2a("btpis/delivery-dist", "endapp/ewm-delivery")], breach, callers=[("caller/s4-p01", "t0")])
def blocked_override(e, c):
    q = [x for x in e["base"]["components"] if x["type"] == "queue"][0]; q["name"] = "SOL_MYQUEUE_Q"; q["nameOverridden"] = True
case("blocked-override", "TC-Blocked-Override", [c2a(INV, S + "q-crm-invoice", "endapp/sfdc-invoice")], blocked_override)
def third(e, c):                          # the topic on v1, v2 and v3 at once
    t = [x for x in e["base"]["components"] if x["type"] == "topic"][0]
    e["versions"] = [{"id": "v-0" + str(i), "label": "Topic v%d" % i, "status": "open", "appliesTo": {"component": t["id"], "connector": "topic", "side": "both"},
        "decision": {"option": "parallel"}, "added": [{"id": "n%d" % i, "ref": t["ref"], "name": t["name"] + "_V%d" % i, "type": "topic", "version": "v%d" % i, "container": t["container"], "stage": "planned"}],
        "addedLinks": [], "changed": [{"component": t["id"], "from": "v1", "to": "v%d" % i, "change": "breaking"}], "impacts": [], "retired": []} for i in (2, 3)]
case("third-live-version", "TC-Third-Live-Version", [c2a(DL, S + "q-ewm-delivery", "endapp/ewm-delivery")], third)
def proposed(e, c):
    k = [x for x in e["base"]["containers"] if x["kind"] == "endApp"][0]; k["name"] = k["asset"] = "Legacy WMS"; k["appId"] = ""; k["ref"] = "endapp/legacy-wms/wms-inbound"
    e["proposed"] = [{"kind": "application", "name": "Legacy WMS", "suggestedId": "legacy-wms"}]
case("proposed-app", "TC-Proposed-App", [a2p("btpis/delivery-dist"), p2a("btpis/delivery-dist", "endapp/ewm-delivery")], proposed, callers=[("caller/s4-p01", "t0")])
def older(e, c): e["landscape"]["landscapeVersion"] = 0; e["landscape"]["source"] = "file"
case("older-landscape", "TC-Older-Landscape", [a2p("btpis/order-status"), p2a("btpis/order-status", "endapp/webshop-order")], older, callers=[("caller/s4-p01", "t0")])
print("wrote the negative set to", TC)
