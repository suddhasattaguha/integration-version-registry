/* === SHARED landscape helpers 1.0 — same code in registry-app.html and pattern-bench.html (source: tools/landscape-shared.js) ===
   Contract: landscape.json schema 1.0 (claude/landscape-config-schema-1.0.md). Reads 0.1 (migrated on load).
   Built-in defaults (W-17) · Terms = 10 fixed entity types + attribute types (W-4 / W-5) · scoped naming rules
   for scenario (name + id), component (per component type) and artifact (temporary id, per artifact type ×
   platform × subtype) (W-6 / W-8) · platform subtypes · settings diff / import (C-3) · staged retire wizard
   (R-7 / C-2) · Settings editor UI · application colours (W-11). Exposed as window.__shared. */
(function () {
  "use strict";
  var SCHEMA = "landscape-config", SCHEMA_VERSION = "1.0";
  var ENTITY_IDS = ["scenario", "platform", "component", "artifact", "application", "dataObject", "endpoint", "caller", "version", "export"];
  /* id → [label, plural, definition, aliases, takes effect in] */
  var ENTITY_DEFAULTS = {
    scenario: ["Scenario", "Scenarios", "An end-to-end integration flow between a source and a target application, managing one data object. Named by the scenario naming rule; gets a readable id (SCN-0042) from the registry.", ["interface", "flow"],
      "Both apps: menus, dialogs, banners, print, registry lists, scenario naming rule"],
    platform: ["Platform", "Platforms", "A predefined integration platform or broker (BTP IS, AIS, Solace …). Its kind (iPaaS / message broker / API management) is the component type.", ["broker", "iPaaS"],
      "Both apps: platform pick-list, container labels, capability filter, naming segment {platform.code}"],
    component: ["Component", "Components", "A named unit on one platform holding several artifacts (one block on the canvas). Identified and named in design by the component naming rule. Not versioned.", ["asset", "integration component", "package"],
      "Both apps: container labels, library, component naming rule, registry Components list"],
    artifact: ["Artifact", "Artifacts", "A typed step inside a component: API, process, topic, queue, file or scheduler. Versioned (platform/component#type@vN). Its name is a temporary identifier from the artifact naming rule.", ["part", "symbol", "step"],
      "Both apps: symbols, versions, artifact naming rule (id tag), registry Artifacts list"],
    application: ["Application", "Applications", "A predefined application at the ends of a flow — source (caller / sender) or target (receiver). Shown as \"Connected applications\" in the registry.", ["connected system", "connected application", "end application", "system"],
      "Both apps: end-application boxes, caller boxes, source / target cards, naming segments {sourceApp.code} {targetApp.code}"],
    dataObject: ["Data object", "Data objects", "The business object / message type the scenario exchanges end to end (e.g. Sales Order). Exactly one per scenario, mandatory, not versioned (yet).", ["business object", "message type", "BO", "data object type"],
      "Both apps: scenario dialog, banner, print, registry scenario page + list + filter, naming segment {dataObject.code}"],
    endpoint: ["Endpoint", "Endpoints", "The API or folder of an application that a flow uses. A reference, not named by a rule.", ["API", "folder"],
      "Both apps: end-application API / folder, ref of an end-application artifact"],
    caller: ["Caller", "Callers", "The application that calls an exposed API (= an application at the source side).", ["consumer"],
      "Both apps: caller boxes, decisions of callers"],
    version: ["Version", "Versions", "A version of an artifact (v1, v2 …); at most two live at a time; retire n−1 before n+1.", ["release"],
      "Both apps: version labels, lifecycle, retire wizard"],
    export: ["Export", "Exports", "One hand-over from Pattern Bench to the registry — counted, not a version.", ["hand-over"],
      "Both apps: export dialog, registry exports panel"]
  };
  var PART_TYPES = ["api", "process", "topic", "queue", "file", "scheduler"], ARTIFACT_TYPES = PART_TYPES;
  var CAPABILITIES = ["api", "process", "topic", "queue", "file", "scheduler"];
  var KINDS = [["ipaas", "iPaaS"], ["broker", "Message broker"], ["apim", "API management"], ["file", "File transfer"]];
  var TYPE_CODE = { api: "API", process: "PROC", topic: "TOP", queue: "Q", file: "FILE", scheduler: "SCH" };
  var KIND_CODE = { ipaas: "INT", broker: "EVT", apim: "API", file: "FT" };
  var SEGMENT_SOURCES = [
    ["platform.code", "Platform code"], ["platform.name", "Platform name"], ["component.code", "Component code"], ["component.name", "Component name"],
    ["componentType", "Component type (platform kind)"], ["dataObject.code", "Data object code"], ["dataObject.name", "Data object name"],
    ["sourceApp.code", "Source application code"], ["targetApp.code", "Target application code"], ["endpoint.id", "Endpoint"],
    ["artifactType", "Artifact type"], ["subtype.code", "Subtype code"], ["subtype.name", "Subtype name"], ["direction", "Direction (in / out)"],
    ["pattern", "Base pattern"], ["version", "Version"], ["seq", "Running number"], ["attr", "Attribute value"], ["free", "Free text"], ["literal", "Fixed text"]
  ];
  var SECTIONS = [
    ["terms", "Terms"], ["namingRules", "Naming rules"], ["platforms", "Platforms & capabilities"],
    ["applications", "Applications"], ["changeLog", "Change log"]
  ];
  /* naming cards (W-6 / W-8): only these get rules */
  var RULE_SCOPES = [["scenario", "Scenario — name"], ["scenario-id", "Scenario — id"], ["component", "Component"], ["artifact", "Artifact (temporary identifier)"]];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function slug(t) { return String(t == null ? "" : t).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function nowIso() { return new Date().toISOString(); }
  /* a short code from a name: "Sales Order" → SO, "Delivery" → DELI, "S/4HANA P01" → S4HANAP0 */
  function codeOf(name, max) {
    var s = String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    if (!s) return "";
    var words = s.split(/[\s\-_/().]+/).filter(Boolean);
    if (words.length > 1 && words.every(function (w) { return /^[A-Za-z]/.test(w); })) return words.map(function (w) { return w[0]; }).join("").toUpperCase().slice(0, max || 8);
    return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, max || 8);
  }
  function dataObjectOf(x) {
    if (!x) return null;
    if (typeof x === "string") { var n = x.trim(); return n ? { name: n, code: codeOf(n) } : null; }
    var name = String(x.name || "").trim(); if (!name) return null;
    return { name: name, code: String(x.code || "").trim() || codeOf(name) };
  }
  /* identity of a learned data object: "Sales Order" = "salesorder" = "SALES_ORDER" */
  function dataObjectKey(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  /* ---------- W-17 built-in defaults (used whenever no landscape.json is loaded) ---------- */
  var seg = function (source, extra) { return Object.assign({ source: source }, extra || {}); };
  var D_ = function (d) { return { delimiter: d }; };
  var TYPE_MAP = { api: "API", process: "PROC", topic: "TOP", queue: "Q", file: "FILE", scheduler: "SCH" };
  function defaultRules() {
    return [
      { id: "SCN-NAME", scope: { entityType: "scenario" }, mode: "derive", segments: [seg("dataObject.code"), D_("_"), seg("sourceApp.code"), D_("-"), seg("targetApp.code")],
        transforms: ["upper", "noSpaces"], maxLength: 80, override: "allow", level: "warn", origin: "default" },
      { id: "SCN-ID", scope: { entityType: "scenario-id" }, mode: "derive", segments: [seg("literal", { text: "SCN" }), D_("-"), seg("seq", { format: "{n:0000}" })],
        transforms: ["upper"], override: "block", level: "block", origin: "default" },
      { id: "CMP-IPAAS", scope: { entityType: "component", componentType: "ipaas" }, mode: "derive", segments: [seg("platform.code"), D_("_"), seg("dataObject.code"), D_("_"), seg("literal", { text: "INT" })],
        transforms: ["upper", "noSpaces"], maxLength: 40, override: "allow", level: "warn", origin: "default" },
      { id: "CMP-BROKER", scope: { entityType: "component", componentType: "broker" }, mode: "derive", segments: [seg("platform.code"), D_("_"), seg("dataObject.code"), D_("_"), seg("literal", { text: "EVT" })],
        transforms: ["upper", "noSpaces"], maxLength: 40, override: "allow", level: "warn", origin: "default" },
      { id: "CMP-APIM", scope: { entityType: "component", componentType: "apim" }, mode: "derive", segments: [seg("platform.code"), D_("_"), seg("dataObject.code"), D_("_"), seg("literal", { text: "API" })],
        transforms: ["upper", "noSpaces"], maxLength: 40, override: "allow", level: "warn", origin: "default" },
      { id: "CMP-DEFAULT", scope: { entityType: "component" }, mode: "derive", segments: [seg("platform.code"), D_("_"), seg("dataObject.code"), D_("_"), seg("componentType", { map: { ipaas: "INT", broker: "EVT", apim: "API", file: "FT" } })],
        transforms: ["upper", "noSpaces"], maxLength: 40, override: "allow", level: "warn", origin: "default" },
      { id: "ART-DEFAULT", scope: { entityType: "artifact" }, mode: "derive", segments: [seg("component.code"), D_("_"), seg("artifactType", { map: clone(TYPE_MAP) }), D_("_"), seg("subtype.code", { optional: true }), D_("_"), seg("version", { format: "v{n}", optional: true })],
        transforms: ["upper", "noSpaces"], maxLength: 60, override: "allow", level: "warn", origin: "default" }
    ];
  }
  function defaultPlatforms() {
    var st = function (id, name, code) { return { id: id, name: name, code: code }; };
    return [
      { id: "btp-is", name: "BTP IS", code: "BTPIS", kind: "ipaas", capabilities: ["api", "process", "queue", "file", "scheduler"], aliases: ["SAP BTP Integration Suite", "BTP-IS", "btpis", "Cloud Integration"],
        subtypes: { process: [st("iflow", "iFlow", "IFL")], queue: [st("jms", "JMS queue", "JMS")] } },
      { id: "ais", name: "AIS", code: "AIS", kind: "ipaas", capabilities: ["api", "process", "queue", "file", "scheduler"], aliases: ["Azure Integration Services", "Azure Logic Apps", "Azure Functions", "Azure"],
        subtypes: { process: [st("logic-app", "Logic App", "LA"), st("function-app", "Function App", "FA")], queue: [st("service-bus", "Service Bus", "SB")], api: [st("apim", "API Management", "APIM")] } },
      { id: "solace", name: "Solace", code: "SOL", kind: "broker", capabilities: ["topic", "queue"], aliases: ["Solace PubSub+", "Event Broker"], subtypes: {} },
      { id: "sap-apim", name: "SAP APIM", code: "APIM", kind: "apim", capabilities: ["api"], aliases: ["SAP API Management", "API Management"], subtypes: {} },
      { id: "sftp", name: "SFTP", code: "SFTP", kind: "file", capabilities: ["file"], aliases: ["File server"], subtypes: {} }
    ];
  }
  function defaults() {
    return {
      schema: SCHEMA, schemaVersion: SCHEMA_VERSION, landscapeVersion: 0, name: "Built-in defaults", updated: "", origin: "builtin",
      entityTypes: ENTITY_IDS.map(function (id) { var d = ENTITY_DEFAULTS[id]; return { id: id, label: d[0], plural: d[1], definition: d[2], aliases: d[3].slice() }; }),
      attributeTypes: [], namingRules: defaultRules(), platforms: defaultPlatforms(), applications: [], changeLog: []
    };
  }
  function seed() { return normalize(defaults()); }

  /* ---------- 0.1 → 1.0 migration + fill gaps (unknown fields are kept) ----------
     part → artifact (entity id, rule target, segment source partType → artifactType), glossary → entity definitions,
     rules target/when → scope, components[] = learned only (kept but no longer a pick-list) */
  var MISSING_FROM_DEFAULTS = ["namingRules", "platforms", "attributeTypes"];
  function normalize(c) {
    c = c && typeof c === "object" ? c : {};
    var old = String(c.schemaVersion || "").split(".")[0] === "0";
    c.schema = SCHEMA;
    var notes = [];
    // a section that is missing altogether takes the built-in default (W-17); present (even empty) = as given
    MISSING_FROM_DEFAULTS.forEach(function (k) { if (!Array.isArray(c[k])) { c[k] = k === "attributeTypes" ? [] : clone(k === "platforms" ? defaultPlatforms() : defaultRules()); if (k !== "attributeTypes") c.defaultsUsed = (c.defaultsUsed || []).concat([k]); } });
    ["applications", "changeLog", "components"].forEach(function (k) { if (!Array.isArray(c[k])) c[k] = []; });
    c.landscapeVersion = Number(c.landscapeVersion) || 0;
    c.name = c.name || "Default landscape";
    var et = Array.isArray(c.entityTypes) ? c.entityTypes : [];
    var gl = Array.isArray(c.glossary) ? c.glossary : [];
    var glFor = function (id) {
      var words = { scenario: ["scenario"], component: ["integration component", "component"], artifact: ["part", "artifact"], application: ["connected system / application", "application"],
        endpoint: ["endpoint"], caller: ["caller"], "export": ["export"], version: ["version"], platform: ["platform"] }[id] || [id];
      return gl.find(function (g) { return g && words.indexOf(String(g.term || "").toLowerCase()) >= 0; });
    };
    c.entityTypes = ENTITY_IDS.map(function (id) {
      var e = et.find(function (x) { return x && (x.id === id || (id === "artifact" && x.id === "part")); }) || {};
      var d = ENTITY_DEFAULTS[id], g = glFor(id);
      var lab = e.label, plu = e.plural;
      if (id === "artifact" && e.id === "part" && lab === "Part") { lab = d[0]; plu = d[1]; }       // the old default label moves to the new default
      var aliases = Array.isArray(e.aliases) ? e.aliases.slice() : d[3].slice();
      if (id === "artifact" && aliases.indexOf("part") < 0) aliases.push("part");
      return { id: id, label: lab || d[0], plural: plu || d[1], definition: e.definition || d[2], aliases: aliases };
    });
    if (gl.length) {
      var used = gl.filter(function (g) { return ENTITY_IDS.some(function (id) { return glFor(id) === g; }); });
      var dropped = gl.filter(function (g) { return used.indexOf(g) < 0; }).map(function (g) { return g.term; });
      notes.push("glossary removed (W-5): definitions now on the Terms rows" + (dropped.length ? "; dropped terms: " + dropped.join(", ") : ""));
      delete c.glossary;
    }
    c.attributeTypes.forEach(function (a) { a.id = a.id || slug(a.name); a.appliesTo = a.appliesTo || []; a.valueKind = a.valueKind || "text"; a.values = a.values || []; a.required = !!a.required; a.status = a.status || "active"; a.aliases = a.aliases || []; });
    c.platforms.forEach(function (p) {
      p.id = p.id || slug(p.name); p.aliases = p.aliases || []; p.capabilities = (p.capabilities || []).map(function (x) { return typeof x === "string" ? x : x.type; }).filter(Boolean);
      p.kind = p.kind || "ipaas"; p.subtypes = p.subtypes && typeof p.subtypes === "object" ? p.subtypes : {};
      Object.keys(p.subtypes).forEach(function (t) { p.subtypes[t] = (p.subtypes[t] || []).map(function (s) { return { id: s.id || slug(s.name), name: s.name || s.id, code: s.code || codeOf(s.name || s.id) }; }); });
    });
    c.components.forEach(function (x) { x.id = x.id || (x.platform + "/" + slug(x.name)); x.aliases = x.aliases || []; x.learned = true; });
    c.applications.forEach(function (a) { a.id = a.id || slug(a.name); a.aliases = a.aliases || []; a.endpoints = a.endpoints || []; a.code = a.code || codeOf(a.name); });
    c.namingRules.forEach(function (r, i) {
      r.id = r.id || "N-" + (i + 1); r.segments = r.segments || []; r.transforms = r.transforms || [];
      if (!r.scope) {     // 0.1 rule → scoped rule
        var w = r.when || {}, t = r.target === "part" ? "artifact" : (r.target || "artifact");
        r.scope = { entityType: t };
        if (w.partType) r.scope.artifactType = w.partType;
        if (w.platformKind) r.scope.componentType = w.platformKind;
        if (w.platform) r.scope.platform = w.platform;
        if (w.direction) r.scope.direction = w.direction;
        if (w.pattern) r.scope.pattern = w.pattern;
      }
      if (r.scope.entityType === "part") r.scope.entityType = "artifact";
      delete r.target; delete r.when;
      r.segments.forEach(function (s) { if (s.source === "partType") s.source = "artifactType"; });
      r.mode = r.mode || "derive"; r.override = r.override || "warn"; r.level = r.level || "warn";
    });
    if (old) { notes.unshift("migrated from landscape schema " + c.schemaVersion + " to " + SCHEMA_VERSION + " (part → artifact, scoped naming rules)"); c.migratedFrom = c.schemaVersion; }
    c.schemaVersion = SCHEMA_VERSION;
    if (notes.length) c.changeLog.push({ at: nowIso(), action: "migrate", item: "settings", note: notes.join(" · "), landscapeVersion: c.landscapeVersion });
    return c;
  }
  function validate(c) {
    if (!c || typeof c !== "object") return "Not a JSON object.";
    if (c.schema !== SCHEMA) return "Not a landscape config (schema must be \"" + SCHEMA + "\").";
    var major = String(c.schemaVersion || "").split(".")[0];
    if (major !== "0" && major !== "1") return "Unsupported landscape schema version " + c.schemaVersion + ".";
    return null;
  }

  /* ---------- C-3 entity labels ---------- */
  function entityId(id) { return id === "part" ? "artifact" : id === "dataobject" ? "dataObject" : id; }
  function label(cfg, id, plural) {
    id = entityId(id);
    var e = cfg && cfg.entityTypes && cfg.entityTypes.find(function (x) { return x.id === id; });
    var d = ENTITY_DEFAULTS[id] || [id, id + "s"];
    return plural ? ((e && e.plural) || d[1]) : ((e && e.label) || d[0]);
  }
  function definition(cfg, id) {
    id = entityId(id);
    var e = cfg && cfg.entityTypes && cfg.entityTypes.find(function (x) { return x.id === id; });
    return (e && e.definition) || (ENTITY_DEFAULTS[id] || [])[2] || "";
  }
  function takesEffect(id) { return (ENTITY_DEFAULTS[entityId(id)] || [])[4] || ""; }
  /* W-16: the registry band / list heading — "Connected applications" follows the Application plural */
  function connectedLabel(cfg) { return "Connected " + label(cfg, "application", true).toLowerCase(); }
  function subtypesOf(cfg, platformId, type) {
    var p = find(cfg, "platform", platformId);
    return p && p.subtypes && p.subtypes[type] ? p.subtypes[type] : [];
  }
  function subtypeFind(cfg, platformId, type, key) {
    if (!key) return null;
    var k = String(key).toLowerCase();
    return subtypesOf(cfg, platformId, type).find(function (s) { return s.id === key || String(s.name).toLowerCase() === k || String(s.code).toLowerCase() === k; }) || null;
  }
  /* attribute types that apply to an entity type */
  function attributesFor(cfg, entity) { return active((cfg && cfg.attributeTypes) || []).filter(function (a) { return (a.appliesTo || []).indexOf(entityId(entity)) >= 0; }); }
  /* missing required attribute values: [{ attr, label }] */
  function missingAttributes(cfg, entity, values) {
    values = values || {};
    return attributesFor(cfg, entity).filter(function (a) { return a.required && !String(values[a.id] == null ? "" : values[a.id]).trim(); });
  }

  /* ---------- W-11 colours: calm application hues; red / amber only for states ---------- */
  var COLORS = {
    source: { light: { fg: "#334e68", bg: "#eef4fb", border: "#9fb3c8" }, dark: { fg: "#bcccdc", bg: "#1f2b3a", border: "#486581" } },
    target: { light: { fg: "#4c3a8a", bg: "#f3f0fc", border: "#b4a7e3" }, dark: { fg: "#d6ccf5", bg: "#2a2342", border: "#6c5ab8" } },
    dataObject: { light: { fg: "#0b5f5c", bg: "#e7f6f5", border: "#7cc4c0" }, dark: { fg: "#a6e3df", bg: "#163634", border: "#2f8f8a" } }
  };
  function colorCss(prefix) {
    prefix = prefix || "";
    var out = "";
    ["source", "target", "dataObject"].forEach(function (k) {
      var l = COLORS[k].light, d = COLORS[k].dark, n = k === "dataObject" ? "do" : k.slice(0, 3);
      out += ":root{--app-" + n + "-fg:" + l.fg + ";--app-" + n + "-bg:" + l.bg + ";--app-" + n + "-bd:" + l.border + "}";
      out += "body.dark,html.dark body,.dark{--app-" + n + "-fg:" + d.fg + ";--app-" + n + "-bg:" + d.bg + ";--app-" + n + "-bd:" + d.border + "}";
    });
    return out;
  }

  /* ---------- lookups with aliases ---------- */
  var LISTS = { platform: "platforms", component: "components", application: "applications", attribute: "attributeTypes" };
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

  /* ---------- C-4 / W-6 scoped naming rules ----------
     resolution order: platform + subtype → platform + artifact type → subtype → artifact type default → entity-type default
     (score = how specific the scope is; ties: list order). target: scenario | scenario-id | component | artifact (part = artifact) */
  var SCOPE_WEIGHT = { platform: 8, subtype: 4, artifactType: 2, componentType: 2, direction: 1, pattern: 1 };
  var LEVEL_TEXT = function (s) {
    if (s.platform && s.subtype) return "platform + subtype";
    if (s.platform && (s.artifactType || s.componentType)) return "platform + " + (s.artifactType ? "artifact type" : "component type");
    if (s.platform) return "platform";
    if (s.subtype) return "subtype";
    if (s.artifactType) return "artifact type default";
    if (s.componentType) return "component type";
    return "entity-type default";
  };
  function scopeOk(s, ctx) {
    var pid = ctx.platform && (ctx.platform.id || slug(ctx.platform.name));
    var at = ctx.artifactType || ctx.partType;
    var st = ctx.subtype && (ctx.subtype.id || ctx.subtype);
    var kind = ctx.componentType || (ctx.platform && ctx.platform.kind);
    if (s.platform && s.platform !== pid) return false;
    if (s.artifactType && s.artifactType !== at) return false;
    if (s.subtype && s.subtype !== st) return false;
    if (s.componentType && s.componentType !== kind) return false;
    if (s.direction && s.direction !== ctx.direction) return false;
    if (s.pattern && s.pattern !== ctx.pattern) return false;
    return true;
  }
  function matchRule(cfg, target, ctx) {
    ctx = ctx || {};
    target = target === "part" ? "artifact" : target;
    var rules = (cfg && cfg.namingRules) || [], best = null, bestScore = -1;
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.status === "retired") continue;
      var s = r.scope || { entityType: r.target === "part" ? "artifact" : r.target };
      if (s.entityType !== target || !scopeOk(s, ctx)) continue;
      var score = 0; Object.keys(SCOPE_WEIGHT).forEach(function (k) { if (s[k]) score += SCOPE_WEIGHT[k]; });
      if (score > bestScore) { best = r; bestScore = score; }
    }
    return best;
  }
  function ruleLevel(rule) { return rule ? LEVEL_TEXT(rule.scope || {}) : "built-in fallback"; }
  /* scenario id from the scenario-id rule: SCN-0042 (seq = next free number) */
  function scenarioId(cfg, usedIds) {
    var r = matchRule(cfg, "scenario-id", {}) || defaultRules()[1];
    var used = new Set((usedIds || []).map(function (x) { return String(x).toUpperCase(); })), n = 1, id;
    do { id = derive(r, { seq: n++ }).name; } while (used.has(id.toUpperCase()) && n < 100000);
    return id;
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
      case "component.code": v = pick(ctx.component, "code") || String(pick(ctx.component, "name")).replace(/[^A-Za-z0-9_]/g, ""); break;
      case "component.name": v = pick(ctx.component, "name"); break;
      case "sourceApp.code": v = pick(ctx.sourceApp, "code") || codeOf(pick(ctx.sourceApp, "name")); break;
      case "targetApp.code": v = pick(ctx.targetApp, "code") || codeOf(pick(ctx.targetApp, "name")); break;
      case "endpoint.id": v = pick(ctx.endpoint, "id") || pick(ctx.endpoint, "name"); break;
      case "componentType": v = ctx.componentType || pick(ctx.platform, "kind"); break;
      case "dataObject.code": v = pick(ctx.dataObject, "code") || codeOf(pick(ctx.dataObject, "name")); break;
      case "dataObject.name": v = pick(ctx.dataObject, "name"); break;
      case "subtype.code": v = pick(ctx.subtype, "code"); break;
      case "subtype.name": v = pick(ctx.subtype, "name"); break;
      case "attr": { var av = ctx.attrs && seg.attr ? ctx.attrs[seg.attr] : ""; v = av == null ? "" : String(av); break; }
      case "artifactType": case "partType": v = ctx.artifactType || ctx.partType || ""; break;
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
  var DIFF_SECTIONS = ["entityTypes", "attributeTypes", "namingRules", "platforms", "applications"];
  var DIFF_TITLES = { entityTypes: "Terms — entities", attributeTypes: "Terms — attributes", namingRules: "Naming rules", platforms: "Platforms & capabilities", applications: "Applications" };
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
    ["platforms", "applications"].forEach(function (sec) {
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
    ".ls-card-h{display:flex;align-items:center;justify-content:space-between;margin:10px 0 4px;font-size:12px;color:#344054}.ls-card-h:first-child{margin-top:0}" +
    ".ls-terms th small{display:block;font-weight:400;color:#98a2b3;font-size:10.5px}.ls-terms td.k{white-space:nowrap;color:#475467}.ls-terms td.eff{font-size:11.5px;color:#475467;min-width:180px}" +
    ".ls-nolive{display:inline-block;margin-top:2px;font-size:10.5px;color:#667085;background:#f2f4f7;border-radius:999px;padding:0 6px}" +
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
    var cfg = clone(orig), dirty = false, sec = opts.section === "entityTypes" || opts.section === "glossary" ? "terms" : (opts.section || "terms"), ro = !!opts.readOnly, ruleSel = 0, segSel = -1, ruleCard = "artifact";
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
        list.appendChild(h("h4", { text: DIFF_TITLES[s.section] || s.section }));
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
        var t = s[0] === "platforms" ? L("platform", true) + " & capabilities" : s[0] === "applications" ? L("application", true) : s[1];
        nav.appendChild(h("button", { class: sec === s[0] ? "on" : "", "data-sec": s[0], text: t, onclick: function () { sec = s[0]; segSel = -1; render(); } }));
      });
      nav.appendChild(h("div", { class: "ls-note", style: "margin:12px 6px 4px", "data-ls": "origin", text: cfg.origin === "builtin" ? "Using the built-in defaults (W-17) — no landscape.json loaded." : "Configured landscape" + (cfg.defaultsUsed && cfg.defaultsUsed.length ? " · defaults for: " + cfg.defaultsUsed.join(", ") : "") + "." }));
      if (!ro) nav.appendChild(h("button", { class: "ls-btn sm", style: "margin:4px 6px", "data-ls-act": "reset-section", text: "Reset this section to default", onclick: function () {
        var d = defaults();
        if (sec === "terms") { cfg.entityTypes = d.entityTypes; }
        else if (sec === "namingRules") { cfg.namingRules = d.namingRules; ruleSel = 0; }
        else if (sec === "platforms") cfg.platforms = d.platforms;
        else return;
        setDirty(); render(); } }));
      body.innerHTML = "";
      ({ terms: renderTerms, namingRules: renderRules, platforms: renderPlatforms, applications: renderApps, changeLog: renderLog })[sec]();
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
    /* W-5 Terms: 10 fixed entity rows + attribute rows; every column says where it takes effect */
    function renderTerms() {
      body.appendChild(h("h3", { text: "Terms" }));
      body.appendChild(h("p", { class: "ls-note", text: "One place for every word. Entity rows are fixed (ids used in code / JSON); only their names change. Attribute rows are your own extra fields (W-4)." }));
      var t = h("table", { class: "ls-tbl ls-terms", "data-ls": "terms" }, [
        h("tr", {}, [h("th", { text: "Kind" }), h("th", {}, ["Name", h("small", { text: "↳ all labels" })]), h("th", {}, ["Plural", h("small", { text: "↳ lists, counts" })]),
          h("th", {}, ["Definition", h("small", { text: "↳ hover tooltips, print legend" })]), h("th", {}, ["Aliases", h("small", { text: "↳ search, old files" })]),
          h("th", { text: "Takes effect in" }), h("th", { text: "Action" })])]);
      cfg.entityTypes.forEach(function (e) {
        t.appendChild(h("tr", { "data-id": e.id, "data-kind": "entity" }, [h("td", { class: "k", text: "🔒 Entity" }),
          h("td", {}, [inp(e.label, function (v) { e.label = v; prev(); }, { "data-f": "label" })]), h("td", {}, [inp(e.plural, function (v) { e.plural = v; }, { "data-f": "plural" })]),
          h("td", {}, [inp(e.definition, function (v) { e.definition = v; }, { "data-f": "definition" })]), h("td", {}, [inp((e.aliases || []).join(", "), function (v) { e.aliases = listOf(v); }, { "data-f": "aliases" })]),
          h("td", { class: "eff", text: takesEffect(e.id) }), h("td", { text: "—" })]));
      });
      (cfg.attributeTypes || []).forEach(function (a) {
        var eff = "Fields on: " + ((a.appliesTo || []).map(function (x) { return label(cfg, x).toLowerCase(); }).join(", ") || "—") + " · naming {attr." + a.id + "} · registry filters" + (a.required ? " · required (blocks Export for registry)" : "");
        t.appendChild(h("tr", { "data-id": a.id, "data-kind": "attribute", class: a.status === "retired" ? "retired" : "" }, [h("td", { class: "k", text: "Attribute" }),
          h("td", {}, [inp(a.name, function (v) { a.name = v; }, { "data-f": "attr-name" })]), h("td", { text: "—" }),
          h("td", {}, [inp(a.definition, function (v) { a.definition = v; })]), h("td", {}, [inp((a.aliases || []).join(", "), function (v) { a.aliases = listOf(v); })]),
          h("td", { class: "eff" }, [eff, ro ? null : h("button", { class: "ls-btn sm", style: "margin-left:6px", "data-ls-act": "edit-attr", text: "Edit…", onclick: function () { attrDrawer(a); } })]),
          h("td", {}, [retireBtn("attribute", a, cfg.attributeTypes)])]));
      });
      body.appendChild(t);
      var pv = h("div", { class: "ls-note", "data-ls": "terms-preview" }); body.appendChild(pv);
      function prev() { pv.textContent = "Preview: “Open in Pattern Bench → Opened from Registry · " + label(cfg, "scenario") + " SCN-0042 · " + label(cfg, "dataObject") + " Sales Order · 3 " + label(cfg, "artifact", true).toLowerCase() + "”"; }
      prev();
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", "data-ls-act": "add-attr", text: "＋ Add attribute", onclick: function () {
        var a = { id: "attr-" + Date.now().toString(36), name: "", definition: "", appliesTo: ["scenario"], valueKind: "text", values: [], required: false, status: "active", aliases: [] };
        cfg.attributeTypes.push(a); setDirty(); render(); attrDrawer(a); } }));
    }
    function attrDrawer(a) {
      var ov = h("div", { class: "ls-modal", "data-ls": "attr-drawer" }), b = h("div", { class: "ls-box ls-wiz" }); ov.appendChild(b);
      var bodyD = h("div", { class: "ls-wbody" });
      var fld = function (lab, el) { return h("div", { class: "ls-f", style: "margin-bottom:8px" }, [h("label", { text: lab }), el]); };
      var nm = h("input", { type: "text", value: a.name || "", "data-f": "a-name" }), code = h("input", { type: "text", value: a.id || "", "data-f": "a-id" });
      bodyD.appendChild(fld("Name", nm)); bodyD.appendChild(fld("Id (naming segment {attr.id})", code));
      var ap = h("div", { class: "ls-chk" });
      ENTITY_IDS.filter(function (x) { return ["scenario", "component", "artifact", "application"].indexOf(x) >= 0; }).forEach(function (x) {
        var cb = h("input", { type: "checkbox", checked: (a.appliesTo || []).indexOf(x) >= 0, "data-applies": x }); ap.appendChild(h("label", {}, [cb, label(cfg, x)])); });
      bodyD.appendChild(fld("Applies to", ap));
      var vk = h("select", { "data-f": "a-kind" }); [["text", "free text"], ["list", "pick-list"]].forEach(function (o) { var op = h("option", { value: o[0], text: o[1] }); if (a.valueKind === o[0]) op.selected = true; vk.appendChild(op); });
      bodyD.appendChild(fld("Value kind", vk));
      var vals = h("input", { type: "text", value: (a.values || []).map(function (v) { return typeof v === "string" ? v : v.name + (v.code ? "=" + v.code : ""); }).join(", "), "data-f": "a-values", placeholder: "EU=EU, US=US, APAC" });
      bodyD.appendChild(fld("Allowed values (pick-list; value=code, …)", vals));
      var req = h("input", { type: "checkbox", checked: !!a.required, "data-f": "a-required" });
      bodyD.appendChild(h("div", { class: "ls-chk" }, [h("label", {}, [req, "required — blocks Export for registry and the Inbox when empty"])]));
      b.appendChild(h("div", { class: "ls-head" }, [h("h2", { text: "Attribute" }), h("span", { class: "ls-sp" })]));
      b.appendChild(bodyD);
      b.appendChild(h("div", { class: "ls-foot" }, [h("button", { class: "ls-btn", text: "Cancel", onclick: function () { ov.remove(); } }), h("span", { class: "ls-sp" }),
        h("button", { class: "ls-btn pri", "data-ls-act": "attr-ok", text: "OK", onclick: function () {
          a.name = nm.value.trim(); a.id = slug(code.value || a.name) || a.id;
          a.appliesTo = [].slice.call(ap.querySelectorAll("input")).filter(function (i) { return i.checked; }).map(function (i) { return i.dataset.applies; });
          a.valueKind = vk.value; a.required = req.checked;
          a.values = listOf(vals.value).map(function (p) { var i = p.indexOf("="); return i > 0 ? { name: p.slice(0, i).trim(), code: p.slice(i + 1).trim() } : { name: p, code: codeOf(p) }; });
          ov.remove(); setDirty(); render(); } })]));
      root.appendChild(ov);
    }
    function renderPlatforms() {
      body.appendChild(h("h3", { text: L("platform", true) + " & capabilities" }));
      body.appendChild(h("p", { class: "ls-note", text: "Capabilities = artifact types the " + L("platform").toLowerCase() + " may host; Pattern Bench greys out the rest. Kind = component type. Subtypes refine a capability per platform (information only, e.g. process: iFlow=IFL; Logic App=LA). Code = short form used by naming rules." }));
      var t = h("table", { class: "ls-tbl", "data-ls": "platforms" }, [h("tr", {}, [h("th", { text: "Name" }), h("th", { text: "Code" }), h("th", { text: "Kind" }), h("th", { text: "Capabilities" }), h("th", { text: "Subtypes" }), h("th", { text: "Aliases" }), h("th", {})])]);
      cfg.platforms.forEach(function (p) {
        var caps = h("td", { class: "ls-caps" });
        CAPABILITIES.forEach(function (c) {
          var cb = h("input", { type: "checkbox", checked: p.capabilities.indexOf(c) >= 0, disabled: ro, "data-cap": c });
          cb.addEventListener("change", function () { p.capabilities = CAPABILITIES.filter(function (x) { return x === c ? cb.checked : p.capabilities.indexOf(x) >= 0; }); setDirty(); });
          caps.appendChild(h("label", {}, [cb, c]));
        });
        var stText = Object.keys(p.subtypes || {}).filter(function (k) { return (p.subtypes[k] || []).length; }).map(function (k) { return k + ": " + p.subtypes[k].map(function (s) { return s.name + "=" + s.code; }).join("; "); }).join(" | ");
        var noLive = opts.liveComponents ? !opts.liveComponents(p.id) : false;
        t.appendChild(h("tr", { class: p.status === "retired" ? "retired" : "", "data-id": p.id }, [h("td", {}, [inp(p.name, function (v) { p.name = v; }, { "data-f": "name" }), noLive ? h("small", { class: "ls-nolive", "data-ls": "no-live", text: "no live " + L("component", true).toLowerCase() }) : null]),
          h("td", { style: "width:70px" }, [inp(p.code, function (v) { p.code = v; }, { "data-f": "code" })]),
          h("td", { style: "width:120px" }, [sel(p.kind, KINDS, function (v) { p.kind = v; }, { "data-f": "kind" })]), caps,
          h("td", { style: "min-width:170px" }, [inp(stText, function (v) {
            var o = {}; String(v || "").split("|").forEach(function (grp) { var i = grp.indexOf(":"); if (i < 0) return; var ty = grp.slice(0, i).trim(); if (CAPABILITIES.indexOf(ty) < 0) return;
              o[ty] = grp.slice(i + 1).split(";").map(function (x) { x = x.trim(); if (!x) return null; var j = x.indexOf("="); var n = j > 0 ? x.slice(0, j).trim() : x; return { id: slug(n), name: n, code: j > 0 ? x.slice(j + 1).trim() : codeOf(n) }; }).filter(Boolean); });
            p.subtypes = o; }, { "data-f": "subtypes", placeholder: "process: iFlow=IFL" })]),
          h("td", {}, [inp((p.aliases || []).join(", "), function (v) { p.aliases = listOf(v); })]), h("td", {}, [retireBtn("platform", p, cfg.platforms)])]));
      });
      body.appendChild(t);
      if (!ro) body.appendChild(h("button", { class: "ls-btn", style: "margin-top:8px", "data-ls-act": "add-platform", text: "＋ Add " + L("platform").toLowerCase(), onclick: function () {
        cfg.platforms.push({ id: "platform-" + Date.now().toString(36), name: "", code: "", kind: "ipaas", capabilities: ["api", "process"], aliases: [], subtypes: {} }); setDirty(); render(); } }));
      body.appendChild(h("p", { class: "ls-note", style: "margin-top:12px", text: L("component", true) + " are not listed here any more (W-8): they are identified and named in design by the " + L("component").toLowerCase() + " naming rule; the registry learns them from exports." }));
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
      body.appendChild(h("p", { class: "ls-note", text: "Only " + L("scenario").toLowerCase() + " (name + id), " + L("component").toLowerCase() + " (per component type) and " + L("artifact").toLowerCase() + " (temporary identifier) are named (W-8). Resolution: platform + subtype → platform + artifact type → subtype → artifact type default → entity-type default → built-in fallback. Takes effect in: export dialog, derived names in Pattern Bench, registry naming check, Inbox." }));
      var wrap = h("div", { class: "ls-rules" }), lst = h("div", { class: "ls-rlist", "data-ls": "rules" }), bld = h("div", { class: "ls-build" });
      wrap.appendChild(lst); wrap.appendChild(bld); body.appendChild(wrap);
      if (!cfg.namingRules[ruleSel]) ruleSel = 0;
      RULE_SCOPES.forEach(function (sc) {
        var mine = cfg.namingRules.map(function (r, i) { return [r, i]; }).filter(function (x) { return (x[0].scope || {}).entityType === sc[0]; });
        var head = sc[0] === "scenario" ? label(cfg, "scenario") + " — name" : sc[0] === "scenario-id" ? label(cfg, "scenario") + " — id" : sc[0] === "component" ? label(cfg, "component") : label(cfg, "artifact") + " (temporary identifier)";
        lst.appendChild(h("div", { class: "ls-card-h", "data-card": sc[0] }, [h("b", { text: head }), ro ? null : h("button", { class: "ls-btn sm", "data-ls-act": "add-rule", "data-card": sc[0], text: "＋", title: "Add a rule to this card", onclick: function () { addRule(sc[0]); } })]));
        if (!mine.length) lst.appendChild(h("div", { class: "ls-note", style: "margin:0 0 6px 6px", text: "no rule — built-in fallback" }));
        mine.forEach(function (x) {
          var r = x[0], i = x[1], s = r.scope || {};
          var sub = [s.componentType && (KINDS.find(function (k) { return k[0] === s.componentType; }) || [0, s.componentType])[1], s.artifactType, s.platform && ((find(cfg, "platform", s.platform) || {}).name || s.platform), s.subtype].filter(Boolean).join(" · ") || "default";
          lst.appendChild(h("div", { class: "ls-rule" + (i === ruleSel ? " on" : ""), "data-rule": r.id, onclick: function () { ruleSel = i; segSel = -1; render(); } },
            [h("span", { class: "t" }, [h("b", { text: r.id }), h("small", { text: sub + " · " + r.mode + (r.status === "retired" ? " · retired" : "") })])]));
        });
      });
      function addRule(card) {
        var n = 1; while (cfg.namingRules.some(function (x) { return x.id === "N-" + n; })) n++;
        var segs = card === "scenario" ? [{ source: "dataObject.code" }, { delimiter: "_" }, { source: "sourceApp.code" }, { delimiter: "-" }, { source: "targetApp.code" }]
          : card === "scenario-id" ? [{ source: "literal", text: "SCN" }, { delimiter: "-" }, { source: "seq", format: "{n:0000}" }]
          : card === "component" ? [{ source: "platform.code" }, { delimiter: "_" }, { source: "dataObject.code" }]
          : [{ source: "component.code" }, { delimiter: "_" }, { source: "artifactType", map: clone(TYPE_MAP) }];
        cfg.namingRules.push({ id: "N-" + n, scope: { entityType: card }, mode: "derive", segments: segs, transforms: ["upper", "noSpaces"], maxLength: 60, override: "warn", level: "warn" });
        ruleSel = cfg.namingRules.length - 1; segSel = -1; setDirty(); render();
      }
      var r = cfg.namingRules[ruleSel];
      if (!r) { bld.appendChild(h("p", { class: "ls-note", text: "No rule yet. Without a rule, names fall back to “<" + L("component").toLowerCase() + "> <type>”." })); return; }
      r.scope = r.scope || { entityType: "artifact" };
      var g = h("div", { class: "ls-grid" });
      var fld = function (lab, el) { return h("div", { class: "ls-f" }, [h("label", { text: lab }), el]); };
      var et = r.scope.entityType;
      var platOpts = [["", "any"]].concat(cfg.platforms.map(function (p) { return [p.id, p.name || p.id]; }));
      g.appendChild(fld("Rule id", inp(r.id, function (v) { r.id = v; }, { "data-f": "rule-id" })));
      g.appendChild(fld("Card", sel(et, RULE_SCOPES, function (v) { r.scope = { entityType: v }; }, { "data-f": "scope-entity", rerender: true })));
      if (et === "component") g.appendChild(fld("Component type", sel(r.scope.componentType || "", [["", "any"]].concat(KINDS), function (v) { if (v) r.scope.componentType = v; else delete r.scope.componentType; }, { "data-f": "scope-ctype", rerender: true })));
      if (et === "artifact") {
        g.appendChild(fld(L("artifact") + " type", sel(r.scope.artifactType || "", [["", "any (default)"]].concat(PART_TYPES.map(function (t) { return [t, t]; })), function (v) { if (v) r.scope.artifactType = v; else delete r.scope.artifactType; delete r.scope.subtype; }, { "data-f": "scope-atype", rerender: true })));
      }
      if (et === "artifact" || et === "component") g.appendChild(fld(L("platform"), sel(r.scope.platform || "", platOpts, function (v) { if (v) r.scope.platform = v; else delete r.scope.platform; delete r.scope.subtype; }, { "data-f": "scope-platform", rerender: true })));
      if (et === "artifact" && r.scope.artifactType) {
        var subs = r.scope.platform ? subtypesOf(cfg, r.scope.platform, r.scope.artifactType) : [].concat.apply([], cfg.platforms.map(function (p) { return (p.subtypes && p.subtypes[r.scope.artifactType]) || []; }));
        if (subs.length) g.appendChild(fld("Subtype", sel(r.scope.subtype || "", [["", "any"]].concat(subs.map(function (s) { return [s.id, s.name]; })), function (v) { if (v) r.scope.subtype = v; else delete r.scope.subtype; }, { "data-f": "scope-subtype", rerender: true })));
      }
      g.appendChild(fld("Mode", sel(r.mode, [["derive", "derive (build the name)"], ["check", "check only"]], function (v) { r.mode = v; })));
      g.appendChild(fld("Override", sel(r.override, [["allow", "allow"], ["warn", "warn"], ["block", "block (locked)"]], function (v) { r.override = v; }, { "data-f": "override" })));
      g.appendChild(fld("Breach level", sel(r.level, [["warn", "warn"], ["block", "block"]], function (v) { r.level = v; }, { "data-f": "level" })));
      bld.appendChild(g);
      bld.appendChild(h("div", { class: "ls-note", "data-ls": "rule-level", text: "Matches at level: " + ruleLevel(r) }));
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
          if (s.source === "artifactType") s.map = clone(TYPE_MAP);
          if (s.source === "attr") s.attr = ((cfg.attributeTypes || [])[0] || {}).id || "";
          if (s.source === "version") { s.format = "v{n}"; s.optional = true; } if (s.source === "literal") s.text = "X";
          var last = r.segments[r.segments.length - 1];
          if (last && last.delimiter === undefined && dIn.value) r.segments.push({ delimiter: dIn.value });   // keep placeholders apart
          r.segments.push(s); segSel = r.segments.length - 1; setDirty(); render(); } }),
          dIn, h("button", { class: "ls-btn sm", "data-ls-act": "add-delim", text: "＋ delimiter", onclick: function () { r.segments.push({ delimiter: dIn.value }); setDirty(); render(); } }),
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
          if (s.source === "attr") gg.appendChild(fld("Attribute", sel(s.attr || "", [["", "—"]].concat((cfg.attributeTypes || []).map(function (a) { return [a.id, a.name || a.id]; })), function (v) { s.attr = v; })));
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
    var sc = (rule && rule.scope) || {};
    var p = (sc.platform && find(cfg, "platform", sc.platform)) || active(cfg.platforms).find(function (x) { return !sc.componentType || x.kind === sc.componentType; }) || { id: "btp-is", name: "BTP IS", code: "BTPIS", kind: "ipaas" };
    var apps = active(cfg.applications);
    var s = apps[0] || { name: "S/4HANA P01", code: "S4P01" }, t = apps[1] || { name: "Webshop", code: "WEBSHOP" };
    var free = {}; (rule.segments || []).forEach(function (sg) { if (sg.source === "free") free[sg.label || "Purpose"] = (sg.values && sg.values[0]) || "Orders"; });
    var attrs = {}; (cfg.attributeTypes || []).forEach(function (a) { var v = (a.values || [])[0]; attrs[a.id] = v ? (v.code || v.name || v) : "EU"; });
    var at = sc.artifactType || "process";
    var st = sc.subtype ? subtypeFind(cfg, p.id, at, sc.subtype) : (subtypesOf(cfg, p.id, at)[0] || null);
    var dobj = { name: "Sales Order", code: "SO" };
    var comp = { name: (p.code || "BTPIS") + "_SO_" + (KIND_CODE[p.kind] || "INT") };
    return { platform: p, component: comp, componentType: p.kind, sourceApp: s, targetApp: t, dataObject: dobj, subtype: st, attrs: attrs,
      endpoint: { id: (s.endpoints && s.endpoints[0] && s.endpoints[0].id) || "API_SALES_ORDER" },
      artifactType: at, partType: at, direction: "in", pattern: "api-to-process", version: 2, seq: 42, free: free };
  }
  function describeSample(s) { return [s.platform.code || s.platform.name, s.component.name, s.dataObject.name, (s.sourceApp.code || "") + "→" + (s.targetApp.code || ""), s.artifactType + (s.subtype ? " (" + s.subtype.name + ")" : ""), "v" + s.version].join(" · "); }

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
    SCHEMA: SCHEMA, SCHEMA_VERSION: SCHEMA_VERSION, ENTITY_IDS: ENTITY_IDS, PART_TYPES: PART_TYPES, ARTIFACT_TYPES: ARTIFACT_TYPES, CAPABILITIES: CAPABILITIES, KINDS: KINDS, TYPE_CODE: TYPE_CODE,
    defaults: defaults, codeOf: codeOf, dataObjectOf: dataObjectOf, dataObjectKey: dataObjectKey, definition: definition, takesEffect: takesEffect, connectedLabel: connectedLabel,
    subtypesOf: subtypesOf, subtypeFind: subtypeFind, attributesFor: attributesFor, missingAttributes: missingAttributes, ruleLevel: ruleLevel, scenarioId: scenarioId,
    COLORS: COLORS, colorCss: colorCss, entityId: entityId,
    seed: seed, normalize: normalize, validate: validate, clone: clone, slug: slug, label: label, find: find, active: active, capable: capable,
    matchRule: matchRule, derive: derive, ruleRegex: ruleRegex, checkName: checkName, duplicates: duplicates,
    diff: diff, applyImport: applyImport, bump: bump, renames: renames, download: download, saveFile: saveFile,
    openSettings: openSettings, openWizard: openWizard, h: h
  };
})();
/* === END SHARED landscape helpers === */
