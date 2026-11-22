"""Registry draft 0.11 — domain baseline round (W-9 … W-16, contract 1.0) (Python Playwright).
Run: python3 tests/test_registry_011.py"""
import os, json, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'registry-data')
URL = 'file:///' + os.path.join(ROOT, 'registry-app.html').replace(os.sep, '/').lstrip('/')
res = []
def check(name, cond):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
def items(extra=(), ids=True):
    out = [{"path": "landscape/" + os.path.basename(f), "text": open(f).read(), "lastModified": 1} for f in sorted(glob.glob(DATA + '/landscape/*.json'))]
    out.append({"path": "landscape.json", "text": open(DATA + '/landscape.json').read(), "lastModified": 1})
    if ids: out.append({"path": "scenario-ids.json", "text": open(DATA + '/scenario-ids.json').read(), "lastModified": 1})
    for folder in extra:
        for f in glob.glob(DATA + '/test-cases/' + folder + '/*.json'):
            out.append({"path": "landscape/" + os.path.basename(f), "text": open(f).read(), "lastModified": 3})
    return out

with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1600, 'height': 1000}, accept_downloads=True)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.github.com/**', lambda r: r.abort())
    ev = pg.evaluate; R = "window.__registry"
    def load(its):
        ev("items => window.__registryLoad(items, 'landscape')", its); pg.wait_for_timeout(500); ev("go('home')"); pg.wait_for_timeout(100)
    pg.goto(URL); pg.wait_for_timeout(200)
    load(items())

    # ---------- W-16 / W-9 bands ----------
    bands = ev("[...document.querySelectorAll('.band .name')].map(e => e.textContent)")
    check('W-16: band "Connected applications"; W-9: Components and Artifacts are both top-level', bands[:4] == ['Scenarios', 'Components', 'Artifacts', 'Connected applications'])
    check('draft label 0.11 · schema 1.0', 'draft 0.11 · schema 1.0' in pg.inner_text('header') if pg.locator('header').count() else 'draft 0.11' in pg.content())

    # ---------- W-11 scenario list ----------
    pg.click('[data-band=sc]'); pg.wait_for_timeout(1300)
    heads = ev("[...document.querySelectorAll('.wtable thead th')].map(e => e.textContent.replace(/[▲▼]/g,'').trim())")
    check('W-11: Scenario id is the first column, then Name, Data object, Source, Platforms, Targets', heads[1:7] == ['Scenario id', 'Name', 'Data object', 'Source', 'Platforms', 'Targets'])
    check('SCN ids from scenario-ids.json (SCN-0001 …)', ev("document.querySelector('tr.r .sid').textContent").startswith('SCN-'))
    check('W-11: source and target applications use different (calm) chip colours', pg.locator('tr.r .chip.app-src').count() > 0 and pg.locator('tr.r .chip.app-tgt').count() > 0
          and ev("getComputedStyle(document.querySelector('.chip.app-src')).backgroundColor") != ev("getComputedStyle(document.querySelector('.chip.app-tgt')).backgroundColor"))
    two = ev("[...document.querySelectorAll('tr.r')].find(tr => tr.querySelectorAll('.chip.app-tgt').length === 2) ? true : false")
    check('W-11: two targets show two chips (no "+1" below 5)', two and pg.locator('tr.r .chip.more').count() == 0)
    check('W-15: data object column filled from the exports', pg.locator('tr.r .chip.do').count() == 24)
    pg.select_option('#dobjFilter', 'employee'); pg.wait_for_timeout(200)
    check('W-15: filter by data object (Employee → 3 scenarios)', pg.locator('tr.r').count() == 3)
    pg.select_option('#dobjFilter', ''); pg.wait_for_timeout(100)

    # ---------- W-14 / W-13 scenario page ----------
    sid = 'scn-35433e'
    ev(f"go('scenario', {{ id: '{sid}', version: null }})"); pg.wait_for_timeout(900)
    check('W-14: side panel starts with the Source / Target cards', ev("document.querySelector('.dside .panel').dataset.panel") == 'apps'
          and 'SAP S/4HANA (P01)' in pg.inner_text('[data-panel=apps] .appcard.src') and 'Nordea Bank' in pg.inner_text('[data-panel=apps] .appcard.tgt'))
    check('W-14: relations with other scenarios in their own section', pg.locator('[data-panel=relations]').count() == 1 and 'Declared relations' in pg.inner_text('.dside'))
    check('W-15: data object on the scenario page (Payment, PAY)', 'Payment' in pg.inner_text('[data-f=dataObject]'))
    check('readable id + internal id on the scenario page', pg.inner_text('[data-f=displayId]').startswith('SCN-') and sid in pg.inner_text('.facts'))
    check('W-13: Remove sits in the header next to the status badge (not in the action row)', pg.locator('.world-head .hacts [data-act=remove]').count() == 1 and pg.locator('.scenact [data-act=remove]').count() == 0)

    # ---------- W-9 component page ----------
    ev("go('component', { key: 'ais/carrier-hub' })"); pg.wait_for_timeout(300)
    facts = pg.inner_text('.facts')
    check('W-9: platform is AIS (not "Azure Logic Apps"), kind iPaaS, artifacts with subtype', 'AIS' in facts and 'Azure Logic Apps' not in facts and 'Process (Logic App)' in facts)
    check('W-6.4: "contains" line under the tiles', 'Logic App ×3' in pg.inner_text('[data-f=contains]'))
    check('W-9: artifacts table with temp ids (id tag) and live versions', pg.locator('[data-panel=artifacts] tr.row').count() == 2 and pg.locator('[data-panel=artifacts] .id-tag').count() == 2)
    check('W-9: scenario × artifact matrix (3 scenarios)', pg.locator('[data-panel=matrix] table tr').count() == 4)
    check('W-13: Retire · Remove (greyed: used in a released export) in the header', pg.locator('.world-head [data-act=oretire]').count() == 1 and pg.locator('.world-head [data-act=oremove]').is_disabled())
    check('W-9: explorer verb "has artifacts"', 'has artifacts' in pg.inner_text('#pageRel'))

    # ---------- W-9 artifact page ----------
    pg.locator('[data-panel=artifacts] tr.row').nth(1).click(); pg.wait_for_timeout(300)
    check('W-9: artifact page — component link, type + subtype, versions, scenarios using it', ev(f"{R}.S.view") == 'artifact' and 'Carrier-Hub' in pg.inner_text('.facts')
          and 'Process (Logic App)' in pg.inner_text('.facts') and pg.locator('[data-panel=versions] tr').count() >= 2 and pg.locator('.dside .list-item').count() == 3)

    # ---------- Artifacts list ----------
    ev("go('home')"); pg.wait_for_timeout(100); pg.click('[data-band=ar]'); pg.wait_for_timeout(1200)
    n_art = pg.locator('#artTable tr.r').count()
    check('W-9: Artifacts list — one row per artifact with temp id, type (subtype), component, platform', n_art > 40 and 'Process (Function App)' in pg.inner_text('#artTable'))
    pg.fill('#artSearch', 'carrier'); pg.wait_for_timeout(150)
    check('Artifacts list search', 0 < pg.locator('#artTable tr.r').count() < 6)

    # ---------- W-10 retire / re-activate a whole artifact ----------
    ref = 'ais/carrier-hub#api'
    ev(f"{R}.objRetireWizard('artifact', '{ref}')"); pg.wait_for_timeout(150)
    w = pg.locator('[data-ls=wizard]')
    w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=next]').click(); pg.wait_for_timeout(80)
    check('W-10: retiring an artifact still used by a scenario is blocked', w.locator('[data-ls=blocked]').count() == 1 and w.locator('[data-ls-act=to-confirm]').is_disabled())
    w.locator('[data-ls-act=close]').click()
    # an orphaned artifact: an older export used it, the latest does not
    sod = json.load(open(DATA + '/landscape/scn-sod001.v1.registry.json'))
    v2 = json.loads(json.dumps(sod)); v2['scenario']['version'] = 2; v2['scenario']['exportedAt'] = '2026-11-23T10:00:00.000Z'
    gone = [c for c in v2['base']['components'] if c['type'] == 'queue'][0]['ref']
    v2['base']['components'] = [c for c in v2['base']['components'] if c['ref'] != gone]
    v2['base']['links'] = [l for l in v2['base']['links'] if l['fromRef'] != gone and l['toRef'] != gone]
    its = items() + [{"path": "landscape/scn-sod001.v2.registry.json", "text": json.dumps(v2), "lastModified": 9}]
    load(its)
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    orph = ev(f"(() => {{ const a = {R}.S.arts.get({json.dumps(gone)}); return a ? a.orphan : null }})()")
    check('W-10: an artifact only older exports used is "orphaned"', orph is True)
    ev("go('home')"); pg.wait_for_timeout(100)
    check('W-10: landing shows the orphaned count', pg.locator('[data-orphan-count]').count() == 1)
    ev(f"{R}.objRetireWizard('artifact', {json.dumps(gone)})"); pg.wait_for_timeout(150)
    w = pg.locator('[data-ls=wizard]')
    w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=next]').click(); pg.wait_for_timeout(80)
    check('W-10: orphaned artifact → no blocked points', w.locator('[data-ls=no-blocks]').count() == 1)
    w.locator('[data-ls-act=to-confirm]').click(); w.locator('[data-f=by]').fill('Suddha'); w.locator('[data-f=why]').fill('not used any more'); pg.wait_for_timeout(50)
    w.locator('[data-ls-act=confirm]').click(); pg.wait_for_timeout(400)
    lc = ev(f"{R}.S.saved.filter(x => x.file === 'lifecycle.json').pop().obj.events")
    check('W-10: lifecycle object event (artifact retired, who / date / why)', any(e.get('kind') == 'object' and e['ref'] == gone and e['stage'] == 'retired' and e['by'] == 'Suddha' for e in lc))
    ev(f"{R}.S.artQuery = ''"); ev("go('band', { k: 'ar' })"); pg.wait_for_timeout(1200)
    check('W-10: retired artifacts are hidden from the list by default', gone not in pg.inner_text('#artTable'))
    pg.click('label:has(#artRetired)'); pg.wait_for_timeout(150)
    check('W-10: "Show retired" lists it with a retired badge', gone in pg.inner_text('#artTable') and pg.locator('#artTable .st-retired').count() >= 1)
    ev(f"go('artifact', {{ ref: {json.dumps(gone)} }})"); pg.wait_for_timeout(200)
    check('W-10: a retired artifact offers Re-activate in the header', pg.locator('.world-head [data-act=reactivate]').count() == 1)
    pg.click('.world-head [data-act=reactivate]'); pg.wait_for_timeout(400)
    check('W-10: re-activated (history entry)', ev(f"{R}.S.lifecycle.objects.get({json.dumps(gone)}).stage") == 'active')
    # a component can only be retired when all its artifacts are retired
    comp = gone.split('#')[0]
    ev(f"{R}.objRetireWizard('component', {json.dumps(comp)})"); pg.wait_for_timeout(150)
    w = pg.locator('[data-ls=wizard]'); w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=next]').click(); pg.wait_for_timeout(80)
    check('W-10: component with a live artifact → blocked, offers to retire the orphaned ones together', w.locator('[data-ls=blocked]').count() == 1 and 'together' in w.inner_text())
    w.locator('[data-ls-act=fix]').click(); pg.wait_for_timeout(100)
    check('W-10: …after that the component can be confirmed', w.locator('[data-ls=no-blocks]').count() == 1)
    w.locator('[data-ls-act=close]').click(); pg.wait_for_timeout(100)

    # ---------- Inbox checks 1.0 ----------
    load(items(['missing-data-object', 'required-attribute-missing', 'data-object-near-duplicate', 'legacy-0.7-file']))
    inbox = ev(f"{R}.S.inbox.list.map(w => [w.rec.name, w.waiting.map(i => i.kind)])")
    by = {n: k for n, k in inbox}
    check('W-15: missing data object → waits in the Inbox', 'missingDataObject' in by.get('TC-Missing-Data-Object', []))
    check('W-4: required scenario attribute (Region) empty → waits in the Inbox', 'missingAttr' in by.get('TC-Required-Attribute-Missing', []))
    near = ev(f"(() => {{ const s = [...{R}.S.scenarios.values()].find(s => s.latest.name === 'TC-Data-Object-Near-Duplicate'); return s ? s.flags.map(f => f.text) : [] }})()")
    check('W-15: a data object spelled like a known one ("SalesOrders" ≈ "Sales Order") is flagged', any('looks like' in t for t in near))
    leg = ev(f"(() => {{ const s = [...{R}.S.scenarios.values()].find(s => s.latest.name === 'TC-Legacy-07-File'); return s ? [s.latest.schemaVersion, !!s.latest.dataObject] : null }})()")
    check('contract: an entry 0.7 file is still read (released, no data object → shown as missing)', leg == ['0.7', False])
    pg.click('.tile010.inbox'); pg.wait_for_timeout(200)
    check('Inbox view names the new check kinds', 'data object missing' in pg.inner_text('#view') and 'required attribute' in pg.inner_text('#view'))

    # ---------- W-12 explorer: feeds both ways, no label overlap ----------
    load(items())
    rel = ev(f"(() => {{ const s = [...{R}.S.scenarios.values()].find(s => s.latest.name === 'O2C-Carrier-Tracking-Updates'); window.X && 0; return null }})()")
    ev("go('scenario', { id: [...window.__registry.S.scenarios.values()].find(s => s.latest.name === 'O2C-Carrier-Tracking-Updates').latest.id, version: null })"); pg.wait_for_timeout(900)
    side = pg.inner_text('[data-panel=relations]')
    check('W-12: scenarios that publish and consume on the same topic are listed once, under "feeds both ways"', 'feeds both ways' in side and side.count('O2C-Goods-Issue-Confirmation') == 1)
    long_ok = ev("""[...document.querySelectorAll('#pageRel svg .xn')].every(g => { const t = g.querySelectorAll('text'); if (t.length < 2) return true;
      const a = t[0].getBBox(), b = t[1].getBBox(); return a.x + a.width < b.x + 2; })""")
    check('W-12: related-object labels never run into the "via …" text', long_ok)

    # ---------- Settings: platforms without live components ----------
    pg.click('#cfgBadge'); pg.wait_for_timeout(150); pg.click('.ls-nav [data-sec=platforms]'); pg.wait_for_timeout(80)
    check('W-10: Settings shows "no live components" for a platform without any (SAP API Management)', pg.locator('[data-ls=platforms] tr[data-id=sap-apim] [data-ls=no-live]').count() == 1
          and pg.locator('[data-ls=platforms] tr[data-id=btp-is] [data-ls=no-live]').count() == 0)
    pg.click('.ls-head [data-ls-act=close]')

    check('no page errors', not errs); print(errs)
    br.close()
print(f'{sum(res)}/{len(res)} passed')
