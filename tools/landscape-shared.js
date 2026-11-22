/* === SHARED landscape helpers 0.1 — same code in registry-app.html and pattern-bench.html (source: tools/landscape-shared.js) ===
   Contract: landscape.json schema 0.1 (claude/landscape-config-schema-0.1.md).
   Config defaults · entity labels (C-3) · naming derive / check (C-4) · settings diff / import (C-3) ·
   staged retire wizard (R-7 / C-2) · Settings editor UI (R-2 / A-2). Exposed as window.__shared. */
(function () {
  "use strict";
  var SCHEMA = "landscape-config", SCHEMA_VERSION = "0.1";
  var ENTITY_IDS = ["scenario", "platform", "component", "part", "application", "endpoint", "caller", "version", "export"];
  var ENTITY_DEFAULTS = {
    scenario: ["Scenario", "Scenarios"], platform: ["Platform", "Platforms"], component: ["Component", "Components"],
    part: ["Part", "Parts"], application: ["Application", "Applications"], endpoint: ["Endpoint", "Endpoints"],
    caller: ["Caller", "Callers"], version: ["Version", "Versions"], export: ["Export", "Exports"]
  };
  var PART_TYPES = ["api", "process", "topic", "queue", "file", "scheduler"];
  var CAPABILITIES = ["api", "process", "topic", "queue", "file", "scheduler"];
  var SEGMENT_SOURCES = [
    ["platform.code", "Platform code"], ["platform.name", "Platform name"], ["component.code", "Component code"], ["component.name", "Component name"],
    ["sourceApp.code", "Source application code"], ["targetApp.code", "Target application code"], ["endpoint.id", "Endpoint"],
    ["partType", "Part type"], ["direction", "Direction (in / out)"], ["pattern", "Base pattern"], ["version", "Version"],
    ["seq", "Running number"], ["free", "Free text"], ["literal", "Fixed text"]
  ];
  var SECTIONS = [
    ["entityTypes", "Entity types"], ["glossary", "Glossary"], ["namingRules", "Naming rules"], ["platforms", "Platforms & capabilities"],
    ["components", "Components"], ["applications", "Applications"], ["changeLog", "Change log"]
  ];
  var GLOSSARY_SEED = [
    ["scenario", "An end-to-end integration flow between connected applications."],
    ["integration platform (iPaaS)", "A platform that runs integration processes and exposes APIs (e.g. SAP BTP Integration Suite)."],
    ["message broker", "A platform that carries events on topics and queues (e.g. Solace)."],
    ["integration component", "A named artifact on a platform or broker (an iFlow, a topic asset …).", ["asset"]],
    ["part", "A piece of a component: API, process, topic, queue, file or scheduler."],
    ["connected system / application", "An application that calls a flow or receives from it."],
    ["endpoint", "The API or folder of an application a flow uses."],
    ["caller", "The application that calls an exposed API (= an application)."],
    ["export", "One hand-over from Pattern Bench to the registry — counted, not a version."],
    ["version", "A version of a component part (v1, v2 …); at most two live at a time."]
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function slug(t) { return String(t == null ? "" : t).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function nowIso() { return new Date().toISOString(); }

  function seed() {
    return normalize({
      schema: SCHEMA, schemaVersion: SCHEMA_VERSION, landscapeVersion: 0, name: "Default landscape", updated: "", origin: "builtin",
      entityTypes: ENTITY_IDS.map(function (id) { return { id: id, label: ENTITY_DEFAULTS[id][0], plural: ENTITY_DEFAULTS[id][1] }; }),
      glossary: GLOSSARY_SEED.map(function (g) { return { id: slug(g[0]), term: g[0], definition: g[1], aliases: g[2] || [] }; }),
      namingRules: [], platforms: [], components: [], applications: [], changeLog: []
    });
  }

  /* fill gaps so every list / field exists; unknown fields are kept */
  function normalize(c) {
    c = c && typeof c === "object" ? c : {};
    c.schema = SCHEMA; c.schemaVersion = c.schemaVersion || SCHEMA_VERSION;
    c.landscapeVersion = Number(c.landscapeVersion) || 0;
    c.name = c.name || "Default landscape";
    ["glossary", "namingRules", "platforms", "components", "applications", "changeLog"].forEach(function (k) { if (!Array.isArray(c[k])) c[k] = []; });
    var et = Array.isArray(c.entityTypes) ? c.entityTypes : [];
    c.entityTypes = ENTITY_IDS.map(function (id) {
      var e = et.find(function (x) { return x && x.id === id; }) || {};
      return { id: id, label: e.label || ENTITY_DEFAULTS[id][0], plural: e.plural || ENTITY_DEFAULTS[id][1] };
    });
    c.glossary.forEach(function (g) { g.id = g.id || slug(g.term); g.aliases = g.aliases || []; });
    c.platforms.forEach(function (p) { p.id = p.id || slug(p.name); p.aliases = p.aliases || []; p.capabilities = p.capabilities || []; p.kind = p.kind || "ipaas"; });
    c.components.forEach(function (x) { x.id = x.id || (x.platform + "/" + slug(x.name)); x.aliases = x.aliases || []; });
    c.applications.forEach(function (a) { a.id = a.id || slug(a.name); a.aliases = a.aliases || []; a.endpoints = a.endpoints || []; });
    c.namingRules.forEach(function (r, i) { r.id = r.id || "N-" + (i + 1); r.segments = r.segments || []; r.transforms = r.transforms || []; r.when = r.when || {};
      r.mode = r.mode || "derive"; r.override = r.override || "warn"; r.level = r.level || "warn"; });
    return c;
  }
  function validate(c) {
    if (!c || typeof c !== "object") return "Not a JSON object.";
    if (c.schema !== SCHEMA) return "Not a landscape config (schema must be \"" + SCHEMA + "\").";
    if (String(c.schemaVersion || "").split(".")[0] !== "0") return "Unsupported landscape schema version " + c.schemaVersion + ".";
    return null;
  }

  /* ---------- C-3 entity labels ---------- */
  function label(cfg, id, plural) {
    var e = cfg && cfg.entityTypes && cfg.entityTypes.find(function (x) { return x.id === id; });
    var d = ENTITY_DEFAULTS[id] || [id, id + "s"];
    return plural ? ((e && e.plural) || d[1]) : ((e && e.label) || d[0]);
  }

  /* ---------- lookups with aliases ---------- */
  var LISTS = { platform: "platforms", component: "components", application: "applications", glossary: "glossary" };
  function find(cfg, kind, key) {
    if (!cfg || key == null || key === "") return null;
    var list = cfg[LISTS[kind] || kind] || [], k = String(key).toLowerCase(), s = slug(key);
    return list.find(function (x) { return x.id === key; }) ||
      list.find(function (x) { return String(x.name || x.term || "").toLowerCase() === k || (x.code && String(x.code).toLowerCase() === k); }) ||
      list.find(function (x) { return (x.aliases || []).some(function (a) { return String(a).toLowerCase() === k || slug(a) === s; }); }) ||
      list.find(function (x) { return slug(x.name || x.term) === s; }) || null;
  }
  function active(list) { return (list || []).filter(function (x) { return x.status !== "retired"; }); }
  function capable(cfg, platformId, type) {
    var p = find(cfg, "platform", platformId);
    return !p || !p.capabilities || !p.capabilities.length || p.capabilities.indexOf(type) >= 0;
  }

  /* ---------- C-4 naming rules ---------- */
  function matchRule(cfg, target, ctx) {
    ctx = ctx || {};
    var rules = (cfg && cfg.namingRules) || [];
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.status === "retired" || r.target !== target) continue;
      var w = r.when || {}, ok = true;
      if (w.partType && w.partType !== ctx.partType) ok = false;
      if (w.platformKind && w.platformKind !== (ctx.platform && ctx.platform.kind)) ok = false;
      if (w.direction && w.direction !== ctx.direction) ok = false;
      if (w.pattern && w.pattern !== ctx.pattern) ok = false;
      if (w.platform && w.platform !== (ctx.platform && ctx.platform.id)) ok = false;
      if (ok) return r;
    }
    return null;
  }
  function fmtNum(fmt, n) {
    return String(fmt || "{n}").replace(/\{n(?::(0+))?\}/g, function (m, pad) { var s = String(n); return pad ? s.padStart(pad.length, "0") : s; });
  }
  function segValue(seg, ctx) {
    var src = seg.source, v = "";
    var pick = function (o, f) { return o ? (o[f] || "") : ""; };
    switch (src) {
      case "platform.code": v = pick(ctx.platform, "code"); break;
      case "platform.name": v = pick(ctx.platform, "name"); break;
      case "component.code": v = pick(ctx.component, "code"); break;
      case "component.name": v = pick(ctx.component, "name"); break;
      case "sourceApp.code": v = pick(ctx.sourceApp, "code") || pick(ctx.sourceApp, "name"); break;
      case "targetApp.code": v = pick(ctx.targetApp, "code") || pick(ctx.targetApp, "name"); break;
      case "endpoint.id": v = pick(ctx.endpoint, "id") || pick(ctx.endpoint, "name"); break;
      case "partType": v = ctx.partType || ""; break;
      case "direction": v = ctx.direction || ""; break;
      case "pattern": v = ctx.pattern || ""; break;
      case "version":
        if (ctx.version == null) v = "";
        else if (seg.optional && Number(ctx.version) <= 1) v = "";
        else v = fmtNum(seg.format || "v{n}", ctx.version);
        return v;
      case "seq": v = ctx.seq == null ? "" : fmtNum(seg.format || "{n:00}", ctx.seq); return v;
      case "free": v = (ctx.free && (ctx.free[seg.label || "Purpose"])) || ""; break;
      case "literal": v = seg.text || ""; break;
    }
    if (v === "" && seg.default) v = seg.default;
    if (seg.map && v !== "" && Object.prototype.hasOwnProperty.call(seg.map, v)) v = seg.map[v];
    else if (seg.format && v !== "" && src !== "version" && src !== "seq") v = String(seg.format).replace("{v}", v);
    if (seg["case"] === "upper") v = String(v).toUpperCase();
    else if (seg["case"] === "lower") v = String(v).toLowerCase();
    else if (seg["case"] === "title") v = String(v).replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
    if (seg.maxLength && String(v).length > seg.maxLength) v = String(v).slice(0, seg.maxLength);
    return String(v);
  }
  function applyTransforms(name, rule) {
    (rule.transforms || []).forEach(function (t) {
      if (t === "upper") name = name.toUpperCase();
      else if (t === "lower") name = name.toLowerCase();
      else if (t === "noSpaces") name = name.replace(/\s+/g, "");
      else if (t === "asciiOnly") name = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "");
    });
    return name;
  }
  /* derive a name: { name, missing:[segment labels], tokens:[{text, seg, empty}] } */
  function derive(rule, ctx) {
    ctx = ctx || {};
    var out = [], missing = [], tokens = [];
    (rule.segments || []).forEach(function (seg) {
      if (seg.delimiter !== undefined) { out.push({ d: String(seg.delimiter) }); return; }
      var v = segValue(seg, ctx);
      if (v === "") {
        if (!seg.optional && seg.source !== "version") missing.push(seg.label || seg.source);
        if (seg.optional || seg.source === "version") { out.push({ empty: true, seg: seg }); return; }
        out.push({ v: "‹" + (seg.label || seg.source) + "›", seg: seg, hole: true }); return;
      }
      out.push({ v: v, seg: seg });
    });
    // join: a delimiter is dropped next to an empty optional segment (no "__"), at the start and at the end
    var name = "", pendingDelim = null, any = false;
    out.forEach(function (t) {
      if (t.d !== undefined) { if (any) pendingDelim = pendingDelim === null ? t.d : pendingDelim; return; }
      if (t.empty) { pendingDelim = pendingDelim; tokens.push({ text: "", seg: t.seg, empty: true }); return; }
      if (pendingDelim !== null && any) { name += pendingDelim; tokens.push({ text: pendingDelim, delim: true }); }
      pendingDelim = null; name += t.v; any = true; tokens.push({ text: t.v, seg: t.seg, hole: !!t.hole });
    });
    var raw = name;
    name = applyTransforms(name, rule);
    return { name: name, raw: raw, missing: missing, tokens: tokens, rule: rule.id };
  }
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  /* a regex generated from the segments (or the rule's own) */
  function ruleRegex(rule) {
    if (rule.regex) { try { return new RegExp(rule.regex); } catch (e) { return null; } }
    var up = (rule.transforms || []).indexOf("upper") >= 0, low = (rule.transforms || []).indexOf("lower") >= 0;
    var tf = function (s) { return up ? String(s).toUpperCase() : low ? String(s).toLowerCase() : String(s); };
    var parts = [], segs = rule.segments || [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (s.delimiter !== undefined) continue;
      var d = null;   // the delimiter before this segment
      for (var j = i - 1; j >= 0; j--) { if (segs[j].delimiter !== undefined) { d = segs[j].delimiter; break; } if (segs[j].delimiter === undefined) break; }
      var body;
      if (s.source === "literal") body = reEsc(tf(s.text || ""));
      else if (s.map) body = "(?:" + Object.keys(s.map).map(function (k) { return reEsc(tf(s.map[k])); }).join("|") + ")";
      else if (s.source === "version") body = reEsc(tf(String(s.format || "v{n}").replace("{n}", "\u0001"))).replace("\u0001", "\\d+");
      else if (s.source === "seq") body = "\\d+";
      else if (s.values && s.values.length) body = "(?:" + s.values.map(function (x) { return reEsc(tf(x)); }).join("|") + ")";
      else body = ".+?";
      var piece = (d !== null && parts.length ? reEsc(d) : "") + body;
      parts.push((s.optional || s.source === "version") ? "(?:" + piece + ")?" : piece);
    }
    try { return new RegExp("^" + parts.join("") + "$", (up || low) ? "" : ""); } catch (e) { return null; }
  }
  /* check a name against the rule that matches the context:
     { ok, level:'block'|'warn'|null, rule, expected, overridden, msg } */
  function checkName(cfg, target, ctx, name, overridden) {
    var rule = matchRule(cfg, target, ctx);
    if (!rule) return { ok: true, level: null, rule: null };
    var d = derive(rule, ctx), res = { ok: true, level: null, rule: rule.id, expected: d.name, overridden: !!overridden };
    if (rule.maxLength && String(name).length > rule.maxLength) { res.ok = false; res.msg = "longer than " + rule.maxLength + " characters"; }
    if (d.missing.length && !overridden) { res.ok = false; res.msg = "missing: " + d.missing.join(", "); }
    if (overridden) {
      if (rule.override === "block") { res.ok = false; res.msg = "hand-edited name — rule " + rule.id + " locks the name (expected " + d.name + ")"; res.level = "block"; return res; }
      var re = ruleRegex(rule);
      if (re && !re.test(String(name))) { res.ok = false; res.msg = "does not follow rule " + rule.id + " (expected like " + d.name + ")"; }
      else if (rule.override === "warn" && name !== d.name) { res.ok = false; res.msg = "hand-edited name (rule " + rule.id + " would give " + d.name + ")"; res.level = "warn"; return res; }
    }
    if (!res.ok) res.level = rule.level || "warn";
    return res;
  }
  /* C-4 duplicates: names → platforms. Same name + same platform = shared object; different platform = failure */
  function duplicates(items) {   // items: [{ name, platform }]
    var by = {};
    items.forEach(function (it) { if (!it.name) return; var k = String(it.name).toLowerCase(); (by[k] = by[k] || new Set()).add(it.platform || ""); });
    var bad = new Set();
    Object.keys(by).forEach(function (k) { if (by[k].size > 1) bad.add(k); });
    return { isCrossPlatform: function (name) { return bad.has(String(name || "").toLowerCase()); }, names: bad };
  }

  /* ---------- C-3 settings diff / import ---------- */
  var DIFF_SECTIONS = ["entityTypes", "glossary", "namingRules", "platforms", "components", "applications"];
  function keyOf(sec, x) { return sec === "entityTypes" ? x.id : (x.id || slug(x.name || x.term)); }
  function strip(x) { var o = clone(x); delete o.updated; return JSON.stringify(o); }
  function diff(cur, inc) {
    cur = normalize(clone(cur)); inc = normalize(clone(inc));
    var out = [];
    DIFF_SECTIONS.forEach(function (sec) {
      var a = cur[sec] || [], b = inc[sec] || [], items = [];
      b.forEach(function (x) {
        var k = keyOf(sec, x), y = a.find(function (z) { return keyOf(sec, z) === k; });
        if (!y) items.push({ section: sec, key: k, kind: "added", item: x });
        else if (strip(x) !== strip(y)) items.push({ section: sec, key: k, kind: x.status === "retired" && y.status !== "retired" ? "retired" : "changed", item: x, before: y });
      });
      if (sec !== "entityTypes") a.forEach(function (y) {
        var k = keyOf(sec, y);
        if (!b.find(function (z) { return keyOf(sec, z) === k; }) && y.status !== "retired") items.push({ section: sec, key: k, kind: "missing", item: y });
      });
      out.push({ section: sec, items: items });
    });
    return out;
  }
  function itemTitle(it) { var x = it.item || {}; return x.label ? x.id + " → " + x.label + (x.plural ? " / " + x.plural : "") : (x.name || x.term || x.id || it.key); }
  /* accepted: set of "section|key" (items of kind "missing" are only listed, never deleted) */
  function applyImport(cur, inc, accepted, sourceName) {
    var c = normalize(clone(cur)), d = diff(cur, inc), n = 0;
    d.forEach(function (s) {
      s.items.forEach(function (it) {
        if (it.kind === "missing" || !accepted.has(it.section + "|" + it.key)) return;
        var list = c[it.section], i = list.findIndex(function (z) { return keyOf(it.section, z) === it.key; });
        if (i >= 0) list[i] = clone(it.item); else list.push(clone(it.item));
        n++;
      });
    });
    bump(c, "import", "settings", "from " + (inc.origin || "file") + " · landscapeVersion " + (inc.landscapeVersion || 0) + (sourceName ? " · " + sourceName : "") + " · " + n + " entr" + (n === 1 ? "y" : "ies"));
    return c;
  }
  function bump(c, action, item, note, origin) {
    c.landscapeVersion = (Number(c.landscapeVersion) || 0) + 1;
    c.updated = nowIso();
    if (origin) c.origin = origin;
    c.changeLog = c.changeLog || [];
    c.changeLog.push({ at: c.updated, action: action, item: item || "", note: note || "", landscapeVersion: c.landscapeVersion });
    return c;
  }
  /* what changed between two saved configs that affects derived names (codes / names) */
  function renames(before, after) {
    var out = [];
    ["platforms", "components", "applications"].forEach(function (sec) {
      (after[sec] || []).forEach(function (x) {
        var y = (before[sec] || []).find(function (z) { return z.id === x.id; });
        if (y && (y.code !== x.code || y.name !== x.name || (y.status !== "retired" && x.status === "retired")))
          out.push({ section: sec, id: x.id, from: y.name + (y.code ? " (" + y.code + ")" : ""), to: x.name + (x.code ? " (" + x.code + ")" : ""), retired: x.status === "retired" });
      });
    });
    if (JSON.stringify(before.namingRules || []) !== JSON.stringify(after.namingRules || [])) out.push({ section: "namingRules", id: "*", from: "", to: "" });
    return out;
  }
  function download(obj, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  /* save: into a directory handle (File System Access) when given, else a file picker, else a download */
  function saveFile(obj, name, dirHandle) {
    var text = JSON.stringify(obj, null, 2);
    if (dirHandle && dirHandle.getFileHandle) {
      return dirHandle.getFileHandle(name, { create: true }).then(function (fh) { return fh.createWritable(); })
        .then(function (w) { return w.write(text).then(function () { return w.close(); }); }).then(function () { return "folder"; });
    }
    download(obj, name);
    return Promise.resolve("download");
  }

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  var CSS = "" +
    ".ls-modal{position:fixed;inset:0;z-index:2147483000;background:rgba(16,24,40,.42);display:flex;align-items:center;justify-content:center;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2a3c}" +
    ".ls-box{background:#fff;border-radius:16px;width:min(1080px,calc(100vw - 32px));height:min(720px,calc(100vh - 32px));display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(16,24,40,.3);overflow:hidden}" +
    ".ls-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #e4e7ec}.ls-head h2{margin:0;font-size:16px}.ls-head .ls-badge{font-size:11.5px;color:#667085;background:#f2f4f7;border-radius:999px;padding:2px 9px}" +
    ".ls-head .ls-sp{flex:1}.ls-main{flex:1;display:flex;min-height:0}.ls-nav{width:200px;border-right:1px solid #e4e7ec;padding:8px;overflow:auto;background:#fafbfc}" +
    ".ls-nav button{display:block;width:100%;text-align:left;border:0;background:none;padding:7px 10px;border-radius:8px;font:inherit;cursor:pointer;color:inherit}.ls-nav button.on{background:#e6f4f3;color:#0a5f5c;font-weight:600}" +
    ".ls-body{flex:1;overflow:auto;padding:14px 18px}.ls-body h3{margin:0 0 8px;font-size:14px}.ls-note{color:#667085;font-size:12px;margin:0 0 10px}" +
    ".ls-foot{display:flex;gap:8px;align-items:center;padding:10px 16px;border-top:1px solid #e4e7ec}.ls-foot .ls-sp{flex:1}.ls-msg{color:#b42318;font-size:12px}" +
    ".ls-btn{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:5px 11px;font:inherit;cursor:pointer;color:inherit}.ls-btn:hover{background:#f2f4f7}.ls-btn.pri{background:#0f7c7a;border-color:#0f7c7a;color:#fff}.ls-btn.pri:hover{background:#0a5f5c}" +
    ".ls-btn:disabled{opacity:.45;cursor:not-allowed}.ls-btn.sm{padding:2px 8px;font-size:12px}" +
    ".ls-tbl{width:100%;border-collapse:collapse}.ls-tbl th{text-align:left;font-weight:600;color:#475467;font-size:12px;padding:5px 6px;border-bottom:1px solid #e4e7ec}.ls-tbl td{padding:4px 6px;border-bottom:1px solid #f2f4f7;vertical-align:top}" +
    ".ls-tbl tr.retired td{color:#98a2b3}.ls-tbl tr.retired input{color:#98a2b3}.ls-tbl input[type=text],.ls-tbl select,.ls-f input,.ls-f select{border:1px solid #d0d5dd;border-radius:6px;padding:3px 6px;font:inherit;width:100%;box-sizing:border-box;background:#fff;color:inherit}" +
    ".ls-tbl input:disabled,.ls-f input:disabled,.ls-f select:disabled,.ls-tbl select:disabled{background:#f9fafb}.ls-caps label{display:inline-flex;align-items:center;gap:3px;margin-right:8px;white-space:nowrap}" +
    ".ls-rules{display:flex;gap:14px}.ls-rlist{width:230px;flex:none}.ls-rule{border:1px solid #e4e7ec;border-radius:10px;padding:6px 8px;margin-bottom:6px;cursor:pointer;display:flex;gap:6px;align-items:center;background:#fff}" +
    ".ls-rule.on{border-color:#0f7c7a;box-shadow:0 0 0 2px #c5e7e5}.ls-rule .t{flex:1;min-width:0}.ls-rule small{display:block;color:#667085}.ls-rule.dragover{border-style:dashed;border-color:#0f7c7a}" +
    ".ls-build{flex:1;min-width:0}.ls-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}.ls-f label{display:block;font-size:11.5px;color:#475467;margin-bottom:2px}" +
    ".ls-segs{display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:1px dashed #d0d5dd;border-radius:10px;min-height:38px;margin-bottom:8px;background:#fcfcfd}" +
    ".ls-seg{display:inline-flex;align-items:center;gap:4px;border-radius:8px;padding:3px 6px 3px 8px;background:#e8ecff;color:#2f43c2;cursor:grab;user-select:none;border:1px solid transparent}" +
    ".ls-seg.delim{background:#f2f4f7;color:#344054;font-family:ui-monospace,monospace}.ls-seg.on{border-color:#2f43c2}.ls-seg.dragover{outline:2px dashed #0f7c7a}.ls-seg button{border:0;background:none;cursor:pointer;color:inherit;padding:0 2px;font:inherit}" +
    ".ls-prev{font-family:ui-monospace,monospace;font-size:15px;padding:8px 10px;background:#101828;color:#e6f4f3;border-radius:8px;margin:6px 0 4px;word-break:break-all}.ls-prev .hole{color:#fdb022}" +
    ".ls-segedit{border:1px solid #e4e7ec;border-radius:10px;padding:8px;margin:8px 0;background:#fafbfc}.ls-chk{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0}.ls-chk label{display:inline-flex;gap:4px;align-items:center}" +
    ".ls-diff h4{margin:10px 0 4px;font-size:12.5px}.ls-diff .row{display:flex;gap:8px;align-items:baseline;padding:2px 0}.ls-diff .k{font-size:11px;border-radius:999px;padding:0 7px}.ls-diff .k.added{background:#d1fadf;color:#05603a}" +
    ".ls-diff .k.changed{background:#fef0c7;color:#93370d}.ls-diff .k.retired{background:#fee4e2;color:#912018}.ls-diff .k.missing{background:#f2f4f7;color:#475467}.ls-warn{background:#fffaeb;border:1px solid #fedf89;color:#93370d;border-radius:8px;padding:6px 10px;margin:6px 0}" +
    ".ls-wiz{width:min(760px,calc(100vw - 32px));height:auto;max-height:calc(100vh - 32px)}.ls-steps{display:flex;gap:4px;padding:10px 16px;border-bottom:1px solid #e4e7ec}.ls-step{flex:1;text-align:center;font-size:12px;padding:5px;border-radius:8px;background:#f2f4f7;color:#667085}" +
    ".ls-step.on{background:#0f7c7a;color:#fff}.ls-step.done{background:#d1fadf;color:#05603a}.ls-wbody{padding:14px 18px;overflow:auto;flex:1}.ls-item{border:1px solid #e4e7ec;border-radius:10px;padding:7px 10px;margin-bottom:6px}" +
    ".ls-item.block{border-color:#fda29b;background:#fef3f2}.ls-item .fix{color:#475467;font-size:12px}.ls-ok{color:#05603a;background:#ecfdf3;border-radius:8px;padding:8px 10px}" +
    ".ls-dark .ls-box{background:#1b2230;color:#e4e7ec}.ls-dark .ls-nav{background:#151b26}.ls-dark .ls-tbl input,.ls-dark .ls-tbl select,.ls-dark .ls-f input,.ls-dark .ls-f select{background:#101828;color:#e4e7ec;border-color:#344054}" +
    ".ls-dark .ls-btn{background:#101828;color:#e4e7ec;border-color:#344054}.ls-dark .ls-rule,.ls-dark .ls-segs,.ls-dark .ls-segedit{background:#151b26;border-color:#344054}";
  function ensureCss() {
    if (document.getElementById("ls-css")) return;
    var s = document.createElement("style"); s.id = "ls-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------- Settings editor (R-2 / A-2) ----------
     opts: { config, readOnly, origin:'registry'|'pattern-bench', title, onSave(cfg, renames) → Promise|void,
             isUsed(kind,id) → bool, dark, sourceLabel } */
  function openSettings(opts) {
    ensureCss();
    var orig = normalize(clone(opts.config || seed()));
    var cfg = clone(orig), dirty = false, sec = opts.section || "entityTypes", ro = !!opts.readOnly, ruleSel = 0, segSel = -1;
    var L = function (id, p) { return label(cfg, id, p); };
    var root = h("div", { class: "ls-modal" + (opts.dark ? " ls-dark" : ""), "data-ls": "settings" });
    var box = h("div", { class: "ls-box", role: "dialog", "aria-label": "Settings" });
    root.appendChild(box);
    var nav = h("div", { class: "ls-nav" }), body = h("div", { class: "ls-body" }), msg = h("span", { class: "ls-msg" });
    var badge = h("span", { class: "ls-badge" });
    var fileIn = h("input", { type: "file", accept: ".json,application/json", style: "display:none" });
    function setDirty() { dirty = true; saveBtn.disabled = ro; badge.textContent = (opts.sourceLabel || "") + " · v" + cfg.landscapeVersion + " · unsaved changes"; }
    function close() { root.remove(); document.removeEventListener("keydown", onKey, true); if (opts.onClose) opts.onClose(); }
    function onKey(e) { if (e.key === "Escape" && root.isConnected && !root.querySelector(".ls-modal")) { e.stopPropagation(); close(); } }
    document.addEventListener("keydown", onKey, true);
    var saveBtn = h("button", { class: "ls-btn pri", "data-ls-act": "save", disabled: true, text: "Save", onclick: function () {
      var before = orig, after = bump(clone(cfg), "edit", "settings", "saved in " + (opts.origin || "app"), opts.origin);
      var r = opts.onSave ? opts.onSave(after, renames(before, after)) : null;
      Promise.resolve(r).then(function () { orig = after; cfg = clone(after); dirty = false; saveBtn.disabled = true; render(); msg.textContent = ""; })
        .catch(function (e) { msg.textContent = "Not saved: " + (e && e.message || e); });
    } });
    var head = h("div", { class: "ls-head" }, [h("h2", { text: opts.title || "Settings" }), badge, h("span", { class: "ls-sp" }),
      ro ? h("span", { class: "ls-badge", text: "read-only · export only" }) : null,
      h("button", { class: "ls-btn", title: "Close", "data-ls-act": "close", text: "×", onclick: function () {
        if (dirty && !confirm("Discard unsaved changes?")) return; close(); } })]);
    var foot = h("div", { class: "ls-foot" }, [
      ro ? null : h("button", { class: "ls-btn", "data-ls-act": "import", text: "Import settings…", onclick: function () { fileIn.click(); } }),
      h("button", { class: "ls-btn", "data-ls-act": "export", text: "Export settings", onclick: function () {
        var out = clone(dirty ? cfg : orig); out.origin = opts.origin || out.origin; download(out, "landscape.json"); } }),
      msg, h("span", { class: "ls-sp" }), ro ? null : saveBtn, fileIn]);
    box.appendChild(head);
    var main = h("div", { class: "ls-main" }, [nav, body]); box.appendChild(main); box.appendChild(foot);
    fileIn.addEventListener("change", function () {
      var f = fileIn.files[0]; fileIn.value = ""; if (!f) return;
      f.text().then(function (t) {
        var inc; try { inc = JSON.parse(t); } catch (e) { msg.textContent = "Import failed: not valid JSON."; return; }
        var err = validate(inc); if (err) { msg.textContent = "Import failed: " + err; return; }
        importPreview(inc, f.name);
      });
    });
    function importPreview(inc, fname) {
      var d = diff(cfg, inc), acc = new Set();
      d.forEach(function (s) { s.items.forEach(function (it) { if (it.kind !== "missing") acc.add(it.section + "|" + it.key); }); });
      var ov = h("div", { class: "ls-modal", "data-ls": "import" }), b = h("div", { class: "ls-box ls-wiz" });
      ov.appendChild(b);
      var older = (Number(inc.landscapeVersion) || 0) < (Number(cfg.landscapeVersion) || 0);
      var list = h("div", { class: "ls-wbody ls-diff" });
      list.appendChild(h("p", { class: "ls-note", text: "From " + fname + " · origin " + (inc.origin || "unknown") + " · landscapeVersion " + (inc.landscapeVersion || 0) + " (current v" + cfg.landscapeVersion + ")" }));
      if (older) list.appendChild(h("div", { class: "ls-warn", "data-ls": "older", text: "⚠ The incoming file is older (v" + (inc.landscapeVersion || 0) + ") than the current settings (v" + cfg.landscapeVersion + "). Check before accepting." }));
      var total = 0;
      d.forEach(function (s) {
        if (!s.items.length) return;
        list.appendChild(h("h4", { text: (SECTIONS.find(function (x) { return x[0] === s.section; }) || [0, s.section])[1] }));
        s.items.forEach(function (it) {
          total++;
          var key = it.section + "|" + it.key;
          var cb = it.kind === "missing" ? null : h("input", { type: "checkbox", checked: true, "data-key": key, onchange: function () { cb.checked ? acc.add(key) : acc.delete(key); } });
          list.appendChild(h("div", { class: "row" }, [cb || h("span", { style: "width:13px" }), h("span", { class: "k " + it.kind, text: it.kind === "missing" ? "not in file (kept)" : it.kind }), h("span", { text: itemTitle(it) })]));
        });
      });
      if (!total) list.appendChild(h("div", { class: "ls-ok", text: "No differences — nothing to import." }));
      var done = function (all) {
        if (all) d.forEach(function (s) { s.items.forEach(function (it) { if (it.kind !== "missing") acc.add(it.section + "|" + it.key); }); });
        var next = applyImport(cfg, inc, acc, fname);
        next.origin = opts.origin || next.origin;
        var before = orig;
        var r = opts.onSave ? opts.onSave(next, renames(before, next)) : null;
        Promise.resolve(r).then(function () { orig = next; cfg = clone(next); dirty = false; saveBtn.disabled = true; ov.remove(); render(); })
          .catch(function (e) { msg.textContent = "Not saved: " + (e && e.message || e); ov.remove(); });
      };
      b.appendChild(h("div", { class: "ls-head" }, [h("h2", { text: "Import settings — preview" }), h("span", { class: "ls-sp" })]));
      b.appendChild(list);
      b.appendChild(h("div", { class: "ls-foot" }, [h("button", { class: "ls-btn", "data-ls-act": "cancel-import", text: "Cancel", onclick: function () { ov.remove(); } }), h("span", { class: "ls-sp" }),
        h("button", { class: "ls-btn", "data-ls-act": "accept-selected", disabled: !total, text: "Accept selected", onclick: function () { done(false); } }),
        h("button", { class: "ls-btn pri", "data-ls-act": "accept-all", disabled: !total, text: "Accept all", onclick: function () { done(true); } })]));
      root.appendChild(ov);
    }
    function render() {
      badge.textContent = (opts.sourceLabel ? opts.sourceLabel + " · " : "") + "v" + cfg.landscapeVersion + (dirty ? " · unsaved changes" : "");
      nav.innerHTML = "";
      SECTIONS.forEach(function (s) {
        var t = s[0] === "platforms" ? L("platform", true) + " & capabilities" : s[0] === "components" ? L("component", true) : s[0] === "applications" ? L("application", true) : s[1];
        nav.appendChild(h("button", { class: sec === s[0] ? "on" : "", "data-sec": s[0], text: t, onclick: function () { sec = s[0]; segSel = -1; render(); } }));
      });
      body.innerHTML = "";
      ({ entityTypes: renderEntities, glossary: renderGlossary, namingRules: renderRules, platforms: renderPlatforms, components: renderComponents,
         applications: renderApps, changeLog: renderLog })[sec]();
    }
    function inp(val, on, extra) { var i = h("input", Object.assign({ type: "text", value: val == null ? "" : val, disabled: ro }, extra || {})); i.addEventListener("input", function () { on(i.value); setDirty(); }); return i; }
    function sel(val, options, on, extra) {
      var s = h("select", Object.assign({ disabled: ro }, extra || {}));
      options.forEach(function (o) { var op = h("option", { value: o[0], text: o[1] }); if (String(o[0]) === String(val == null ? "" : val)) op.selected = true; s.appendChild(op); });
      s.addEventListener("change", function () { on(s.value); setDirty(); if (extra && extra.rerender) render(); }); return s;
    }
    function listOf(text) { return String(text || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
    function retireBtn(kind, x, list) {
      if (ro) return null;
      var used = opts.isUsed ? opts.isUsed(kind, x.id) : false;
      return h("span", {}, [
        h("button", { class: "ls-btn sm", "data-ls-act": "retire", text: x.status === "retired" ? "Re-activate" : "Retire", onclick: function () { x.status = x.status === "retired" ? "active" : "retired"; setDirty(); render(); } }),
        used ? null : h("button", { class: "ls-btn sm", title: "Delete (not used anywhere)", text: "×", onclick: function () { list.splice(list.indexOf(x), 1); setDirty(); render(); } })]);
    }
    function renderEntities() {
      body.appendChild(h("h3", { text: "Entity types" }));
      body.appendChild(h("p", { class: "ls-note", text: "Display names only — ids stay fixed (used in code, JSON fields and naming-rule targets). Every screen text reads these labels." }));
      var t = h("table", { class: "ls-tbl" }, [h("tr", {}, [h("th", { text: "Id" }), h("th", { text: "Label" }), h("th", { text: "Plural" })])]);
      cfg.entityTypes.forEach(function (e) {
        t.appendChild(h("tr", { "data-id": e.id }, [h("td", { text: e.id }), h("td", {}, [inp(e.label, function (v) { e.label = v; }, { "data-f": "label" })]), h("td", {}, [inp(e.plural, function (v) { e.plural = v; }, { "data-f": "plural" })])]));
      });
      body.appendChild(t);
    }
    function renderGlossary() {
      body.appendChild(h("h3", { text: "Glossary" }));
      var t = h("table", { class: "ls-tbl" }, [h("tr", {}, [h("th", { text: "Term" }), h("th", { text: "Definition" }), h("th", { text: "Aliases" }), h("th", {})])]);
      cfg.glossary.forEach(function (g) {
        t.appendChild(h("tr", { class: g.status === "retired" ? "retired" : "" }, [h("td", {}, [inp(g.term, function (v) { g.term = v; })]), h("td", {}, [inp(g.definition, function (v) { g.definition = v; })]),
          h("td", {}, [inp((g.aliases || []).join(", "), function (v) { g.aliases = listOf(v); })]), h("td", {}, [retireBtn("glossary", g, cfg.glossary)])]));
      });
      body.appendChild(t);
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", text: "＋ Add term", onclick: function () { cfg.glossary.push({ id: "term-" + Date.now().toString(36), term: "", definition: "", aliases: [] }); setDirty(); render(); } }));
    }
    function renderPlatforms() {
      body.appendChild(h("h3", { text: L("platform", true) + " & capabilities" }));
      body.appendChild(h("p", { class: "ls-note", text: "Capabilities = block types the " + L("platform").toLowerCase() + " may host; Pattern Bench greys out the rest. Code = short form used by naming rules." }));
      var t = h("table", { class: "ls-tbl", "data-ls": "platforms" }, [h("tr", {}, [h("th", { text: "Name" }), h("th", { text: "Code" }), h("th", { text: "Kind" }), h("th", { text: "Capabilities" }), h("th", { text: "Aliases" }), h("th", {})])]);
      cfg.platforms.forEach(function (p) {
        var caps = h("td", { class: "ls-caps" });
        CAPABILITIES.forEach(function (c) {
          var cb = h("input", { type: "checkbox", checked: p.capabilities.indexOf(c) >= 0, disabled: ro, "data-cap": c });
          cb.addEventListener("change", function () { p.capabilities = CAPABILITIES.filter(function (x) { return x === c ? cb.checked : p.capabilities.indexOf(x) >= 0; }); setDirty(); });
          caps.appendChild(h("label", {}, [cb, c]));
        });
        t.appendChild(h("tr", { class: p.status === "retired" ? "retired" : "", "data-id": p.id }, [h("td", {}, [inp(p.name, function (v) { p.name = v; }, { "data-f": "name" })]),
          h("td", { style: "width:80px" }, [inp(p.code, function (v) { p.code = v; }, { "data-f": "code" })]),
          h("td", { style: "width:100px" }, [sel(p.kind, [["ipaas", "iPaaS"], ["broker", "Broker"]], function (v) { p.kind = v; })]), caps,
          h("td", {}, [inp((p.aliases || []).join(", "), function (v) { p.aliases = listOf(v); })]), h("td", {}, [retireBtn("platform", p, cfg.platforms)])]));
      });
      body.appendChild(t);
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", "data-ls-act": "add-platform", text: "＋ Add " + L("platform").toLowerCase(), onclick: function () {
        cfg.platforms.push({ id: "platform-" + Date.now().toString(36), name: "", code: "", kind: "ipaas", capabilities: ["api", "process"], aliases: [] }); setDirty(); render(); } }));
    }
    function renderComponents() {
      body.appendChild(h("h3", { text: L("component", true) }));
      var plats = [["", "—"]].concat(cfg.platforms.map(function (p) { return [p.id, p.name || p.id]; }));
      var t = h("table", { class: "ls-tbl", "data-ls": "components" }, [h("tr", {}, [h("th", { text: "Name" }), h("th", { text: "Code" }), h("th", { text: L("platform") }), h("th", { text: "Aliases" }), h("th", {})])]);
      cfg.components.forEach(function (x) {
        t.appendChild(h("tr", { class: x.status === "retired" ? "retired" : "", "data-id": x.id }, [h("td", {}, [inp(x.name, function (v) { x.name = v; }, { "data-f": "name" })]),
          h("td", { style: "width:80px" }, [inp(x.code, function (v) { x.code = v; }, { "data-f": "code" })]), h("td", {}, [sel(x.platform, plats, function (v) { x.platform = v; })]),
          h("td", {}, [inp((x.aliases || []).join(", "), function (v) { x.aliases = listOf(v); })]), h("td", {}, [retireBtn("component", x, cfg.components)])]));
      });
      body.appendChild(t);
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", text: "＋ Add " + L("component").toLowerCase(), onclick: function () {
        cfg.components.push({ id: "component-" + Date.now().toString(36), platform: (cfg.platforms[0] || {}).id || "", name: "", code: "", aliases: [] }); setDirty(); render(); } }));
    }
    function renderApps() {
      body.appendChild(h("h3", { text: L("application", true) }));
      body.appendChild(h("p", { class: "ls-note", text: L("endpoint", true) + ": comma list of id:type (api or file), e.g. API_SALES_ORDER_SRV:api, /out/payments:file." }));
      var t = h("table", { class: "ls-tbl", "data-ls": "applications" }, [h("tr", {}, [h("th", { text: "Name" }), h("th", { text: "Code" }), h("th", { text: L("endpoint", true) }), h("th", { text: "Aliases" }), h("th", {})])]);
      cfg.applications.forEach(function (a) {
        t.appendChild(h("tr", { class: a.status === "retired" ? "retired" : "", "data-id": a.id }, [h("td", {}, [inp(a.name, function (v) { a.name = v; }, { "data-f": "name" })]),
          h("td", { style: "width:80px" }, [inp(a.code, function (v) { a.code = v; }, { "data-f": "code" })]),
          h("td", {}, [inp((a.endpoints || []).map(function (e) { return e.id + ":" + (e.type || "api"); }).join(", "), function (v) {
            a.endpoints = listOf(v).map(function (s) { var i = s.lastIndexOf(":"); return i > 0 && /^(api|file)$/.test(s.slice(i + 1)) ? { id: s.slice(0, i), type: s.slice(i + 1) } : { id: s, type: "api" }; }); })]),
          h("td", {}, [inp((a.aliases || []).join(", "), function (v) { a.aliases = listOf(v); })]), h("td", {}, [retireBtn("application", a, cfg.applications)])]));
      });
      body.appendChild(t);
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", text: "＋ Add " + L("application").toLowerCase(), onclick: function () {
        cfg.applications.push({ id: "app-" + Date.now().toString(36), name: "", code: "", endpoints: [], aliases: [] }); setDirty(); render(); } }));
    }
    function renderLog() {
      body.appendChild(h("h3", { text: "Change log" }));
      var t = h("table", { class: "ls-tbl" }, [h("tr", {}, [h("th", { text: "When" }), h("th", { text: "Action" }), h("th", { text: "Item" }), h("th", { text: "Note" }), h("th", { text: "v" })])]);
      cfg.changeLog.slice().reverse().forEach(function (c) { t.appendChild(h("tr", {}, [h("td", { text: String(c.at || "").replace("T", " ").slice(0, 16) }), h("td", { text: c.action }), h("td", { text: c.item }), h("td", { text: c.note || "" }), h("td", { text: c.landscapeVersion || "" })])); });
      if (!cfg.changeLog.length) t.appendChild(h("tr", {}, [h("td", { colspan: 5, text: "No changes yet." })]));
      body.appendChild(t);
    }
    /* naming rules = segment builder */
    function renderRules() {
      body.appendChild(h("h3", { text: "Naming rules" }));
      body.appendChild(h("p", { class: "ls-note", text: "One global rule set. First matching rule wins (top = highest priority; drag to reorder). Names are derived from the segments; delimiters next to an empty optional segment are dropped." }));
      var wrap = h("div", { class: "ls-rules" }), lst = h("div", { class: "ls-rlist", "data-ls": "rules" }), bld = h("div", { class: "ls-build" });
      wrap.appendChild(lst); wrap.appendChild(bld); body.appendChild(wrap);
      var dragI = -1;
      cfg.namingRules.forEach(function (r, i) {
        var card = h("div", { class: "ls-rule" + (i === ruleSel ? " on" : ""), draggable: !ro, "data-rule": r.id, onclick: function () { ruleSel = i; segSel = -1; render(); } },
          [h("span", { text: "☰", style: "color:#98a2b3" }), h("span", { class: "t" }, [h("b", { text: r.id }), h("small", { text: r.target + (r.when && r.when.partType ? " · " + r.when.partType : "") + " · " + r.mode + (r.status === "retired" ? " · retired" : "") })])]);
        card.addEventListener("dragstart", function () { dragI = i; });
        card.addEventListener("dragover", function (e) { e.preventDefault(); card.classList.add("dragover"); });
        card.addEventListener("dragleave", function () { card.classList.remove("dragover"); });
        card.addEventListener("drop", function (e) { e.preventDefault(); if (dragI < 0 || dragI === i) return; var m = cfg.namingRules.splice(dragI, 1)[0]; cfg.namingRules.splice(i, 0, m); ruleSel = i; setDirty(); render(); });
        lst.appendChild(card);
      });
      if (!ro) lst.appendChild(h("button", { class: "ls-btn", "data-ls-act": "add-rule", text: "＋ Add rule", onclick: function () {
        var n = 1; while (cfg.namingRules.some(function (x) { return x.id === "N-" + n; })) n++;
        cfg.namingRules.push({ id: "N-" + n, target: "part", when: {}, mode: "derive", segments: [{ source: "component.code" }, { delimiter: "_" }, { source: "partType", map: { api: "API", process: "IF", topic: "TP", queue: "Q", file: "FL", scheduler: "SCH" } }],
          transforms: ["upper", "noSpaces"], maxLength: 60, override: "warn", level: "warn" });
        ruleSel = cfg.namingRules.length - 1; segSel = -1; setDirty(); render(); } }));
      var r = cfg.namingRules[ruleSel];
      if (!r) { bld.appendChild(h("p", { class: "ls-note", text: "No rule yet. Without a rule, names fall back to “<" + L("component").toLowerCase() + "> <type>”." })); return; }
      var targets = ENTITY_IDS.map(function (id) { return [id, label(cfg, id)]; });
      var g = h("div", { class: "ls-grid" });
      var fld = function (lab, el) { return h("div", { class: "ls-f" }, [h("label", { text: lab }), el]); };
      g.appendChild(fld("Rule id", inp(r.id, function (v) { r.id = v; }, { "data-f": "rule-id" })));
      g.appendChild(fld("Target", sel(r.target, targets, function (v) { r.target = v; }, { "data-f": "target" })));
      g.appendChild(fld("When part type", sel(r.when.partType || "", [["", "any"]].concat(PART_TYPES.map(function (t) { return [t, t]; })), function (v) { if (v) r.when.partType = v; else delete r.when.partType; }, { "data-f": "when-part" })));
      g.appendChild(fld("When platform kind", sel(r.when.platformKind || "", [["", "any"], ["ipaas", "iPaaS"], ["broker", "Broker"]], function (v) { if (v) r.when.platformKind = v; else delete r.when.platformKind; })));
      g.appendChild(fld("When direction", sel(r.when.direction || "", [["", "any"], ["in", "in"], ["out", "out"]], function (v) { if (v) r.when.direction = v; else delete r.when.direction; })));
      g.appendChild(fld("Mode", sel(r.mode, [["derive", "derive (build the name)"], ["check", "check only"]], function (v) { r.mode = v; })));
      g.appendChild(fld("Override", sel(r.override, [["allow", "allow"], ["warn", "warn"], ["block", "block (locked)"]], function (v) { r.override = v; }, { "data-f": "override" })));
      g.appendChild(fld("Breach level", sel(r.level, [["warn", "warn"], ["block", "block"]], function (v) { r.level = v; }, { "data-f": "level" })));
      bld.appendChild(g);
      // segments row
      var segs = h("div", { class: "ls-segs", "data-ls": "segments" }), dragS = -1;
      r.segments.forEach(function (s, i) {
        var isD = s.delimiter !== undefined;
        var txt = isD ? JSON.stringify(s.delimiter).slice(1, -1) || "␣" : (s.source === "free" ? "free: " + (s.label || "Purpose") : s.source === "literal" ? "“" + (s.text || "") + "”" : s.source) + (s.optional ? "?" : "");
        var chip = h("span", { class: "ls-seg" + (isD ? " delim" : "") + (i === segSel ? " on" : ""), draggable: !ro, "data-seg": i, onclick: function () { segSel = i; render(); } },
          [h("span", { text: txt }), ro ? null : h("button", { title: "Remove", text: "×", onclick: function (e) { e.stopPropagation(); r.segments.splice(i, 1); segSel = -1; setDirty(); render(); } })]);
        chip.addEventListener("dragstart", function () { dragS = i; });
        chip.addEventListener("dragover", function (e) { e.preventDefault(); chip.classList.add("dragover"); });
        chip.addEventListener("dragleave", function () { chip.classList.remove("dragover"); });
        chip.addEventListener("drop", function (e) { e.preventDefault(); if (dragS < 0 || dragS === i) return; var m = r.segments.splice(dragS, 1)[0]; r.segments.splice(i, 0, m); segSel = i; setDirty(); render(); });
        segs.appendChild(chip);
      });
      bld.appendChild(segs);
      if (!ro) {
        var srcSel = h("select", { "data-f": "add-source" }); SEGMENT_SOURCES.forEach(function (s) { srcSel.appendChild(h("option", { value: s[0], text: s[1] })); });
        var dIn = h("input", { type: "text", value: "_", style: "width:50px", "data-f": "add-delim" });
        bld.appendChild(h("div", { class: "ls-chk" }, [srcSel, h("button", { class: "ls-btn sm", "data-ls-act": "add-seg", text: "＋ placeholder", onclick: function () {
          var s = { source: srcSel.value }; if (s.source === "free") { s.label = "Purpose"; s.required = true; s.maxLength = 20; }
          if (s.source === "partType") s.map = { api: "API", process: "IF", topic: "TP", queue: "Q", file: "FL", scheduler: "SCH" };
          if (s.source === "version") { s.format = "v{n}"; s.optional = true; } if (s.source === "literal") s.text = "X";
          var last = r.segments[r.segments.length - 1];
          if (last && last.delimiter === undefined && dIn.value) r.segments.push({ delimiter: dIn.value });   // keep placeholders apart
          r.segments.push(s); segSel = r.segments.length - 1; setDirty(); render(); } }),
          dIn, h("button", { class: "ls-btn sm", "data-ls-act": "add-delim", text: "＋ delimiter", onclick: function () { r.segments.push({ delimiter: dIn.value }); setDirty(); render(); } }),
          h("button", { class: "ls-btn sm", text: "▲ rule up", disabled: ruleSel === 0, onclick: function () { var m = cfg.namingRules.splice(ruleSel, 1)[0]; ruleSel--; cfg.namingRules.splice(ruleSel, 0, m); setDirty(); render(); } }),
          h("button", { class: "ls-btn sm", text: r.status === "retired" ? "Re-activate rule" : "Retire rule", onclick: function () { r.status = r.status === "retired" ? "active" : "retired"; setDirty(); render(); } })]));
      }
      // per-segment editor
      var s = r.segments[segSel];
      if (s) {
        var ed = h("div", { class: "ls-segedit", "data-ls": "segedit" }), gg = h("div", { class: "ls-grid" });
        if (s.delimiter !== undefined) gg.appendChild(fld("Delimiter", inp(s.delimiter, function (v) { s.delimiter = v; })));
        else {
          gg.appendChild(fld("Source", sel(s.source, SEGMENT_SOURCES, function (v) { s.source = v; }, { rerender: true })));
          if (s.source === "free") { gg.appendChild(fld("Label", inp(s.label, function (v) { s.label = v; }))); gg.appendChild(fld("Allowed values (comma)", inp((s.values || []).join(", "), function (v) { s.values = listOf(v); if (!s.values.length) delete s.values; }))); }
          if (s.source === "literal") gg.appendChild(fld("Text", inp(s.text, function (v) { s.text = v; })));
          gg.appendChild(fld("Map (value=abbr, …)", inp(s.map ? Object.keys(s.map).map(function (k) { return k + "=" + s.map[k]; }).join(", ") : "", function (v) {
            var m = {}; listOf(v).forEach(function (p) { var i = p.indexOf("="); if (i > 0) m[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); if (Object.keys(m).length) s.map = m; else delete s.map; }, { "data-f": "seg-map" })));
          gg.appendChild(fld("Format", inp(s.format, function (v) { if (v) s.format = v; else delete s.format; }, { placeholder: s.source === "version" ? "v{n}" : s.source === "seq" ? "{n:000}" : "{v}" })));
          gg.appendChild(fld("Case", sel(s["case"] || "", [["", "as is"], ["upper", "upper"], ["lower", "lower"], ["title", "title"]], function (v) { if (v) s["case"] = v; else delete s["case"]; })));
          gg.appendChild(fld("Max length", inp(s.maxLength || "", function (v) { var n = parseInt(v, 10); if (n > 0) s.maxLength = n; else delete s.maxLength; })));
          gg.appendChild(fld("Default", inp(s["default"] || "", function (v) { if (v) s["default"] = v; else delete s["default"]; })));
          var req = h("input", { type: "checkbox", checked: !!s.required, disabled: ro, onchange: function () { s.required = req.checked; if (req.checked) delete s.optional; setDirty(); render(); } });
          var opt = h("input", { type: "checkbox", checked: !!s.optional, disabled: ro, "data-f": "seg-optional", onchange: function () { s.optional = opt.checked; if (opt.checked) delete s.required; setDirty(); render(); } });
          ed.appendChild(h("div", { class: "ls-chk" }, [h("label", {}, [req, "required"]), h("label", {}, [opt, "optional (drops its delimiter when empty)"])]));
        }
        ed.insertBefore(gg, ed.firstChild);
        bld.appendChild(ed);
      }
      // whole-name rules
      var tr = h("div", { class: "ls-chk" }, [h("b", { text: "Whole name:" })]);
      ["upper", "lower", "noSpaces", "asciiOnly"].forEach(function (t) {
        var cb = h("input", { type: "checkbox", checked: r.transforms.indexOf(t) >= 0, disabled: ro, onchange: function () { r.transforms = ["upper", "lower", "noSpaces", "asciiOnly"].filter(function (x) { return x === t ? cb.checked : r.transforms.indexOf(x) >= 0; }); setDirty(); render(); } });
        tr.appendChild(h("label", {}, [cb, t]));
      });
      tr.appendChild(h("label", {}, ["max length ", inp(r.maxLength || "", function (v) { var n = parseInt(v, 10); if (n > 0) r.maxLength = n; else delete r.maxLength; }, { style: "width:60px" })]));
      bld.appendChild(tr);
      // live preview with a sample block
      var smp = sample(cfg, r), d = derive(r, smp);
      var pv = h("div", { class: "ls-prev", "data-ls": "preview" });
      d.tokens.forEach(function (t) { if (t.text) pv.appendChild(h("span", { class: t.hole ? "hole" : "", text: applyTransforms(t.text, r) })); });
      if (!d.tokens.some(function (t) { return t.text; })) pv.textContent = "(empty)";
      pv.dataset.name = d.name;
      bld.appendChild(h("div", { class: "ls-note", text: "Preview with a sample: " + describeSample(smp) }));
      bld.appendChild(pv);
      bld.appendChild(h("div", { class: "ls-note", text: "→ " + d.name + (d.missing.length ? "   (asks for: " + d.missing.join(", ") + ")" : "") }));
    }
    render();
    document.body.appendChild(root);
    return { root: root, close: close, get config() { return cfg; } };
  }
  function sample(cfg, rule) {
    var p = active(cfg.platforms)[0] || { id: "btp-is", name: "SAP BTP Integration Suite", code: "BTP", kind: "ipaas" };
    var c = active(cfg.components).find(function (x) { return x.platform === p.id; }) || { name: "Order iFlow", code: "ORD" };
    var apps = active(cfg.applications);
    var s = apps[0] || { name: "S/4HANA EU", code: "S4EU" }, t = apps[1] || { name: "Salesforce", code: "SFDC" };
    var free = {}; (rule.segments || []).forEach(function (sg) { if (sg.source === "free") free[sg.label || "Purpose"] = (sg.values && sg.values[0]) || "Orders"; });
    return { platform: p, component: c, sourceApp: s, targetApp: t, endpoint: { id: (s.endpoints && s.endpoints[0] && s.endpoints[0].id) || "API_SALES_ORDER" },
      partType: (rule.when && rule.when.partType) || "api", direction: "in", pattern: "api-to-process", version: 2, seq: 1, free: free };
  }
  function describeSample(s) { return [s.platform.code || s.platform.name, s.component.code || s.component.name, (s.sourceApp.code || "") + "→" + (s.targetApp.code || ""), s.partType, "v" + s.version].join(" · "); }

  /* ---------- staged retire / remove wizard (R-7, Pattern Bench C-2 standalone) ----------
     opts: { title, target:{ text }, deps: () => [{ text, kind }], blocked: () => [{ text, fix, act:{label, run} }],
             onConfirm({ by, date, why }) → void, dark } */
  function openWizard(opts) {
    ensureCss();
    var step = 1, deps = [], blocked = [];
    var root = h("div", { class: "ls-modal" + (opts.dark ? " ls-dark" : ""), "data-ls": "wizard" }), box = h("div", { class: "ls-box ls-wiz" });
    root.appendChild(box);
    var steps = h("div", { class: "ls-steps" }), body = h("div", { class: "ls-wbody" }), foot = h("div", { class: "ls-foot" });
    box.appendChild(h("div", { class: "ls-head" }, [h("h2", { text: opts.title }), h("span", { class: "ls-sp" }), h("button", { class: "ls-btn", "data-ls-act": "close", text: "×", onclick: function () { close(); } })]));
    box.appendChild(steps); box.appendChild(body); box.appendChild(foot);
    var form = { by: "", date: new Date().toISOString().slice(0, 10), why: "" };
    function close() { root.remove(); if (opts.onClose) opts.onClose(); }
    function recheck() { deps = opts.deps ? opts.deps() : []; blocked = opts.blocked ? opts.blocked() : []; }
    function render() {
      steps.innerHTML = "";
      ["1 Input", "2 Dependencies", "3 Blocked points", "4 Confirm"].forEach(function (t, i) {
        steps.appendChild(h("div", { class: "ls-step" + (i + 1 === step ? " on" : i + 1 < step ? " done" : ""), text: t }));
      });
      body.innerHTML = ""; foot.innerHTML = "";
      var next = function (lab, en, fn, a) { return h("button", { class: "ls-btn pri", disabled: !en, "data-ls-act": a || "next", text: lab, onclick: fn }); };
      var back = step > 1 ? h("button", { class: "ls-btn", "data-ls-act": "back", text: "Back", onclick: function () { step--; render(); } }) : null;
      if (step === 1) {
        body.appendChild(h("p", { text: "Target:" })); body.appendChild(h("div", { class: "ls-item", "data-ls": "target", text: opts.target.text }));
        if (opts.target.note) body.appendChild(h("p", { class: "ls-note", text: opts.target.note }));
        foot.appendChild(h("span", { class: "ls-sp" })); foot.appendChild(next("Check dependencies", true, function () { recheck(); step = 2; render(); }));
      } else if (step === 2) {
        body.appendChild(h("p", { class: "ls-note", text: deps.length + " dependenc" + (deps.length === 1 ? "y" : "ies") + " (direct neighbours)." }));
        if (opts.map) { var m = opts.map(); if (m) { var mw = h("div", { html: m }); body.appendChild(mw); } }
        deps.forEach(function (d) { body.appendChild(h("div", { class: "ls-item", "data-ls": "dep" }, [h("b", { text: d.kind ? d.kind + ": " : "" }), d.text])); });
        if (!deps.length) body.appendChild(h("div", { class: "ls-ok", text: "Nothing else depends on it." }));
        foot.appendChild(back); foot.appendChild(h("span", { class: "ls-sp" })); foot.appendChild(next("Blocked points", true, function () { step = 3; render(); }));
      } else if (step === 3) {
        if (!blocked.length) body.appendChild(h("div", { class: "ls-ok", "data-ls": "no-blocks", text: "✔ No blocked points — you can confirm." }));
        else body.appendChild(h("p", { class: "ls-note", text: blocked.length + " blocked point" + (blocked.length === 1 ? "" : "s") + " must be cleared first. You can leave this wizard, fix them and run it again." }));
        blocked.forEach(function (b) {
          body.appendChild(h("div", { class: "ls-item block", "data-ls": "blocked" }, [h("div", { text: "⛔ " + b.text }), b.fix ? h("div", { class: "fix", text: "What to do: " + b.fix }) : null,
            b.act ? h("button", { class: "ls-btn sm", style: "margin-top:4px", "data-ls-act": "fix", text: b.act.label, onclick: function () { b.act.run(); recheck(); render(); } }) : null]));
        });
        foot.appendChild(back); foot.appendChild(h("button", { class: "ls-btn", "data-ls-act": "recheck", text: "Re-check", onclick: function () { recheck(); render(); } }));
        foot.appendChild(h("span", { class: "ls-sp" })); foot.appendChild(next("Confirm…", !blocked.length, function () { recheck(); if (!blocked.length) { step = 4; } render(); }, "to-confirm"));
      } else {
        var g = h("div", { class: "ls-grid", style: "grid-template-columns:1fr 1fr" });
        var mk = function (lab, key, type) {
          var i = h(type === "area" ? "textarea" : "input", { type: type === "date" ? "date" : "text", "data-f": key, style: type === "area" ? "width:100%;min-height:70px;box-sizing:border-box;font:inherit;border:1px solid #d0d5dd;border-radius:6px;padding:4px 6px" : "" });
          i.value = form[key]; i.addEventListener("input", function () { form[key] = i.value; ok.disabled = !valid(); });
          return h("div", { class: "ls-f", style: type === "area" ? "grid-column:1/-1" : "" }, [h("label", { text: lab + " *" }), i]);
        };
        g.appendChild(mk(opts.byLabel || "Retired by", "by")); g.appendChild(mk("Effective date", "date", "date")); g.appendChild(mk("Explanation", "why", "area"));
        body.appendChild(h("p", { class: "ls-note", text: "Required. A future date plans the retirement — it takes effect on that date." }));
        body.appendChild(g);
        var valid = function () { return form.by.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.date) && form.why.trim(); };
        var ok = next(opts.confirmLabel || "Confirm", valid(), function () { recheck(); if (blocked.length) { step = 3; render(); return; } opts.onConfirm({ by: form.by.trim(), date: form.date, why: form.why.trim() }); close(); }, "confirm");
        foot.appendChild(back); foot.appendChild(h("span", { class: "ls-sp" })); foot.appendChild(ok);
      }
    }
    render();
    document.body.appendChild(root);
    return { root: root, close: close };
  }

  window.__shared = {
    SCHEMA: SCHEMA, SCHEMA_VERSION: SCHEMA_VERSION, ENTITY_IDS: ENTITY_IDS, PART_TYPES: PART_TYPES, CAPABILITIES: CAPABILITIES,
    seed: seed, normalize: normalize, validate: validate, clone: clone, slug: slug, label: label, find: find, active: active, capable: capable,
    matchRule: matchRule, derive: derive, ruleRegex: ruleRegex, checkName: checkName, duplicates: duplicates,
    diff: diff, applyImport: applyImport, bump: bump, renames: renames, download: download, saveFile: saveFile,
    openSettings: openSettings, openWizard: openWizard, h: h
  };
})();
/* === END SHARED landscape helpers === */
