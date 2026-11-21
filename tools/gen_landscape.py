"""Generate a realistic, interconnected integration landscape for the Registry app.
Registry entries (schema 0.6) + Pattern Bench canvas files, modelled on scn-9h6h4a (Interface-Order-Creation).
No versioning: every component is v1, versions = []."""
import json, os, sys, hashlib
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
AUTHOR = "Suddhasatta Guha"

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
ipaas("ais/webshop-gateway", "AIS", "Webshop-Gateway")
ipaas("ais/crm-connector", "AIS", "CRM-Connector")
ipaas("ais/carrier-hub", "AIS", "Carrier-Hub")
ipaas("ais/catalog-sync", "AIS", "Catalog-Sync")
ipaas("ais/datalake-ingest", "AIS", "DataLake-Ingest")
ipaas("ais/hr-identity", "AIS", "HR-Identity")
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

TYPE_NAME = {"api": "API", "process": "Process", "topic": "Topic", "queue": "Queue", "file": "Folder", "app": "App"}
LABEL = {"api-to-process": "API-to-Process", "process-to-publish": "Process-to-Publish", "consume-to-api": "Consume-to-API",
         "consume-to-process": "Consume-to-Process", "process-to-api": "Process-to-API", "file-to-process": "File-to-Process",
         "process-to-file": "Process-to-File", "consume-to-file": "Consume-to-File"}

def cname(ref):
    cont, typ = ref.split("#")
    a = A[cont]
    if a["kind"] in ("endApp",): return a["asset"]
    if a["kind"] == "caller": return a["app"]
    return f'{a["asset"]} {TYPE_NAME[typ]}'

def sid(name): return "scn-" + hashlib.sha1(name.encode()).hexdigest()[:6]

def scenario(name, desc, tags, date, main, branches=(), callers=()):
    """main / branch blocks: (pattern, [connector refs in order]); callers: (caller-container, attach) with attach = 't0' / 'b1.0'."""
    comps, idx, links, conts = [], {}, [], {}
    def cont_id(cref):
        if cref not in conts:
            a = A[cref]; d = {"id": f"k{len(conts)+1}", "ref": cref, "kind": a["kind"], "platform": a["platform"], "asset": a["asset"]}
            if a["kind"] in ("endApp", "caller"): d["name"] = a["app"]; d["process"] = a["process"]   # name = the connected system (application)
            conts[cref] = d
        return conts[cref]["id"]
    def comp(ref):
        if ref not in idx:
            cref, typ = ref.split("#"); k = A[cref]["kind"]
            c = {"id": f"c{len(comps)+1}", "ref": ref, "name": cname(ref), "autoName": False, "type": typ, "version": "v1",
                 "owner": "integration" if k in ("iPaaS", "broker") else k, "container": cont_id(cref)}
            comps.append(c); idx[ref] = c["id"]
        return idx[ref]
    def link(a, b):
        L = {"from": comp(a), "to": comp(b), "fromRef": a, "toRef": b}
        if L not in links: links.append(L)
    rows = [main] + [br["blocks"] for br in branches]
    blocks = []
    for r, row in enumerate(rows):
        for o, (pat, refs) in enumerate(row):
            for x in refs: comp(x)
            for a, b in zip(refs, refs[1:]): link(a, b)
            blocks.append({"id": f"b{len(blocks)+1}", "templateId": pat, "label": LABEL[pat], "row": r, "order": o, "components": [idx[x] for x in refs]})
    blockref = {f"t{i}": blk for i, blk in enumerate(main)}
    for k, br in enumerate(branches):
        for j, blk in enumerate(br["blocks"]): blockref[f"b{k}.{j}"] = blk
    for ccont, attach in callers:
        app = ccont + "#app"; comp(app); link(app, blockref[attach][1][0])
    # canvas containers for main-row blocks (as Pattern Bench exports them)
    cv_cont = []
    def tag(i, at, ref):
        a = A[ref.split("#")[0]]
        cv_cont.append({"block": i, "at": at, "platform": a["platform"], "asset": a["asset"]} if a["kind"] in ("iPaaS", "broker")
                       else {"block": i, "at": at, "name": a["app"], "process": a["process"]})
    for i, (pat, refs) in enumerate(main):
        if pat in ("api-to-process",): tag(i, "in", refs[0])
        if pat == "file-to-process": tag(i, "in", refs[0]); tag(i, "out", refs[1])
        if pat == "process-to-publish": tag(i, "out", refs[1])
        if pat in ("consume-to-api", "consume-to-file", "process-to-api", "process-to-file"): tag(i, "out", refs[-1])
        if pat == "consume-to-process": tag(i, "in", refs[0]); tag(i, "out", refs[-1])
    for ccont, attach in callers:
        if attach == "t0" and not any(c["at"] == "caller" for c in cv_cont):
            a = A[ccont]; cv_cont.append({"block": 0, "at": "caller", "name": a["app"], "process": a["process"]})
    extra_callers = [(c, at) for c, at in callers if not (at == "t0" and A[c]["app"] == next((x["name"] for x in cv_cont if x["at"] == "caller"), None))]
    i_d = sid(name)
    entry = {"schema": "pattern-bench.registry-entry", "schemaVersion": "0.6",
        "scenario": {"id": i_d, "version": 1, "name": name, "description": desc, "author": AUTHOR, "exportedAt": date,
                     "source": {"tool": "Pattern Bench", "toolVersion": "2.0", "mode": "composite" if branches else "single"},
                     "canvas": {"file": f"{i_d}.v1.canvas.json"}, "tags": list(tags)},
        "base": {"blocks": blocks, "components": comps, "links": links, "containers": list(conts.values())},
        "versions": [], "acknowledgements": [], "relations": []}
    canvas = {"format": "pattern-bench-flow", "version": 1, "origin": {"x": 80, "y": 300},
        "blocks": [{"pattern": p, "label": LABEL[p]} for p, _ in main], "buildOrder": list(range(len(main))), "versions": [],
        "containers": cv_cont, "caller": any(c["at"] == "caller" for c in cv_cont), "ripples": [], "marks": [],
        "mode": "composite" if branches else "single",
        "branches": [{"kind": br["kind"], "row": br["row"], "anchor": br["anchor"], "blocks": [{"pattern": p, "label": LABEL[p]} for p, _ in br["blocks"]]} for br in branches],
        "callers": [{"anchor": [{"ref": at, "side": "in"}], "name": A[c]["app"], "process": A[c]["process"]} for c, at in extra_callers],
        "branchVersions": [], "lineFlips": [], "callerVer": [], "laneChoice": [], "compositeRipples": [],
        "scenario": {"id": i_d, "version": 1, "name": name, "description": desc, "author": AUTHOR, "tags": list(tags), "relations": [], "why": []},
        "savedAt": date}
    for fn, obj in ((f"{i_d}.v1.registry.json", entry), (f"{i_d}.v1.canvas.json", canvas)):
        with open(os.path.join(OUT, fn), "w") as f: json.dump(obj, f, indent=2)
    return i_d

def out_after(t, row, *blocks):   # fan-out from the topic at main block t (a Process-to-Publish block)
    return {"kind": "out", "row": row, "anchor": [{"ref": f"t{t}", "side": "out"}, {"ref": f"t{t+1}", "side": "in"}], "blocks": list(blocks)}
def in_before(t, row, *blocks):   # fan-in into the entry of main block t
    return {"kind": "in", "row": row, "anchor": [{"ref": f"t{t}", "side": "in"}], "blocks": list(blocks)}

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
   [out_after(1, 1, c2a(INV, S + "q-peppol", "endapp/peppol-ap")), out_after(1, -1, c2f(INV, S + "q-dwh-invoice", "endapp/datalake"))], [("caller/s4-p01", "t0")])
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
   [out_after(1, 1, c2f(PO, S + "q-dwh-po", "endapp/datalake"))], [("caller/s4-p01", "t0")])
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
   [f2p("endapp/s4-payment-out", "btpis/payment-files"), p2t("btpis/payment-files", PAY), c2f(PAY, S + "q-bank-payment", "endapp/bank-nordea-out")],
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
print("wrote", n, "scenarios to", OUT)
