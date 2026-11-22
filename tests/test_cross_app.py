"""Cross-app round trip (registry 0.11 ⇄ Pattern Bench 2.2, contract 1.0), on the regenerated landscape:
PB export → registry Inbox → Approve → Open in PB → registry retire wizard → PB auto-collapse → export n+1 → flag clears.
Run: python3 tests/test_cross_app.py   (PB_HTML=<path to pattern-bench.html>, default ../pattern-bench/pattern-bench.html)"""
import os, json, glob, shutil, tempfile, zipfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'registry-data')
PBH = os.environ.get('PB_HTML') or os.path.join(os.path.dirname(ROOT), 'pattern-bench', 'pattern-bench.html')
res = []
def check(name, cond):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
tmp = tempfile.mkdtemp()
shutil.copy(os.path.join(ROOT, 'registry-app.html'), tmp); shutil.copy(PBH, os.path.join(tmp, 'pattern-bench.html'))
url = lambda f: 'file:///' + os.path.join(tmp, f).replace(os.sep, '/').lstrip('/')
cfg = json.load(open(os.path.join(DATA, 'landscape.json')))
base_items = [{"path": "landscape/" + os.path.basename(f), "text": open(f).read(), "lastModified": 1}
              for f in sorted(glob.glob(DATA + '/landscape/*.json')) if 'scn-sod001' not in f]
base_items.append({"path": "landscape.json", "text": json.dumps(cfg), "lastModified": 1})
done_canvas = json.load(open(os.path.join(DATA, 'landscape', 'scn-sod001.v1.canvas.json')))
done_canvas.pop('scenario', None)
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(accept_downloads=True)
    errs = []
    pb = ctx.new_page(); pb.on('pageerror', lambda e: errs.append('PB: ' + str(e)))
    pb.goto(url('pattern-bench.html')); pb.wait_for_timeout(200)
    d = "window.__debug"
    # ---- 1 Pattern Bench: the finished Sales order distribution, exported for the registry (export 1, zip)
    pb.evaluate(f"c => {d}.setLandscape(c, 'Registry', false)", cfg)
    pb.evaluate(f"f => {d}.loadFlow(f)", done_canvas); pb.evaluate(f"{d}.exportMode('zip')")
    pb.click('#registryBtn'); pb.wait_for_timeout(100); pb.fill('#regDialog [data-f=name]', 'Sales order distribution')
    with pb.expect_download() as dl: pb.click('#regDialog [data-a=export]')
    z = zipfile.ZipFile(dl.value.path()); files = {n: z.read(n).decode() for n in z.namelist()}
    spec1 = json.loads([t for n, t in files.items() if n.endswith('registry.json')][0]); sid = spec1['scenario']['id']
    check('PB export 1: entry 1.0 with data object, proposed Legacy WMS and the DHL v1 ║ v2 version', spec1['schemaVersion'] == '1.0' and spec1['scenario']['dataObject']['name'] == 'Sales Order' and spec1['proposed'] and spec1['versions'])
    pb.click('#regDialog [data-a=done]')
    # ---- 2 registry: Inbox → Approve → released
    rg = ctx.new_page(); rg.on('pageerror', lambda e: errs.append('REG: ' + str(e)))
    rg.route('https://api.github.com/**', lambda r: r.abort())
    rg.goto(url('registry-app.html')); rg.wait_for_timeout(200)
    items1 = base_items + [{"path": "landscape/" + n, "text": t, "lastModified": 5} for n, t in files.items()]
    rg.evaluate("items => window.__registryLoad(items, 'landscape')", items1); rg.wait_for_timeout(500)
    R = "window.__registry"
    check('registry: the export waits in the Inbox (proposed Legacy WMS only)', rg.evaluate(f"{R}.S.inbox.list.some(w => w.id === '{sid}' && w.waiting.length === 1 && w.waiting[0].kind === 'newElement')"))
    rg.evaluate(f"{R}.inboxApprove('{sid}', 'application|legacy-wms')"); rg.wait_for_timeout(300)
    check('registry: Approve → released', rg.evaluate(f"{R}.S.scenarios.has('{sid}')"))
    # ---- 3 Open in Pattern Bench (open 0.2): config read-only, names in use, export n in the banner
    rg.evaluate("go('scenario', { id: '%s', version: null })" % sid); rg.wait_for_timeout(800)
    with ctx.expect_page() as pi: rg.click('.pbbtn.page')
    pb2 = pi.value; pb2.on('pageerror', lambda e: errs.append('PB2: ' + str(e))); pb2.wait_for_timeout(2000)
    check('Open in PB: flow arrives with the registry config (read-only) and "export 1"', pb2.evaluate(f"{d}.rgState() && {d}.rgState().meta.id") == sid
          and 'Registry' in pb2.inner_text('#cfgBadge') and 'export 1' in pb2.inner_text('.rg-banner'))
    check('Open in PB: the DHL API is on v1 ║ v2', pb2.evaluate(f"Object.keys({d}.versionOverrides()).length") == 1)
    check('W-1: opened from the registry in View mode; SCN id and data object arrive', pb2.evaluate(f"{d}.viewMode()") and pb2.evaluate(f"{d}.displayId()") and pb2.evaluate(f"{d}.dataObject().name") == 'Sales Order')
    # ---- 4 registry: retire DHL API v1 in the staged wizard
    ref = 'endapp/dhl-parcel#api'
    rg.evaluate(f"{R}.retireWizard('{ref}', 'v1')"); rg.wait_for_timeout(150)
    w = rg.locator('[data-ls=wizard]')
    w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=next]').click(); rg.wait_for_timeout(100)
    check('retire wizard: no blocked points (only this scenario uses DHL, it has the v2 path)', w.locator('[data-ls=no-blocks]').count() == 1)
    w.locator('[data-ls-act=to-confirm]').click(); w.locator('[data-f=by]').fill('Suddha'); w.locator('[data-f=why]').fill('DHL API v1 sunset'); rg.wait_for_timeout(50)
    w.locator('[data-ls-act=confirm]').click(); rg.wait_for_timeout(400)
    check('registry: v1 archived, scenario flagged "design out of date"', rg.evaluate(f"{R}.liveVersionsOf('{ref}')") == ['v2']
          and rg.evaluate(f"{R}.S.scenarios.get('{sid}').flags.some(f => f.text.includes('Design out of date'))"))
    # ---- 5 Open in PB again → auto-collapse, no trace, toast
    rg.evaluate("go('scenario', { id: '%s', version: null })" % sid); rg.wait_for_timeout(800)
    rg.click('.pbbtn.page'); pb2.wait_for_timeout(2000)
    check('PB: auto-collapse — the v1 chain is gone, v2 is the base (no version left)', pb2.evaluate(f"Object.keys({d}.versionOverrides()).length") == 0
          and pb2.evaluate(f"Object.values({d}.compGen()).includes(2)"))
    check('PB: toast "… v1 retired — removed"', 'retired' in pb2.inner_text('#toast'))
    # ---- 6 export n+1 → registry: flag clears
    pb2.evaluate(f"{d}.exportMode('zip')")
    pb2.click('#registryBtn'); pb2.wait_for_timeout(100)
    check('PB: the dialog says "this becomes export 2"', 'export 2' in pb2.inner_text('#regDialog'))
    with pb2.expect_download() as dl: pb2.click('#regDialog [data-a=export]')
    z = zipfile.ZipFile(dl.value.path()); files2 = {n: z.read(n).decode() for n in z.namelist()}
    spec2 = json.loads([t for n, t in files2.items() if n.endswith('registry.json')][0])
    check('PB export 2: retired[] carries DHL API v1 (who / date / why), DHL on v2 in the base', spec2['scenario']['version'] == 2 and any(r['ref'] == ref and r['version'] == 'v1' and r['by'] == 'Suddha' for r in spec2['retired'])
          and [c for c in spec2['base']['components'] if c['ref'] == ref][0]['version'] == 'v2')
    lc = rg.evaluate(f"{R}.S.saved.filter(x => x.file === 'lifecycle.json').pop().obj")
    cfg2 = rg.evaluate(f"{R}.S.config")
    items2 = [x for x in base_items if x['path'] != 'landscape.json'] + [{"path": "landscape.json", "text": json.dumps(cfg2), "lastModified": 1}, {"path": "lifecycle.json", "text": json.dumps(lc), "lastModified": 1}] \
             + [{"path": "landscape/" + n, "text": t, "lastModified": 5} for n, t in files.items()] + [{"path": "landscape/" + n, "text": t, "lastModified": 6} for n, t in files2.items()]
    rg.goto(url('registry-app.html')); rg.wait_for_timeout(200)
    rg.evaluate("items => window.__registryLoad(items, 'landscape')", items2); rg.wait_for_timeout(500)
    s = rg.evaluate(f"(() => {{ const s = {R}.S.scenarios.get('{sid}'); return {{ v: s.latest.version, flags: s.flags.map(f => f.text) }}; }})()")
    check('registry: export 2 released, "design out of date" cleared', s['v'] == 2 and not any('Design out of date' in t for t in s['flags']))
    check('registry: the component history shows v1 archived with who / date / why', rg.evaluate(f"{R}.S.lifecycle.byKey.get('{ref}@v1').by") == 'Suddha')
    check('no page errors', not errs)
    if errs: print(errs[:4])
    br.close()
shutil.rmtree(tmp, ignore_errors=True)
print(f'{sum(res)}/{len(res)} passed')
raise SystemExit(0 if all(res) else 1)
