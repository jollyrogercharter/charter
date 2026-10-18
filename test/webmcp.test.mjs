import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { validateInput } from "../lib/capabilities/input.mjs";
import { MAX_MANIFEST_BYTES, runTool, toolCatalog, TOOLS } from "../lib/capabilities/tools.mjs";
import { buildBundle } from "../lib/capabilities/bundle.mjs";
import { sha256Hex } from "../lib/jrc/check.mjs";
import { summarize } from "../lib/qm/expenses.mjs";

const SITE = "_site";
const read = (p) => readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));
const bundle = JSON.parse(read(path.join(SITE, "webmcp/data.json")));
const ctx = { loadBundle: async () => bundle, sha256: async (t) => sha256Hex(t) };
const tool = (name) => TOOLS.find((t) => t.name === name);
const run = (name, input = {}) => runTool(tool(name), input, ctx);
const fixture = (n) => json(`test/fixtures/jrc/${n}/jrc.json`);
const OUTPUT_BUDGET = 2200;

// ---------- Discovery and schemas (real code) ----------

test("catalog: names, descriptions and annotations follow the spec and Chrome guidance", () => {
  const cat = toolCatalog();
  assert.deepEqual(cat.tools.map((t) => t.name).sort(), ["assess_jrc_manifest", "generate_adoption_plan", "get_charter", "get_open_challenges", "get_project_costs", "get_project_status", "get_provenance"]);
  for (const t of cat.tools) {
    assert.match(t.name, /^[A-Za-z0-9_.-]{1,30}$/, "spec name charset; Chrome suggests at most 30 chars");
    assert.ok(t.description.length > 0 && t.description.length <= 500, `${t.name} description length`);
    for (const [p, s] of Object.entries(t.inputSchema.properties ?? {})) assert.ok((s.description ?? "").length <= 150, `${t.name}.${p} description`);
    assert.equal(t.annotations.readOnlyHint, true, `${t.name} is read-only`);
    assert.equal(t.annotations.consequentialHint, false);
    assert.equal(t.annotations.untrustedContentHint, ["assess_jrc_manifest", "generate_adoption_plan"].includes(t.name), `${t.name} untrusted hint`);
  }
  assert.deepEqual(json(path.join(SITE, "api/v1/tools.json")), JSON.parse(JSON.stringify(cat)), "published catalog matches the code");
});

test("schemas compile under strict Ajv and agree with the input validator", () => {
  const ajv = new Ajv2020({ strict: true });
  const bad = { get_charter: [{ pillar: "nope" }, { extra: 1 }], get_project_status: [{ state: "done" }, { id: "Bad Id!" }, { area: "x".repeat(41) }], get_project_costs: [{ category: "misc" }], get_open_challenges: [{ step: "../x" }], get_provenance: [{ path: "x".repeat(201) }], assess_jrc_manifest: [{}, { manifest: "a string" }, { manifest: [] }], generate_adoption_plan: [{}, { manifest: 5 }] };
  for (const t of TOOLS) {
    const v = ajv.compile(t.inputSchema);
    for (const input of bad[t.name]) {
      assert.equal(v(input), false, `${t.name} schema rejects ${JSON.stringify(input)}`);
      assert.ok(validateInput(t.inputSchema, input).length > 0, `${t.name} validator rejects ${JSON.stringify(input)}`);
    }
    assert.ok(v(t.inputSchema.required ? { manifest: fixture("valid") } : {}), `${t.name} accepts minimal input`);
  }
});

// ---------- Execution against real repository data ----------

test("every tool runs on the published data, stays within budget and labels its basis", async () => {
  for (const t of TOOLS) {
    const r = await run(t.name, t.inputSchema.required ? { manifest: json("jrc.json") } : {});
    assert.equal(r.ok, true, `${t.name}: ${JSON.stringify(r.error)}`);
    assert.ok(JSON.stringify(r).length <= OUTPUT_BUDGET, `${t.name} output ${JSON.stringify(r).length} chars`);
    assert.match(JSON.stringify(r), /"basis/, `${t.name} labels basis`);
    assert.doesNotMatch(JSON.stringify(r), /\bcertified\b/i, `${t.name} never says certified`);
  }
});

test("filters, not-found and invalid input return structured errors", async () => {
  assert.equal((await run("get_charter", { pillar: "data" })).pillars[0].key, "data");
  assert.equal((await run("get_project_status", { id: "opentimestamps" })).item.id, "opentimestamps");
  assert.equal((await run("get_project_status", { id: "no-such-item" })).error.code, "NOT_FOUND");
  assert.equal((await run("get_project_costs", { category: "forecast" })).entries[0].basis, "estimate");
  assert.equal((await run("get_open_challenges", { step: "clean-build" })).step.id, "clean-build");
  assert.equal((await run("get_provenance", { path: "MANIFESTO.md" })).file.sha256, bundle.provenance.files.find((f) => f.path === "MANIFESTO.md").sha256);
  assert.equal((await run("get_provenance", { path: "nope.md" })).error.code, "NOT_FOUND");
  assert.equal((await run("get_charter", { pillar: "nope" })).error.code, "INVALID_INPUT");
  assert.equal((await runTool(tool("get_charter"), null, ctx)).ok, true, "missing input is treated as {}");
  const big = { ...fixture("valid"), limitations: ["x".repeat(MAX_MANIFEST_BYTES)] };
  assert.equal((await run("assess_jrc_manifest", { manifest: big })).error.code, "INPUT_TOO_LARGE");
});

test("assess_jrc_manifest agrees with the jrc CLI on the same manifests", async () => {
  for (const [name, file] of [["charter", "jrc.json"], ["valid", "test/fixtures/jrc/valid/jrc.json"], ["partial", "test/fixtures/jrc/partial/jrc.json"], ["misleading", "test/fixtures/jrc/misleading/jrc.json"]]) {
    const cli = JSON.parse(spawnSync(process.execPath, ["bin/jrc.mjs", "report", "--format", "json", file], { encoding: "utf8" }).stdout);
    const web = await run("assess_jrc_manifest", { manifest: json(file) });
    assert.equal(web.ok, true, name);
    for (const k of ["valid", "applicable_pillars", "evidenced_pillars", "partial_pillars", "exploring_pillars", "independently_reproduced_pillars", "basis"]) {
      assert.equal(web.summary[k], cli.summary[k], `${name}: summary.${k}`);
    }
    for (const [k, p] of Object.entries(cli.pillars)) assert.equal(web.pillars[k].level, p.level, `${name}: ${k} level`);
    assert.deepEqual([...new Set(web.findings.filter((f) => f.severity === "error").map((f) => f.code))].sort(), [...new Set(cli.findings.filter((f) => f.severity === "error").map((f) => f.code))].sort(), `${name}: error codes`);
  }
  const v = await run("assess_jrc_manifest", { manifest: fixture("valid") });
  assert.equal(v.summary.evidenced_with_local_files, 0, "the page never claims to have checked files");
  assert.notEqual(v.pillars.code_rights.basis, "verified", "hash-pinned files aren't 'verified' when they can't be read");
});

test("generate_adoption_plan is deterministic and grounded in the assessment", async () => {
  const a = await run("generate_adoption_plan", { manifest: fixture("partial") });
  const b = await run("generate_adoption_plan", { manifest: fixture("partial") });
  assert.deepEqual(a, b);
  assert.ok(a.steps.length >= 3 && a.steps.length <= 12);
  assert.ok(a.steps.some((s) => s.pillar === "code_rights" && /Decide/.test(s.action)), "exploring pillar gets a decision step");
  assert.ok(a.steps.some((s) => /Jolly Roger Challenge/.test(s.action)));
  const broken = await run("generate_adoption_plan", { manifest: { jrc: "0.1" } });
  assert.equal(broken.steps[0].priority, "high");
  assert.match(broken.steps[0].action, /schema/);
});

test("costs, provenance and status tools match the published sources", async () => {
  const c = await run("get_project_costs");
  assert.equal(c.statement, summarize(json("launch/costs.json")).statement);
  assert.ok(c.entries.filter((e) => e.amount === null).every((e) => e.basis === "missing"), "unknown is missing, never zero");
  const p = await run("get_provenance");
  const m = json("provenance/launch-manifest.json");
  assert.equal(p.timestamp.state, m.timestamp_state);
  assert.equal(p.timestamp.basis, m.timestamp_state === "verified" ? "verified" : "missing", "a pending proof is never labelled verified");
  const pending = buildBundle({ charterMd: read("CHARTER.md"), openDependenciesMd: read("OPEN-DEPENDENCIES.md"), status: json("launch/status.json"), ledger: json("launch/costs.json"), provenance: { ...m, timestamp_state: "pending", bitcoin_attestation_time_utc: null, bitcoin_attestation: undefined }, siteUrl: "https://x.test", repoUrl: "https://x.test/r" });
  const pp = await runTool(tool("get_provenance"), {}, { ...ctx, loadBundle: async () => pending });
  assert.equal(pp.timestamp.basis, "missing");
  assert.equal(pp.timestamp.attested_no_later_than_utc, undefined);
  const s = await run("get_project_status");
  const st = json("launch/status.json");
  assert.equal(Object.values(s.counts).reduce((x, y) => x + y, 0), st.items.length);
  for (const f of ["charter", "status", "costs", "challenges", "provenance"]) {
    const name = { charter: "get_charter", status: "get_project_status", costs: "get_project_costs", challenges: "get_open_challenges", provenance: "get_provenance" }[f];
    assert.deepEqual(json(path.join(SITE, `api/v1/${f}.json`)), await run(name), `static API ${f} equals the tool`);
  }
});

// ---------- SIMULATED browser: spec-modelled document.modelContext (not a real browser) ----------

class FakeModelContext {
  constructor({ deny = false } = {}) { this.tools = new Map(); this.deny = deny; }
  async registerTool(tool, options = {}) {
    if (this.deny) throw new DOMException("tools permission not allowed", "NotAllowedError");
    if (options.signal?.aborted) throw options.signal.reason;
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name ?? "")) throw new DOMException("invalid name", "InvalidStateError");
    if (!tool.description) throw new DOMException("empty description", "InvalidStateError");
    if (this.tools.has(tool.name)) throw new DOMException("duplicate", "InvalidStateError");
    const schema = JSON.stringify(tool.inputSchema ?? {});
    if (schema === undefined) throw new TypeError("schema not serializable");
    this.tools.set(tool.name, { ...tool, inputSchema: schema });
    options.signal?.addEventListener("abort", () => this.tools.delete(tool.name), { once: true });
  }
  async getTools() { return [...this.tools.values()].map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })); }
  async executeTool(t, input, { signal } = {}) {
    const tool = this.tools.get(typeof t === "string" ? t : t.name);
    if (!tool) throw new DOMException("not found", "NotFoundError");
    if (input !== undefined && (input === null || typeof input !== "object")) throw new DOMException("input must be an object", "DataError");
    const execSignal = signal ?? new AbortController().signal;
    let value;
    try { value = await tool.execute(input ?? {}, { signal: execSignal }); }
    catch (e) { if (e?.name === "AbortError") throw e; throw new DOMException(String(e?.message ?? e), "OperationError"); }
    return JSON.stringify(value);
  }
}

// Loads the *built* webmcp.js with its imports pointed at the *served* module copies in _site/js.
async function loadBrowserModule() {
  globalThis.__JRC_WEBMCP_NO_AUTO_INIT__ = true;
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts?.credentials, "omit", "data fetch sends no credentials");
    assert.equal(url, "/webmcp/data.json", "only same-origin static data is fetched");
    return { ok: true, status: 200, json: async () => JSON.parse(read(path.join(SITE, "webmcp/data.json"))) };
  };
  const src = read(path.join(SITE, "assets/webmcp.js")).replace('"/js/lib/capabilities/tools.mjs"', JSON.stringify(pathToFileURL(path.resolve(SITE, "js/lib/capabilities/tools.mjs")).href));
  const tmp = path.resolve(SITE, `assets/.webmcp-test-${process.pid}.mjs`);
  writeFileSync(tmp, src);
  return import(pathToFileURL(tmp).href);
}
const fakeDoc = (modelContext) => ({ documentElement: { dataset: {} }, ...(modelContext ? { modelContext } : {}) });

test("[simulated] unsupported browsers: no modelContext means a silent no-op", async () => {
  const mod = await loadBrowserModule();
  const doc = fakeDoc();
  assert.deepEqual(await mod.init(doc), { supported: false });
  assert.equal(doc.documentElement.dataset.webmcp, "unsupported");
  const odd = fakeDoc({ registerTool: "not a function" });
  assert.equal((await mod.init(odd)).supported, false);
});

test("[simulated] registers all tools; executeTool returns the same results as the Node path", async () => {
  const mod = await loadBrowserModule();
  const mc = new FakeModelContext();
  const doc = fakeDoc(mc);
  const out = await mod.init(doc);
  assert.equal(doc.documentElement.dataset.webmcp, "registered");
  assert.equal(out.registered.length, 7);
  const listed = await mc.getTools();
  for (const t of listed) assert.doesNotThrow(() => JSON.parse(t.inputSchema), `${t.name} schema serializes`);
  for (const t of TOOLS) {
    const input = t.inputSchema.required ? { manifest: json("jrc.json") } : {};
    const viaBrowser = JSON.parse(await mc.executeTool({ name: t.name }, input));
    assert.deepEqual(viaBrowser, JSON.parse(JSON.stringify(await run(t.name, input))), `${t.name}: browser path equals Node path`);
  }
  const legacy = await mc.tools.get("get_charter").execute(JSON.stringify({ pillar: "data" }), { signal: new AbortController().signal });
  assert.equal(legacy.pillars[0].key, "data", "legacy JSON-string input still works");
  const bad = JSON.parse(await mc.executeTool({ name: "get_project_costs" }, { category: "misc" }));
  assert.equal(bad.error.code, "INVALID_INPUT");
  await assert.rejects(mc.executeTool({ name: "get_charter" }, "nope"), { name: "DataError" });
});

test("[simulated] registration failures are isolated and reported", async () => {
  const mod = await loadBrowserModule();
  const denied = fakeDoc(new FakeModelContext({ deny: true }));
  const d = await mod.init(denied);
  assert.equal(d.registered.length, 0);
  assert.equal(d.failed[0].error, "NotAllowedError");
  assert.equal(denied.documentElement.dataset.webmcp, "failed");
  const mc = new FakeModelContext();
  await mc.registerTool({ name: "get_charter", description: "someone else's tool", execute: async () => ({}) });
  const partialDoc = fakeDoc(mc);
  const p = await mod.init(partialDoc);
  assert.equal(p.registered.length, 6);
  assert.deepEqual(p.failed.map((f) => [f.name, f.error]), [["get_charter", "InvalidStateError"]]);
  assert.equal(partialDoc.documentElement.dataset.webmcp, "partial");
});

test("[simulated] cancellation: aborting unregisters tools and aborts executions", async () => {
  const mod = await loadBrowserModule();
  const mc = new FakeModelContext();
  const outer = new AbortController();
  const out = await mod.registerJrcTools(mc, { signal: outer.signal });
  assert.equal((await mc.getTools()).length, 7);
  out.controllers.get("get_provenance").abort();
  assert.equal((await mc.getTools()).length, 6, "per-tool controller unregisters one tool");
  outer.abort();
  assert.equal((await mc.getTools()).length, 0, "outer signal unregisters the rest");

  const mc2 = new FakeModelContext();
  await mod.registerJrcTools(mc2);
  const exec = new AbortController();
  exec.abort();
  await assert.rejects(mc2.executeTool({ name: "get_charter" }, {}, { signal: exec.signal }), { name: "AbortError" });
  const already = new AbortController();
  already.abort();
  await assert.rejects(mc2.registerTool({ name: "x", description: "y", execute: async () => 1 }, { signal: already.signal }));
});

// ---------- Pages ----------

test("every page loads the WebMCP module from this origin, and nothing third-party", () => {
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
  for (const f of walk(SITE).filter((x) => x.endsWith(".html"))) {
    const html = read(f);
    assert.match(html, /<script type="module" src="\/assets\/webmcp\.js"><\/script>/, f);
    for (const [, src] of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) assert.ok(src.startsWith("/"), `${f}: third-party script ${src}`);
    assert.doesNotMatch(html, /document\.cookie|localStorage|sendBeacon|google-analytics|gtag\(/, `${f}: no tracking`);
  }
  for (const f of walk(path.join(SITE, "js"))) assert.doesNotMatch(read(f), /from "node:/, `${f} must not import Node built-ins`);
});
