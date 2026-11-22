"""Registry draft 0.10 — landscape config, Settings, Inbox, open 0.2, entry 0.7, archived versions, retire / remove wizard.
Run: python3 tests/test_registry_010.py   (REG_SHOT=dir saves screenshots). Data: registry-data/ (python3 tools/gen_landscape.py registry-data)."""
import os, json, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file:///' + ROOT.replace(os.sep, '/').lstrip('/') + '/registry-app.html'
DATA = os.path.join(ROOT, 'registry-data')
SHOT = os.environ.get('REG_SHOT')
res = []
def check(name, cond):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
def items(cases=(), config=True, extra=()):
    out = [{"path": "landscape/" + os.path.basename(f), "text": open(f).read(), "lastModified": 1} for f in sorted(glob.glob(DATA + '/landscape/*.json'))]
    if config: out.append({"path": "landscape.json", "text": open(DATA + '/landscape.json').read(), "lastModified": 1})
    for c in cases:
        for f in glob.glob(DATA + '/test-cases/' + c + '/*.json'): out.append({"path": "in/" + c + "/" + os.path.basename(f), "text": open(f).read(), "lastModified": 1})
    out += list(extra)
    return out
ALL_CASES = ['missing-end-app', 'cross-platform-duplicate', 'same-name-same-platform', 'naming-breach', 'blocked-override', 'third-live-version', 'proposed-app', 'older-landscape']

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1500, 'height': 1000}, accept_downloads=True)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.github.com/**', lambda r: r.abort())
    ev = pg.evaluate
    def load(its):
        ev("items => window.__registryLoad(items, 'landscape')", its); pg.wait_for_timeout(500); ev("go('home')"); pg.wait_for_timeout(100)
    R = "window.__registry"
    pg.goto(URL); pg.wait_for_timeout(200)

    # ---- R-1 config load / missing config
    load(items(config=False))
    check('R-1: no landscape.json → banner "No landscape config" and the built-in seed', 'No landscape config' in pg.inner_text('#view') and 'built-in seed' in pg.inner_text('#cfgBadge'))
    load(items())
    check('R-1: landscape.json read — badge shows the config version', 'v1' in pg.inner_text('#cfgBadge') and 'No landscape config' not in pg.inner_text('#view'))
    check('R-1: test-cases/ is not loaded by default', not any(s.startswith('TC-') for s in ev(f"[...{R}.S.scenarios.values()].map(s => s.latest.name)")))
    n_sc = ev(f"{R}.S.scenarios.size")
    check('X-1: 24 generated scenarios + Sales order distribution waiting (25 known, 24 released)', n_sc == 24 and ev(f"{R}.S.inbox.list.length") == 1)
    check('landing shows Inbox (1) and Settings tiles', pg.locator('.tile010.inbox .cnt').inner_text() == '1' and pg.locator('.tile010.settings').count() == 1)
    check('R-5: entry 0.7 records keep landscape / names / edge ends', ev(f"[...{R}.S.scenarios.values()].every(s => s.latest.schemaVersion === '0.7' && s.latest.landscape && Array.isArray(s.latest.names))"))
    check('C-5: every generated scenario has an application on every edge end', ev(f"[...{R}.S.scenarios.values()].every(s => !s.latest.edgeMissing.length)"))
    check('C-4: no naming flags on the generated landscape', ev(f"[...{R}.S.scenarios.values()].every(s => !s.flags.some(f => f.kind === 'naming' || f.kind === 'duplicate'))"))
    check('C-6: the pulled source API of a scheduled start is a source (triggers), not a target',
          ev(f"(() => {{ const s = [...{R}.S.scenarios.values()].find(x => x.latest.name === 'MDM-Price-Pull').latest; return s.sys.triggeredBy.some(t => t.key.includes('s-4hana')) && !s.sys.deliversTo.some(t => t.key.includes('s-4hana')); }})()"))

    # ---- R-3 Inbox: Sales order distribution waits only for the proposed Legacy WMS (C-5 walk-through step 5)
    pg.click('.tile010.inbox'); pg.wait_for_timeout(200)
    txt = pg.inner_text('#view')
    check('R-3: Inbox lists Sales order distribution, export 1, not released yet', 'Sales order distribution' in txt and 'not released yet' in txt)
    row = pg.locator('.inbox-row[data-inbox="scn-sod001"] .iitem')
    check('C-5 step 5: it waits only for the proposed "Legacy WMS" (new element)', row.count() == 1 and 'Legacy WMS' in row.first.inner_text())
    if SHOT: os.makedirs(SHOT, exist_ok=True); pg.screenshot(path=os.path.join(SHOT, 'inbox.png'))
    pg.click('.inbox-row[data-inbox="scn-sod001"] [data-act=iapprove]'); pg.wait_for_timeout(300)
    saved = ev(f"{R}.S.saved.map(x => x.file)")
    cfg_after = ev(f"{R}.S.config")
    check('Approve: application added to landscape.json, landscapeVersion +1, change-log "approve"', 'landscape.json' in saved and any(a['name'] == 'Legacy WMS' for a in cfg_after['applications'])
          and cfg_after['landscapeVersion'] == 2 and cfg_after['changeLog'][-1]['action'] == 'approve')
    check('Approve: scenario released (in the lists, Inbox empty)', ev(f"{R}.S.scenarios.has('scn-sod001')") and ev(f"{R}.S.inbox.list.length") == 0)

    # ---- the negative set
    load(items(ALL_CASES))
    inbox = {w['n']: w['k'] for w in ev(f"{R}.S.inbox.list.map(w => ({{ n: w.rec.name, k: w.waiting.map(i => i.kind) }}))")}
    check('C-5 negative: missing end application → Inbox "end application missing", no Approve', inbox.get('TC-Missing-End-App') == ['missingEnd'])
    check('C-4: same name on a different platform → waiting (validation failure)', inbox.get('TC-Cross-Platform-Duplicate') == ['duplicate'])
    check('C-4: same name, same platform → shared object, released', 'TC-Same-Name-Same-Platform' not in inbox and ev(f"{R}.S.scenarios.has('scn-' + Object.keys({{}}).length) || [...{R}.S.scenarios.values()].some(s => s.latest.name === 'TC-Same-Name-Same-Platform')"))
    check('C-4: naming breach (level block) → waiting', inbox.get('TC-Naming-Breach') == ['namingBreach'])
    check('C-4: hand-edited name under a rule with override block → waiting', inbox.get('TC-Blocked-Override') == ['namingBreach'])
    check('R-3: proposed application → waiting for Approve / Map / Reject', inbox.get('TC-Proposed-App') == ['newElement'])
    flags = {s['n']: s['f'] for s in ev(f"[...{R}.S.scenarios.values()].map(s => ({{ n: s.latest.name, f: s.flags.map(f => f.kind) }}))")}
    check('C-1 / D-4: 3rd live version → released with a warning flag', 'thirdVersion' in flags.get('TC-Third-Live-Version', []))
    check('R-3: export with an older landscapeVersion → released, re-check flag only', 'recheck' in flags.get('TC-Older-Landscape', []))
    pg.click('.tile010.inbox'); pg.wait_for_timeout(150)
    mrow = pg.locator('.inbox-row').filter(has_text='TC-Missing-End-App')
    check('missing end: no Approve button (fix in Pattern Bench only)', mrow.locator('[data-act=iapprove]').count() == 0 and 'fix in Pattern Bench' in mrow.inner_text())
    # Map to existing
    prow = pg.locator('.inbox-row').filter(has_text='TC-Proposed-App')
    prow.locator('[data-act=imap]').click(); pg.wait_for_timeout(100)
    pg.select_option('#mapSel', 'sap-ewm'); pg.click('#pbdlg [data-pbd=map]'); pg.wait_for_timeout(300)
    cfg = ev(f"{R}.S.config")
    check('Map to existing: alias stored on the chosen application, scenario released', 'Legacy WMS' in [a for x in cfg['applications'] if x['id'] == 'sap-ewm' for a in x['aliases']]
          and any(s == 'TC-Proposed-App' for s in ev(f"[...{R}.S.scenarios.values()].map(s => s.latest.name)")) and cfg['changeLog'][-1]['action'] == 'map')
    # Reject (naming breach stays waiting, marker for Pattern Bench)
    nrow = pg.locator('.inbox-row').filter(has_text='TC-Naming-Breach')
    nrow.locator('[data-act=ireject]').click(); pg.wait_for_timeout(300)
    st = ev(f"{R}.S.inbox.state.items")
    check('Reject: stored in inbox.json, scenario still waiting until a new export', any('name|' in k and v['action'] == 'rejected' for k, v in st.items()) and 'inbox.json' in ev(f"{R}.S.saved.map(x => x.file)")
          and any(w == 'TC-Naming-Breach' for w in ev(f"{R}.S.inbox.list.map(w => w.rec.name)")))
    # earlier export stays live while the new one waits
    sod = json.load(open(DATA + '/landscape/scn-sod001.v1.registry.json')); sodc = open(DATA + '/landscape/scn-sod001.v1.canvas.json').read()
    sod2 = json.loads(json.dumps(sod)); sod2['scenario']['version'] = 2; sod2['scenario']['canvas']['file'] = 'scn-sod001.v2.canvas.json'
    k = [x for x in sod2['base']['containers'] if x['kind'] == 'endApp' and x.get('name') == 'Salesforce Sales Cloud'][0]; k['name'] = k['asset'] = ''; k['ref'] = None
    load(items(extra=[{"path": "landscape/scn-sod001.v2.registry.json", "text": json.dumps(sod2), "lastModified": 2}, {"path": "landscape/scn-sod001.v2.canvas.json", "text": sodc, "lastModified": 2}]))
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    check('C-5 step 6: hand-edited export without an end application → Inbox "end application missing"', ev(f"{R}.S.inbox.list.some(w => w.id === 'scn-sod001' && w.rec.version === 2 && w.waiting.some(i => i.kind === 'missingEnd'))"))

    # ---- R-2 / C-3 Settings
    load(items())
    pg.click('.tile010.settings'); pg.wait_for_timeout(200)
    check('R-2: Settings opens with the 7 sections', pg.locator('.ls-nav button').count() == 7)
    pg.click('.ls-nav [data-sec=entityTypes]')
    pg.fill('.ls-tbl tr[data-id=scenario] [data-f=label]', 'Interface'); pg.fill('.ls-tbl tr[data-id=scenario] [data-f=plural]', 'Interfaces')
    pg.click('[data-ls-act=save]'); pg.wait_for_timeout(300)
    pg.click('[data-ls-act=close]'); pg.wait_for_timeout(100)
    check('C-3: renamed "Scenario" → "Interface": landing band reads "Interfaces"', 'Interfaces' in pg.inner_text('.home') and 'Scenarios' not in pg.inner_text('.home'))
    saved_cfg = ev(f"{R}.S.saved.filter(x => x.file === 'landscape.json').pop().obj")
    check('C-3: JSON ids unchanged (only label / plural), landscapeVersion +1, change-log entry', saved_cfg['entityTypes'][0]['id'] == 'scenario' and saved_cfg['entityTypes'][0]['label'] == 'Interface'
          and saved_cfg['landscapeVersion'] == 2 and saved_cfg['changeLog'][-1]['action'] == 'edit')
    pg.click('[data-band=sc]'); pg.wait_for_timeout(1200)
    pg.locator('tr.r').first.click(); pg.wait_for_timeout(1500)
    check('C-3: scenario page head reads "Interface"', 'Interface' in pg.inner_text('.world-head, .dhead') if pg.locator('.world-head, .dhead').count() else 'Interface' in pg.inner_text('#view'))
    pg.click('[data-act=hld]'); pg.wait_for_timeout(1200)
    check('C-3: HLD reads the label too', 'Interface ID' in pg.inner_text('#view'))
    # platform with code + scheduler, naming builder preview
    load(items())
    pg.click('#cfgBadge'); pg.wait_for_timeout(150)
    pg.click('.ls-nav [data-sec=platforms]'); pg.click('[data-ls-act=add-platform]')
    row = pg.locator('.ls-tbl[data-ls=platforms] tr').last
    row.locator('[data-f=name]').fill('MuleSoft EU'); row.locator('[data-f=code]').fill('MULE'); row.locator('[data-cap=scheduler]').check()
    pg.click('.ls-nav [data-sec=namingRules]'); pg.click('[data-ls-act=add-rule]'); pg.wait_for_timeout(100)
    prev = pg.locator('[data-ls=preview]').get_attribute('data-name')
    check('C-4: a new rule (component code _ part type) previews a derived name', prev and '_' in prev and prev == prev.upper())
    pg.select_option('[data-f=add-source]', 'version'); pg.click('[data-ls-act=add-seg]')
    prev2 = pg.locator('[data-ls=preview]').get_attribute('data-name')
    check('C-4: adding an optional version segment (+ delimiter) shows _V2 in the preview', prev2.endswith('V2'))
    pg.click('.ls-nav [data-sec=namingRules]')
    if SHOT: pg.screenshot(path=os.path.join(SHOT, 'settings-rules.png'))
    pg.click('[data-ls-act=save]'); pg.wait_for_timeout(300)
    c2 = ev(f"{R}.S.config")
    check('R-2: platform saved with code + capabilities, landscapeVersion +1', any(x['name'] == 'MuleSoft EU' and x['code'] == 'MULE' and 'scheduler' in x['capabilities'] for x in c2['platforms']) and c2['landscapeVersion'] == 2)
    pg.click('[data-ls-act=close]')
    # import settings from a Pattern Bench file → diff preview → accept → version +1, change-log import
    pbcfg = json.load(open(DATA + '/landscape.json')); pbcfg['origin'] = 'pattern-bench'; pbcfg['landscapeVersion'] = 5
    pbcfg['entityTypes'][2]['label'] = 'Asset'; pbcfg['entityTypes'][2]['plural'] = 'Assets'
    pbcfg['applications'].append({"id": "legacy-wms", "name": "Legacy WMS", "code": "LWMS", "endpoints": [], "aliases": []})
    path = '/tmp/pb-landscape.json'; json.dump(pbcfg, open(path, 'w'))
    pg.click('#cfgBadge'); pg.wait_for_timeout(150)
    pg.set_input_files('.ls-box input[type=file]', path); pg.wait_for_timeout(300)
    dtxt = pg.inner_text('[data-ls=import]')
    check('C-3: import shows a diff preview per section (entity label changed, application added)', 'changed' in dtxt and 'added' in dtxt and 'Legacy WMS' in dtxt and 'component → Asset' in dtxt)
    pg.click('[data-ls-act=accept-all]'); pg.wait_for_timeout(300)
    c3 = ev(f"{R}.S.config")
    check('C-3: accept → landscapeVersion +1, change-log "import" noting origin + version', c3['changeLog'][-1]['action'] == 'import' and 'pattern-bench' in c3['changeLog'][-1]['note'] and 'landscapeVersion 5' in c3['changeLog'][-1]['note'])
    pg.click('[data-ls-act=close]')
    old = json.loads(json.dumps(pbcfg)); old['landscapeVersion'] = 0; json.dump(old, open(path, 'w'))
    pg.click('#cfgBadge'); pg.wait_for_timeout(150); pg.set_input_files('.ls-box input[type=file]', path); pg.wait_for_timeout(300)
    check('C-3: an older incoming file warns before import', pg.locator('[data-ls=older]').count() == 1)
    pg.click('[data-ls-act=cancel-import]'); pg.click('[data-ls-act=close]')
    # export settings
    pg.click('#cfgBadge'); pg.wait_for_timeout(150)
    with pg.expect_download() as dl: pg.click('[data-ls-act=export]')
    exp = json.load(open(dl.value.path()))
    check('C-3: Export settings downloads landscape.json (schema landscape-config, origin registry)', dl.value.suggested_filename == 'landscape.json' and exp['schema'] == 'landscape-config' and exp['origin'] == 'registry')
    pg.click('[data-ls-act=close]')
    # rename a code → scenarios flagged "names changed"
    load(items())
    pg.click('#cfgBadge'); pg.wait_for_timeout(150); pg.click('.ls-nav [data-sec=platforms]')
    pg.locator('.ls-tbl[data-ls=platforms] tr[data-id=btp-is] [data-f=code]').fill('SBTP'); pg.click('[data-ls-act=save]'); pg.wait_for_timeout(300); pg.click('[data-ls-act=close]')
    nflag = ev(f"[...{R}.S.scenarios.values()].filter(s => s.flags.some(f => f.key === 'names-changed')).length")
    check('R-2: renaming a platform code flags the scenarios using it ("names changed")', nflag >= 10)

    # ---- R-6 / R-7: retire wizard and remove wizard (on the C-1 test data: Sales order distribution has DHL API v1 ║ v2)
    load(items())
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    ref = 'endapp/dhl-parcel#api'      # the DHL API of branch (c), attached without endpoint
    check('R-6: DHL API has two live versions (v1 ║ v2)', ev(f"{R}.liveVersionsOf({json.dumps(ref)})") == ['v1', 'v2'])
    # another scenario on v1 only → blocked point
    gi = json.load(open(DATA + '/test-cases/same-name-same-platform/' + [f for f in os.listdir(DATA + '/test-cases/same-name-same-platform') if f.endswith('registry.json')][0]))
    k = [x for x in gi['base']['containers'] if x['kind'] == 'endApp'][0]; k['name'] = k['asset'] = 'DHL Parcel'; k['ref'] = ref.split('#')[0]
    for c in gi['base']['components']:
        if c['container'] == k['id']: c['ref'] = ref
    for l in gi['base']['links']:
        if l['toRef'].startswith('endapp/'): l['toRef'] = ref
    gi['scenario']['name'] = 'DHL v1 user'; gi['scenario']['id'] = 'scn-dhlv1x'
    load(items(extra=[{"path": "landscape/scn-dhlv1x.v1.registry.json", "text": json.dumps(gi), "lastModified": 3}]))
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    blocked = ev(f"{R}.retireBlocked({json.dumps(ref)}, 'v1').map(b => b.text)")
    check('R-7: a scenario using v1 only is a blocked point', any('DHL v1 user' in b for b in blocked))
    pg.goto(URL); pg.wait_for_timeout(200)
    load(items(extra=[{"path": "landscape/scn-dhlv1x.v1.registry.json", "text": json.dumps(gi), "lastModified": 3}]))
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    ev(f"{R}.retireWizard({json.dumps(ref)}, 'v1')"); pg.wait_for_timeout(150)
    pg.click('[data-ls=wizard] [data-ls-act=next]'); pg.wait_for_timeout(100)
    check('R-7 step 2: dependencies listed (scenarios, neighbours, application)', pg.locator('[data-ls=dep]').count() >= 2)
    pg.click('[data-ls=wizard] [data-ls-act=next]'); pg.wait_for_timeout(100)
    check('R-7 step 3: blocked point shown, Confirm disabled', pg.locator('[data-ls=blocked]').count() >= 1 and pg.locator('[data-ls-act=to-confirm]').is_disabled())
    if SHOT: pg.screenshot(path=os.path.join(SHOT, 'retire-blocked.png'))
    pg.locator('[data-ls=blocked] [data-ls-act=fix]').first.click(); pg.wait_for_timeout(200)     # "Remove scenario…" → remove wizard
    check('R-7: the blocked point offers "Remove scenario…" (remove wizard opens)', pg.locator('[data-ls=wizard]').count() == 2)
    rw = pg.locator('[data-ls=wizard]').last
    rw.locator('[data-ls-act=next]').click(); pg.wait_for_timeout(100)
    check('remove wizard: dependencies show orphaned / shared components', rw.locator('[data-ls=dep]').count() >= 1 and ('orphaned' in rw.inner_text() or 'shared' in rw.inner_text()))
    rw.locator('[data-ls-act=next]').click(); rw.locator('[data-ls-act=to-confirm]').click()
    check('remove wizard: who / date / why required', rw.locator('[data-ls-act=confirm]').is_disabled())
    rw.locator('[data-f=by]').fill('Suddha'); rw.locator('[data-f=why]').fill('test duplicate of the DHL flow'); pg.wait_for_timeout(50)
    rw.locator('[data-ls-act=confirm]').click(); pg.wait_for_timeout(400)
    check('remove: scenario out of the lists, lifecycle event saved', not ev(f"{R}.S.scenarios.has('scn-dhlv1x')") and 'lifecycle.json' in ev(f"{R}.S.saved.map(x => x.file)"))
    w = pg.locator('[data-ls=wizard]').last
    w.locator('[data-ls-act=recheck]').click(); pg.wait_for_timeout(150)
    check('R-7: re-check after clearing → no blocked points, Confirm enabled', w.locator('[data-ls=no-blocks]').count() == 1 and not w.locator('[data-ls-act=to-confirm]').is_disabled())
    w.locator('[data-ls-act=to-confirm]').click()
    check('R-7 step 4: who / date / why required before Confirm', w.locator('[data-ls-act=confirm]').is_disabled())
    w.locator('[data-f=by]').fill('Suddha'); w.locator('[data-f=why]').fill('DHL v1 contract ends'); pg.wait_for_timeout(50)
    w.locator('[data-ls-act=confirm]').click(); pg.wait_for_timeout(400)
    lc = ev(f"{R}.S.saved.filter(x => x.file === 'lifecycle.json').pop().obj.events")
    check('R-7: lifecycle event retired with by / date / why', any(e.get('ref') == ref and e['stage'] == 'retired' and e['by'] == 'Suddha' and e['why'] for e in lc))
    check('R-6: v1 archived — only v2 live', ev(f"{R}.liveVersionsOf({json.dumps(ref)})") == ['v2'])
    sflags = ev(f"{R}.S.scenarios.get('scn-sod001').flags.map(f => f.text)")
    check('R-7: the scenario still drawn with v1 is flagged "design out of date"', any('Design out of date' in t for t in sflags))
    pl = ev("async () => (await window.__registry.pbPayload('scn-sod001', 1)).payload")
    check('R-4: open payload 0.2 carries landscape, retired marks, names in use, export n', pl['schemaVersion'] == '0.2' and pl['landscape']['schema'] == 'landscape-config'
          and any(r['ref'] == ref and r['version'] == 'v1' and r['by'] == 'Suddha' for r in pl['retiredMarks']) and isinstance(pl['namesInUse'], dict) and pl['scenario']['export'] == 1)
    # component page: version history with the retirement record
    ev("k => window.__registry && null", None)
    pg.evaluate("ref => { const S = window.__registry.S; const key = S.partComp.get(ref); }", ref)
    # future-dated retirement = planned
    pg.goto(URL); pg.wait_for_timeout(200)
    load(items())
    ev(f"{R}.inboxApprove('scn-sod001', 'application|legacy-wms')"); pg.wait_for_timeout(300)
    ev(f"{R}.retireWizard({json.dumps(ref)}, 'v1')"); pg.wait_for_timeout(100)
    w = pg.locator('[data-ls=wizard]').last
    w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=next]').click(); w.locator('[data-ls-act=to-confirm]').click()
    w.locator('[data-f=by]').fill('Suddha'); w.locator('[data-f=date]').fill('2099-01-31'); w.locator('[data-f=why]').fill('planned'); pg.wait_for_timeout(50)
    w.locator('[data-ls-act=confirm]').click(); pg.wait_for_timeout(400)
    check('D-6: future-dated retirement = "planned retire" — v1 still live, no retired mark yet', ev(f"{R}.liveVersionsOf({json.dumps(ref)})") == ['v1', 'v2']
          and any('planned retire' in f['text'] for f in ev(f"{R}.S.scenarios.get('scn-sod001').flags")))
    check('no page errors', not errs)
    if errs: print(errs[:3])
    br.close()
print(f'{sum(res)}/{len(res)} passed')
raise SystemExit(0 if all(res) else 1)
