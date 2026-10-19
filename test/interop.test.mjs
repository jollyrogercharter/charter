import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { Lexicons } from "@atproto/lexicon";
import { validateRecord } from "../lib/atproto/records.mjs";
import { capabilityManifest } from "../lib/capabilities/manifest.mjs";
import { loadNodeBundle } from "../lib/capabilities/node-bundle.mjs";
import { nodeContext } from "../lib/capabilities/node-runtime.mjs";
import { SKILLS, INTERESTS } from "../lib/capabilities/tools-extended.mjs";
import { runTool, TOOLS } from "../lib/capabilities/tools.mjs";
import { createServer, mcpTools } from "../bin/jrc-mcp.mjs";
import { sha256Hex } from "../lib/jrc/check.mjs";

const SITE = "_site";
const read = (p) => readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));
const bundle = loadNodeBundle();
const noNetwork = async () => { throw new Error("network access is not allowed in this test"); };
const ctx = { ...nodeContext({ fetch: noNetwork }), loadBundle: async () => bundle };
const run = (name, input = {}) => runTool(TOOLS.find((t) => t.name === name), input, ctx);
const cfg = (name, items, currency = "USD") => ({ name, currency, items });
const item = (id, unit_cost, period = "monthly", quantity = 1) => ({ id, unit_cost, quantity, period, assumption: `assumed ${id}` });
const strip = ({ data_commit, ...r }) => r;

// ---------- Community ----------

test("community: registry is parsed from the project's own documents", async () => {
  const r = await run("list_debates");
  assert.equal(r.ok, true);
  assert.equal(r.by_kind.rfc.length, 6);
  assert.equal(r.by_kind.debate.length, 3);
  assert.ok(r.by_kind["open-decision"].length >= 10);
  assert.equal(r.posted, 0, "nothing is claimed as posted");
  const d = await run("get_debate", { id: "rfc-2", part: "against" });
  assert.ok(d.against.length > 40 && !/not stated/.test(d.against), "the strongest objection is returned");
  assert.equal((await run("get_debate", { id: "rfc-99" })).error.code, "NOT_FOUND");
  assert.equal((await run("list_debates", { query: "attention" })).ok, true);
});

test("community: opportunity matching is deterministic and uses only supplied skills", async () => {
  const cat = json("community/opportunities.json");
  assert.deepEqual(SKILLS, cat.skills, "tool enum matches the catalog");
  assert.deepEqual(INTERESTS, cat.interests);
  for (const o of cat.opportunities) {
    assert.ok(o.skills.every((s) => cat.skills.includes(s)) && o.interests.every((s) => cat.interests.includes(s)), o.id);
    assert.doesNotMatch(o.where, /^\/|:\/\/|\.\.|^\/\//, `${o.id} stays relative to the repository`);
    const local = /^(?:blob|tree)\/main\/([^?#]+)$/.exec(o.where)?.[1];
    if (local) assert.ok(existsSync(local), `${o.id} points at ${local}, which must exist`);
  }
  const bundle = await loadNodeBundle();
  for (const o of bundle.opportunities.opportunities) assert.ok(o.where.startsWith("https://github.com/jollyrogercharter/charter"), `${o.id} resolves into the repo`);
  const a = await run("find_opportunities", { skills: ["legal", "writing"], interests: ["standards"] });
  const b = await run("find_opportunities", { interests: ["standards"], skills: ["writing", "legal"] });
  assert.deepEqual(a.matches, b.matches, "order of inputs doesn't matter");
  assert.equal(a.matches[0].id, "cc0-legal-review");
  assert.equal((await run("find_opportunities", {})).error.code, "INVALID_INPUT");
});

test("community: drafts are never posted, links can't be redirected, private data is refused", async () => {
  const d = await run("draft_community_post", { kind: "criticism", title: "Self-assessments can be theatre", sections: { proposal: "x" }, ai_assisted: true });
  assert.equal(d.ok, true);
  const u = new URL(d.post_link);
  assert.equal(u.origin + u.pathname, "https://github.com/jollyrogercharter/charter/issues/new");
  assert.equal(u.searchParams.get("template"), "what-would-make-this-fail.md");
  assert.match(d.content, /AI assistance/);
  const hostile = await run("draft_community_post", { kind: "rfc", title: "x&template=evil.md#<script>", sections: { proposal: "](javascript:alert(1)) https://evil.example/?a=b&c=d" } });
  const hu = new URL(hostile.post_link);
  assert.equal(hu.host, "github.com");
  assert.equal(hu.searchParams.getAll("template").length, 1, "input can't add query parameters");
  assert.equal(hu.searchParams.get("template"), "charter-rfc.md");
  assert.equal((await run("draft_community_post", { kind: "response", title: "Reply" })).error.code, "INVALID_INPUT");
  assert.equal((await run("draft_community_post", { kind: "rfc", title: "Contact me", sections: { proposal: "mail " + "someone" + "@" + "example.com" } })).error.code, "PRIVATE_DATA");
});

test("community: challenge packages are canonical, self-reported and never independent when affiliated", async () => {
  const base = { project: "Demo", repository: "https://github.com/x/y", commit: "abc1234", attempted_by: "Tester", affiliated: true, steps: [{ id: "clean-build", status: "passed" }, { id: "discover", status: "blocked", notes: "no licence" }] };
  const a = await run("prepare_challenge_submission", base);
  const b = await run("prepare_challenge_submission", { ...base, steps: [...base.steps].reverse() });
  assert.equal(a.package_sha256, b.package_sha256, "step order doesn't change the package");
  const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v));
  assert.equal(a.package_sha256, sha256Hex(canon(a.package_json)), "anyone can recompute the package hash");
  assert.equal(a.summary.independence_claimed, false);
  assert.equal(a.package_json.steps.length, 9, "all nine steps are listed; unreported ones are not-attempted");
  assert.match(a.markdown, /not an independent reproduction/);
});

// ---------- Quartermaster ----------

test("quartermaster: whole-cent arithmetic, unknowns propagate, currencies never mix", async () => {
  const r = await run("compare_infrastructure_costs", { a: cfg("a", [item("x", 0.1, "monthly", 3), item("d", 11.2, "yearly")]), b: cfg("b", [item("y", 0.3)]) });
  assert.equal(r.a.monthly.amount, 1.23, "0.10 x 3 = 0.30 exactly; 11.20/12 rounds to 0.93");
  assert.equal(r.b.monthly.amount, 0.3);
  assert.equal(r.difference_b_minus_a.monthly.amount, -0.93);
  assert.equal(r.cheaper_recurring, "b");
  const u = await run("compare_infrastructure_costs", { a: cfg("a", [item("x", null)]), b: cfg("b", [item("y", 1)]) });
  assert.equal(u.a.monthly, null);
  assert.equal(u.cheaper_recurring, "indeterminate");
  assert.equal(u.difference_b_minus_a.yearly, null, "unknown is never treated as zero");
  assert.equal(u.difference_b_minus_a.monthly, null);
  assert.equal((await run("compare_infrastructure_costs", { a: cfg("a", [item("x", 1)]), b: cfg("b", [item("y", 1)], "EUR") })).error.code, "CURRENCY_MISMATCH");
  assert.equal((await run("compare_infrastructure_costs", { a: cfg("a", [item("x", 1), item("x", 2)]), b: cfg("b", [item("y", 1)]) })).error.code, "INVALID_INPUT");
});

test("quartermaster: yearly costs never drift, and unknowns stay in their own period (found in real Chrome)", async () => {
  const r = await run("compare_infrastructure_costs", { a: cfg("a", [item("domain", 11.2, "yearly")]), b: cfg("b", [item("vps", 5), item("setup", null, "one-time")]) });
  assert.equal(r.a.yearly.amount, 11.2, "a $11.20/yr item is $11.20 a year, not 12 x $0.93");
  assert.equal(r.a.monthly.amount, 0.93);
  assert.equal(r.b.yearly.amount, 60, "an unknown one-time cost doesn't hide a known monthly bill");
  assert.equal(r.b.one_time, null);
  assert.equal(r.difference_b_minus_a.yearly.amount, 48.8);
  assert.equal(r.difference_b_minus_a.one_time, null);
  const s = await run("estimate_savings", { current: cfg("c", [item("d", 11.2, "yearly"), item("vm", 7)]), proposed: cfg("p", [item("d", 11.2, "yearly")]), migration: { one_time_cost: 0, assumption: "none needed" }, horizon_months: 7 });
  assert.equal(s.net_saving_over_horizon.amount, 49, "7 x $7 with no rounding drift");
});

test("quartermaster: savings, break-even and PR drafts follow the assumptions exactly", async () => {
  const model = { current: cfg("current", [item("vm", 20)]), proposed: cfg("proposed", [item("static", 5)]), migration: { one_time_cost: 45, assumption: "3 hours of work at a quoted rate" }, horizon_months: 12 };
  const s = await run("estimate_savings", model);
  assert.equal(s.monthly_saving.amount, 15);
  assert.equal(s.net_saving_over_horizon.amount, 135);
  assert.equal(s.break_even_month, 3);
  assert.equal(s.basis, "estimate");
  const worse = await run("estimate_savings", { ...model, horizon_months: 2 });
  assert.equal(worse.verdict, "costs more over the horizon");
  assert.equal(worse.break_even_month, null);
  const unknown = await run("estimate_savings", { ...model, migration: { one_time_cost: null, assumption: "unknown" } });
  assert.equal(unknown.savings, null);
  const { migration: _, ...unstated } = model;
  assert.equal((await run("estimate_savings", unstated)).error.code, "INVALID_INPUT", "an unstated migration cost is never taken as zero");
  const leak = "someone" + "@" + "example.com";
  for (const extra of [{ title: `Ask ${leak}` }, { title: "Static", risks: [`ping ${leak}`] }, { title: "Static", tests: [`curl -H 'Authorization: Bearer ghp_${"a".repeat(36)}'`] }, { title: "Static", measurement: `mail ${leak}` }]) {
    assert.equal((await run("prepare_cost_reduction_pr", { ...model, ...extra })).error.code, "PRIVATE_DATA", JSON.stringify(extra));
  }
  assert.equal((await run("estimate_savings", { ...model, migration: { one_time_cost: 1, assumption: `quote from ${leak}` } })).error.code, "PRIVATE_DATA");
  const pr = await run("prepare_cost_reduction_pr", { ...model, title: "Move to static hosting", risks: ["build minutes"], tests: ["load test"] });
  for (const h of ["## Proposed saving", "## Cost, before and after", "## Assumptions and risks", "## Tests", "## After merging"]) assert.ok(pr.body.includes(h), h);
  assert.match(pr.note, /No branch, PR or infrastructure change was made/);
  const cli = spawnSync(process.execPath, ["bin/qm.mjs", "savings", "-"], { input: JSON.stringify(model), encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(strip(JSON.parse(cli.stdout)), strip(s), "qm savings equals the tool");
});

test("quartermaster: explain_costs reflects the published ledger without adding categories", async () => {
  const e = await run("explain_costs");
  assert.match(e.principle, /never added together/);
  assert.equal(e.categories["donated-labor"].known_amount, null);
  assert.equal(e.this_project, (await run("get_project_costs")).statement);
});

// ---------- Provenance ----------

test("provenance: local hashes are compared, never uploaded; mismatches and strays are distinguished", async (t) => {
  const m = bundle.provenance;
  let real;
  try { real = sha256Hex(execFileSync("git", ["show", `${m.preservation_commit}:MANIFESTO.md`], { stdio: ["ignore", "pipe", "ignore"] })); }
  catch { return t.skip("preservation commit not available (not a full clone)"); }
  const r = await run("verify_hashes", { items: [{ path: "MANIFESTO.md", sha256: real }, { path: "MANIFESTO.md", sha256: "0".repeat(64) }, { path: "nope.md", sha256: real }, { sha256: real.toUpperCase() }, { path: "nope.md", sha256: "1".repeat(64) }] });
  assert.deepEqual(r.results.map((x) => x.result), ["match", "mismatch", "matches-other-file", "match", "unknown-path"]);
  assert.equal(r.results[3].matches, "MANIFESTO.md");
  const tmp = path.join(tmpdir(), `jrc-verify-${process.pid}.md`);
  execFileSync("sh", ["-c", `git show ${m.preservation_commit}:MANIFESTO.md > ${tmp}`]);
  const cli = JSON.parse(spawnSync(process.execPath, [path.resolve("bin/jrc.mjs"), "provenance", "verify", tmp], { encoding: "utf8" }).stdout);
  assert.equal(cli.results[0].result, "matches-other-file", "a renamed copy is recognised by its bytes");
  assert.equal(cli.results[0].matches, "MANIFESTO.md");
});

test("provenance: timestamp status says who verified and never claims independence", async () => {
  const t = await run("get_timestamp_status");
  assert.equal(t.state, bundle.provenance.timestamp_state === "verified" ? "verified" : bundle.provenance.timestamp_state === "pending" ? "pending" : "absent");
  if (t.state === "verified") {
    assert.match(t.verified_by, /AI agent; no human re-check/);
    assert.equal(t.independently_reverified, false);
  }
  const pending = { ...bundle, provenance: { ...bundle.provenance, timestamp_state: "pending" } };
  const p = await runTool(TOOLS.find((x) => x.name === "get_timestamp_status"), {}, { ...ctx, loadBundle: async () => pending });
  assert.equal(p.state, "pending");
  assert.equal(p.basis, "missing");
  assert.equal(p.verified_by, undefined);
  const lim = await run("explain_evidence_limitations", { evidence: "timestamp" });
  assert.match(lim.limitations.timestamp.join(" "), /not when the ideas originated|nothing about when the ideas/i);
  const files = await run("get_provenance_manifest", { part: "files", limit: 20 });
  assert.equal(files.files.length, 20);
  assert.equal(files.next_offset, 20);
});

// ---------- AT Protocol ----------

// @atproto/lexicon mutates the documents it's given, so it gets copies.
const atproto = () => { const L = new Lexicons(); for (const l of Object.values(bundle.lexicons)) L.add(structuredClone(l)); return L; };

test("atproto: Lexicons load in the reference implementation and example records validate", () => {
  const L = atproto();
  for (const k of ["assessment", "adoption", "contribution"]) {
    const rec = json(path.join(SITE, `api/v1/atproto-example-${k}.json`));
    L.assertValidRecord(`org.jollyrogercharter.${k}`, rec);
    assert.deepEqual(validateRecord(bundle.lexicons, rec.$type, rec), [], `${k}: our validator agrees`);
  }
  const a = json(path.join(SITE, "api/v1/atproto-example-assessment.json"));
  assert.equal(a.independenceVerified, false);
  assert.equal(a.kind, "replayed-snapshot", "built from a committed snapshot, not a live fetch");
  assert.match(a.snapshotSha256, /^[0-9a-f]{64}$/);
});

test("audit regressions: snapshots can't pass as live scans, records refuse private data and unsafe links", async () => {
  const snap = json("docs/demo/main/jrc-snapshot.json");
  const forged = structuredClone(snap);
  forged.source = { ...forged.source, kind: "github", repository: "https://github.com/victim/their-repo", commit: "0123456789abcdef0123456789abcdef01234567" };
  const r = await run("export_atproto_record", { kind: "assessment", snapshot: forged, created_at: "2026-10-19T00:00:00Z" });
  assert.equal(r.ok, true, JSON.stringify(r.error));
  assert.equal(r.record.kind, "replayed-snapshot", "a hand-edited snapshot is never labelled an automated scan");
  assert.match(r.record.snapshotSha256, /^[0-9a-f]{64}$/);
  const leak = "mail me someone" + "@" + "example.com";
  assert.equal((await run("export_atproto_record", { kind: "adoption", adoption: { repository: "https://github.com/x/y", statement: leak, declared_at: "2026-10-19T00:00:00Z" } })).error.code, "PRIVATE_DATA");
  for (const subject of ["javascript:alert(1)", "data:text/html,<script>", "http://insecure.example/x"]) {
    const c = await run("export_atproto_record", { kind: "contribution", contribution: { kind: "rfc", title: "t", subject }, created_at: "2026-10-19T00:00:00Z" });
    assert.equal(c.valid, false, subject);
    const p = await run("prepare_atproto_publication", { record: c.record });
    assert.equal(p.error.code, "INVALID_RECORD", subject);
  }
});

test("atproto: our validator agrees with @atproto/lexicon on invalid records", () => {
  const L = atproto();
  const good = { $type: "org.jollyrogercharter.contribution", kind: "rfc", title: "t", subject: "https://github.com/x/y", createdAt: "2026-10-19T00:00:00Z" };
  const bads = [{ ...good, createdAt: "yesterday" }, { ...good, title: undefined }, { ...good, title: "x".repeat(2001) }, { ...good, subject: "not a uri" }, { ...good, aiAssisted: "yes" }];
  for (const b of bads) {
    const rec = JSON.parse(JSON.stringify(b));
    assert.throws(() => L.assertValidRecord(rec.$type, rec), undefined, JSON.stringify(rec).slice(0, 80));
    assert.ok(validateRecord(bundle.lexicons, rec.$type, rec).length > 0, `our validator rejects ${JSON.stringify(rec).slice(0, 80)}`);
  }
});

test("atproto: publication is prepared, never performed", async () => {
  const exported = await run("export_atproto_record", { kind: "contribution", created_at: "2026-10-19T00:00:00Z", contribution: { kind: "review", title: "Reviewed the lexicons", subject: "https://github.com/jollyrogercharter/charter" } });
  assert.equal(exported.valid, true);
  const p = await run("prepare_atproto_publication", { record: exported.record });
  assert.equal(p.request_body.repo, "YOUR_DID_OR_HANDLE");
  assert.equal(p.xrpc_method, "com.atproto.repo.createRecord");
  assert.match(p.note, /Nothing was published/);
  assert.equal((await run("prepare_atproto_publication", { record: { ...exported.record, createdAt: "never" } })).error.code, "INVALID_RECORD");
  assert.equal((await run("prepare_atproto_publication", { record: { ...exported.record, title: "write to " + "a" + "@" + "example.com" } })).error.code, "PRIVATE_DATA");
  assert.equal((await run("prepare_atproto_publication", { record: { $type: "app.bsky.feed.post", text: "hi" } })).error.code, "INVALID_INPUT", "only this project's record types");
});

// ---------- Capability manifest ----------

test("capability manifest: valid, complete, honest about interfaces", () => {
  const m = capabilityManifest();
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true });
  const v = ajv.compile(json("spec/capabilities-0.1.schema.json"));
  assert.ok(v(m), ajv.errorsText(v.errors));
  assert.deepEqual(m.capabilities.map((c) => c.name), TOOLS.map((t) => t.name));
  assert.deepEqual(json(path.join(SITE, "api/v1/capabilities.json")), JSON.parse(JSON.stringify(m)));
  assert.ok(m.capabilities.every((c) => c.safety !== "consequential" && c.annotations.readOnlyHint && !c.annotations.consequentialHint));
  const usage = spawnSync(process.execPath, ["bin/jrc.mjs", "--help"], { encoding: "utf8" }).stdout + spawnSync(process.execPath, ["bin/qm.mjs", "--help"], { encoding: "utf8" }).stdout;
  for (const c of m.capabilities) {
    if (c.interfaces.http_static) assert.ok(existsSync(path.join(SITE, c.interfaces.http_static)), `${c.name}: ${c.interfaces.http_static} is published`);
    if (c.interfaces.website) assert.ok(existsSync(path.join(SITE, c.interfaces.website.split("#")[0], "index.html")), `${c.name}: page ${c.interfaces.website} exists`);
    assert.equal(c.interfaces.cli, `jrc tool ${c.name}`, "every capability has the canonical CLI route");
    if (c.interfaces.cli_shortcut) {
      const cmd = c.interfaces.cli_shortcut.split(" ").slice(0, 2).join(" ");
      assert.ok(usage.includes(cmd), `${c.name}: shortcut "${cmd}" is a real CLI command`);
    }
  }
  assert.ok(m.planned.every((p) => p.maturity !== "implemented"));
  for (const c of m.capabilities) assert.equal(c.maturity, c.group === "atproto" ? "draft" : "implemented", `${c.name}: tools on proposed Lexicons aren't called implemented`);
  assert.match(m.interface_verification.webmcp, /^Not verified natively/);
});

test("hostile: any tool that can echo input text is marked untrusted", async () => {
  const SENT = "ZZSENTINELZZ";
  const fill = (v) => (typeof v === "string" ? (/^https?:/.test(v) ? `${v}/${SENT}` : /^\d{4}-/.test(v) || /^[0-9a-f]{7,64}$/.test(v) ? v : `${SENT} ${v}`) : Array.isArray(v) ? v.map(fill) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  const inputs = {
    draft_community_post: { kind: "rfc", title: "Title here", sections: { proposal: "p" } },
    prepare_challenge_submission: { project: "Demo", repository: "https://github.com/x/y", commit: "abc1234", attempted_by: "T", affiliated: false, steps: [{ id: "discover", status: "passed", notes: "n" }] },
    compare_infrastructure_costs: { a: cfg("a", [item("x", 1)]), b: cfg("b", [item("y", 1)]) },
    estimate_savings: { current: cfg("a", [item("x", 2)]), proposed: cfg("b", [item("y", 1)]), horizon_months: 3 },
    prepare_cost_reduction_pr: { current: cfg("a", [item("x", 2)]), proposed: cfg("b", [item("y", 1)]), horizon_months: 3, title: "Cheaper" },
    get_debate: { id: "rfc-1" }, list_debates: { query: "x" }, verify_hashes: { items: [{ path: "a.md", sha256: "0".repeat(64) }] },
    export_atproto_record: { kind: "contribution", created_at: "2026-10-19T00:00:00Z", contribution: { kind: "rfc", title: "T", subject: "https://github.com/x/y" } },
  };
  for (const [name, input] of Object.entries(inputs)) {
    const t = TOOLS.find((x) => x.name === name);
    const out = JSON.stringify(await run(name, fill(input)));
    if (out.includes(SENT)) assert.equal(t.annotations.untrustedContentHint, true, `${name} echoes input but isn't marked untrusted`);
  }
});

// ---------- MCP server (real protocol messages over stdio) ----------

const META = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} };
function mcpSession(lines, cwd = tmpdir()) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.resolve("bin/jrc-mcp.mjs")], { cwd });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.on("close", () => resolve(out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))));
    p.stdin.end(lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  });
}

test("mcp: modern 2026-07-28 requests, discovery, errors and tool results", async () => {
  const res = await mcpSession([
    { jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: META } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: META } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_timestamp_status", arguments: {}, _meta: META } },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_debate", arguments: { id: "Not An Id" }, _meta: META } },
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "no_such_tool", arguments: {}, _meta: META } },
    { jsonrpc: "2.0", id: 6, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 7, method: "tools/list", params: { _meta: { ...META, "io.modelcontextprotocol/protocolVersion": "1999-01-01" } } },
    { jsonrpc: "2.0", id: 8, method: "resources/list", params: { _meta: META } },
    "{not json",
    [{ jsonrpc: "2.0", id: 9, method: "ping" }],
    { jsonrpc: "2.0", method: "notifications/initialized" },
  ]);
  const byId = Object.fromEntries(res.filter((r) => r.id !== null).map((r) => [r.id, r]));
  assert.equal(byId[1].result.resultType, "complete");
  assert.deepEqual(byId[1].result.supportedVersions, ["2026-07-28"], "only versions servable per request are advertised");
  assert.equal(byId[1].result.cacheScope, "public");
  assert.ok(byId[1].result.ttlMs >= 0 && byId[2].result.ttlMs >= 0, "cache hints on discover and tools/list");
  assert.equal(byId[1].result._meta["io.modelcontextprotocol/serverInfo"].name, "jolly-roger-charter");
  assert.deepEqual(byId[2].result.tools.map((t) => t.name), TOOLS.map((t) => t.name), "deterministic order, every tool");
  assert.ok(byId[2].result.tools.every((t) => t.annotations.readOnlyHint && !t.annotations.destructiveHint));
  assert.equal(byId[2].result.tools.find((t) => t.name === "assess_repository").annotations.openWorldHint, true);
  assert.equal(byId[2].result.tools.find((t) => t.name === "get_charter").annotations.openWorldHint, false);
  assert.equal(byId[3].result.isError, false);
  assert.deepEqual(strip(byId[3].result.structuredContent), strip(await run("get_timestamp_status")), "MCP result equals the shared capability");
  assert.deepEqual(JSON.parse(byId[3].result.content[0].text), byId[3].result.structuredContent);
  assert.equal(byId[4].result.isError, true, "invalid tool input is a tool error, not a protocol error");
  assert.equal(byId[5].error.code, -32602);
  assert.equal(byId[6].error.code, -32602, "missing _meta is rejected");
  assert.equal(byId[7].error.code, -32022);
  assert.equal(byId[7].error.data.requested, "1999-01-01");
  assert.equal(byId[8].error.code, -32601);
  assert.ok(res.some((r) => r.id === null && r.error.code === -32700), "parse error");
  assert.ok(res.some((r) => r.id === null && r.error.code === -32600), "batches are rejected");
  assert.equal(res.length, 10, "the notification gets no response");
});

test("audit regressions: MCP request validation (spec review of 54d193f)", async () => {
  const res = await mcpSession([
    { jsonrpc: "2.0", id: null, method: "ping", params: { _meta: META } },
    { jsonrpc: "2.0", id: { a: 1 }, method: "ping", params: { _meta: META } },
    { jsonrpc: "2.0", id: 3, method: "tools/list", params: { cursor: "bogus", _meta: META } },
    { jsonrpc: "2.0", id: 4, method: "tools/list", params: { _meta: { ...META, "io.modelcontextprotocol/clientCapabilities": [] } } },
    { jsonrpc: "2.0", id: 5, method: "tools/list", params: { _meta: { ...META, "io.modelcontextprotocol/protocolVersion": "2025-11-25" } } },
  ]);
  assert.equal(res.filter((r) => r.id === null && r.error.code === -32600).length, 2, "null and object ids are invalid");
  const byId = Object.fromEntries(res.filter((r) => r.id !== null).map((r) => [r.id, r]));
  assert.equal(byId[3].error.code, -32602, "invalid cursor");
  assert.equal(byId[4].error.code, -32602, "clientCapabilities must be an object");
  assert.deepEqual(byId[5].error.data.supported, ["2026-07-28"], "no retry loop: legacy versions need initialize");
  const legacy03 = await mcpSession([{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {} } }]);
  assert.equal(legacy03[0].result.protocolVersion, "2025-11-25", "2025-03-26 (batches) isn't offered");
});

test("audit regressions: datetimes are never looser than @atproto/lexicon; pillar limit has room", () => {
  const L = atproto();
  const base = { $type: "org.jollyrogercharter.contribution", kind: "rfc", title: "t", subject: "https://github.com/x/y", createdAt: "2026-10-19T00:00:00Z" };
  for (const dt of ["2026-01-01T00:00:00-00:00", "2026-00-01T00:00:00Z", "2026-02-30T00:00:00Z", "2026-01-01T24:00:00Z", "2026-01-01T00:00:00.123+05:30", "2024-02-29T12:00:00Z"]) {
    const rec = { ...base, createdAt: dt };
    let ref = true;
    try { L.assertValidRecord(rec.$type, structuredClone(rec)); } catch { ref = false; }
    const ours = validateRecord(bundle.lexicons, rec.$type, rec).length === 0;
    if (!ref) assert.equal(ours, false, `${dt}: the reference rejects it, so we must too`);
    if (dt === "2026-02-30T00:00:00Z") assert.equal(ours, false, "we're stricter than the reference on impossible dates (the spec asks for semantic validity)");
    if (["2026-01-01T00:00:00.123+05:30", "2024-02-29T12:00:00Z"].includes(dt)) assert.equal(ours && ref, true, `${dt} is valid`);
  }
  const a = json(path.join(SITE, "api/v1/atproto-example-assessment.json"));
  L.assertValidRecord(a.$type, { ...structuredClone(a), pillars: [...a.pillars, { pillar: "future_pillar", status: "unknown" }] });
  assert.equal(a.basis, undefined, "kind alone says how it was assessed");
});

test("mcp: legacy initialize clients keep working", async () => {
  const res = await mcpSession([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "legacy", version: "1" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_charter", arguments: { pillar: "data" } } },
  ]);
  const byId = Object.fromEntries(res.map((r) => [r.id, r]));
  assert.equal(byId[1].result.protocolVersion, "2025-06-18");
  assert.equal(byId[2].result.tools.length, TOOLS.length);
  assert.equal(byId[2].result.resultType, undefined, "legacy results keep the legacy shape");
  assert.equal(byId[3].result.structuredContent.pillars[0].key, "data");
  const odd = await mcpSession([{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-01-01", capabilities: {} } }]);
  assert.equal(odd[0].result.protocolVersion, "2025-11-25", "unknown legacy versions get the newest legacy one");
});

test("mcp: cancellation aborts an in-flight tool call", async () => {
  let release;
  const hang = (url, { signal } = {}) => new Promise((_, reject) => { release = () => reject(new DOMException("aborted", "AbortError")); signal?.addEventListener("abort", release, { once: true }); });
  const server = createServer({ ctx: nodeContext({ fetch: hang }) });
  const pending = server.handle({ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "assess_repository", arguments: { repository: "https://github.com/example-org/x" }, _meta: META } });
  await new Promise((r) => setTimeout(r, 50));
  await server.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 42 } });
  const r = await pending;
  assert.equal(r, null, "a cancelled request gets no response at all");
  assert.equal(mcpTools().length, TOOLS.length);
});

test("interfaces agree: CLI, static API and tools return the same results", async () => {
  for (const [file, name] of [["debates", "list_debates"], ["cost-categories", "explain_costs"], ["timestamp", "get_timestamp_status"], ["lexicons", "get_atproto_lexicons"]]) {
    assert.deepEqual(strip(json(path.join(SITE, `api/v1/${file}.json`))), strip(await run(name)), `${file}.json equals ${name}`);
  }
  const cli = spawnSync(process.execPath, ["bin/jrc.mjs", "tool", "get_debate", "--input", "-"], { input: '{"id":"rfc-1"}', encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(strip(JSON.parse(cli.stdout)), strip(await run("get_debate", { id: "rfc-1" })));
  assert.equal(spawnSync(process.execPath, ["bin/jrc.mjs", "tool", "nope"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync(process.execPath, ["bin/jrc.mjs", "tool", "get_debate", "--input", "-"], { input: "{bad", encoding: "utf8" }).status, 1);
});

test("site config: forks can point links at themselves, hostile URLs are ignored", async () => {
  const { site, configureSite } = await import("../lib/jrc/site-config.mjs");
  const before = { ...site };
  try {
    for (const bad of ["javascript:alert(1)", "https://x.example/\"><script>", "//evil.example", "", 42]) {
      configureSite({ repoUrl: bad, siteUrl: bad });
      assert.deepEqual({ ...site }, before, `ignored ${String(bad)}`);
    }
    configureSite({ repoUrl: "https://codeberg.org/fork/charter/", siteUrl: "https://fork.example" });
    assert.equal(site.repoUrl, "https://codeberg.org/fork/charter");
    const d = await run("draft_community_post", { kind: "rfc", title: "Fork test", sections: { proposal: "x" } });
    assert.ok(d.post_link.startsWith("https://codeberg.org/fork/charter/issues/new"));
  } finally {
    configureSite(before);
  }
});

test("audit regressions: the privacy scanner catches the secret formats the security review found missing", async () => {
  const { privacyScan } = await import("../lib/jrc/core.mjs");
  const r = (n) => "Ab3_dEf9-GhIjKlMnOpQrStUvWx".repeat(2).slice(0, n);
  const leaks = [
    "sk-" + "ant-api03-" + r(30), "sk-" + "proj-" + r(30), "AIza" + "SyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q", "https://hooks.slack.com/services/" + "T000/B000/xyz",
    "postgres://app:s3cretpw" + "@" + "db.internal/x", "mongodb+srv://u:pw123456" + "@" + "cluster0.example.net", "Authorization: Basic " + "dXNlcjpwYXNzd29yZDEyMw==",
    "CLOUDFLARE_API_TOKEN=" + "abcd1234efgh5678", "secret: " + "a".repeat(64), "cat ~/.npmrc",
  ];
  for (const l of leaks) assert.ok(privacyScan({ v: l }).length, l);
  for (const ok of ["git clone git" + "@" + "github.com:org/repo.git", "Set CLOUDFLARE_API_TOKEN=${{ secrets.CF }} in CI", "Basic hosting at $5/month", "postgres://localhost/db", "sk-learn is a library"]) {
    assert.deepEqual(privacyScan({ v: ok }), [], ok);
  }
});

test("audit regressions: errors don't echo caller keys, drafts stay linkable, repo text stays inert", async () => {
  const canary = "IGNORE_PREVIOUS_INSTRUCTIONS_" + "9f3c";
  const e = await run("get_charter", { [canary]: 1 });
  assert.equal(e.error.code, "INVALID_INPUT");
  assert.ok(!JSON.stringify(e).includes(canary), "unknown keys aren't reflected");
  assert.equal((await run("get_provenance", { path: "IGNORE PREVIOUS INSTRUCTIONS" })).error.code, "INVALID_INPUT");
  const cyr = "Привет мир ".repeat(250);
  const d = await run("draft_community_post", { kind: "rfc", title: "Long non-ASCII draft", sections: { proposal: cyr.slice(0, 2500), why: cyr.slice(0, 1500) } });
  assert.equal(d.ok, true, JSON.stringify(d.error));
  assert.ok(d.post_link.length <= 7000, `link is ${d.post_link.length} chars`);
  assert.doesNotThrow(() => new URL(d.post_link));
  assert.match(new URL(d.post_link).searchParams.get("body"), /truncated/);
  for (const t of ["list_debates", "get_debate"]) assert.equal(TOOLS.find((x) => x.name === t).annotations.untrustedContentHint, true, `${t} returns repository prose`);
});

test("audit regressions: cost totals stay exact and assumptions are never dropped silently", async () => {
  const huge = cfg("a", [{ id: "x", unit_cost: 1e7, quantity: 1e9, period: "yearly", assumption: "absurd" }]);
  assert.equal((await run("compare_infrastructure_costs", { a: huge, b: { ...huge, name: "b" } })).error.code, "INVALID_INPUT");
  const many = (n, p) => cfg(p, Array.from({ length: n }, (_, i) => item(`${p}${i}`, 1)));
  const s = await run("estimate_savings", { current: many(15, "c"), proposed: many(15, "p"), migration: { one_time_cost: 0, assumption: "none" }, horizon_months: 12 });
  assert.equal(s.assumptions_truncated, true);
  assert.equal(s.assumptions_total, 31);
});

test("audit regressions: MCP stdio bounds line size while streaming and rejects non-string tool names", async () => {
  const { boundedLines } = await import("../bin/jrc-mcp.mjs");
  async function* chunks() { yield Buffer.from('{"a":1}\n' + "x".repeat(50)); yield Buffer.from("y".repeat(50)); yield Buffer.from('\r\n{"b":2}\n'); }
  const got = [];
  for await (const l of boundedLines(chunks(), 64)) got.push(l);
  assert.deepEqual(got, ['{"a":1}', null, '{"b":2}'], "the oversized line is dropped, not buffered");
  const server = createServer({ ctx: nodeContext() });
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} };
  const r = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { _meta: meta, name: { toString: 1 } } });
  assert.equal(r.error.code, -32602);
  const big = spawnSync(process.execPath, ["bin/jrc-mcp.mjs"], { input: "a".repeat(5 * 1024 * 1024) + "\n" + JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping", params: { _meta: meta } }) + "\n", encoding: "utf8", maxBuffer: 1 << 20 });
  const lines = big.stdout.trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines[0].error.message, "Message too large");
  assert.equal(lines[1].id, 2, "the server keeps serving after an oversized line");
});

test("audit regressions: the CSP in _headers holds for every built page", async () => {
  const { readdirSync } = await import("node:fs");
  const headers = readFileSync(path.join(SITE, "_headers"), "utf8");
  assert.match(headers, /script-src 'self';/);
  assert.match(headers, /frame-ancestors 'none'/);
  const files = readdirSync(SITE, { recursive: true }).filter((f) => /\.(html|js|mjs)$/.test(f));
  for (const f of files) {
    const t = readFileSync(path.join(SITE, f), "utf8");
    if (f.endsWith(".html")) {
      assert.doesNotMatch(t, /<script(?![^>]*\bsrc=)[^>]*>/i, `${f}: inline script`);
      assert.doesNotMatch(t, /\sstyle="|<style\b|\son[a-z]+="/i, `${f}: inline style or handler`);
      assert.doesNotMatch(t, /<(?:script|link)[^>]+(?:src|href)="https?:\/\/(?!jollyrogercharter\.org)[^"]+\.(?:js|css)/i, `${f}: third-party code`);
    } else {
      assert.doesNotMatch(t, /\.style\.|setAttribute\(["']style|\beval\(|new Function\(/, `${f}: blocked by the CSP`);
    }
  }
});

test("audit regressions: get_debate warns its text may be stale and doesn't invent an objection", async () => {
  const r = await run("get_debate", { id: "rfc-2" });
  assert.match(r.currency, /not kept current/);
  const d = await run("get_debate", { id: "decision-1" });
  assert.equal(d.against, "(not stated in the source)");
  assert.doesNotMatch(d.note, /strongest objection/);
});

test("audit regressions: a mismatch on a founding file edited since preservation says so", async () => {
  const s = await run("get_provenance_manifest", {});
  assert.equal(s.basis, "self-reported");
  assert.ok(Array.isArray(s.changed_since_preservation) && s.changed_since_preservation.includes("README.md"), "README.md has been edited since preservation");
  const { createHash } = await import("node:crypto");
  const now = createHash("sha256").update(readFileSync("README.md")).digest("hex");
  const v = await run("verify_hashes", { items: [{ path: "README.md", sha256: now }, { path: "SOURCES.md", sha256: "0".repeat(64) }] });
  assert.equal(v.results[0].result, "mismatch");
  assert.match(v.results[0].expected, /edited since the preservation commit/);
  assert.equal(s.changed_since_preservation.includes("SOURCES.md"), false);
  const v01 = createHash("sha256").update(readFileSync("history/MANIFESTO-v0.1-2026-10-17.md")).digest("hex");
  assert.ok(s.changed_since_preservation.includes("MANIFESTO.md"));
  assert.equal((await run("verify_hashes", { items: [{ path: "MANIFESTO.md", sha256: v01 }] })).results[0].result, "match", "the preserved v0.1 copy still verifies");
  assert.equal(v.results[1].expected, undefined, "an unedited file's mismatch isn't explained away");
});
