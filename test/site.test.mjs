import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SITE = "_site";
const ROUTES = ["/", "/manifesto/", "/charter/", "/challenge/", "/debate/", "/how-it-was-made/", "/conversation/", "/conversation/archive/", "/provenance/", "/costs/", "/history/", "/adopt/", "/quartermaster/", "/governance/", "/updates/"];
const FOUNDING_LINE = "If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.";

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const htmlFiles = walk(SITE).filter((f) => f.endsWith(".html"));
const read = (f) => readFileSync(f, "utf8");
const routeFile = (r) => path.join(SITE, r, r.endsWith("/") ? "index.html" : "");
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const ids = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

test("every route in the site spec is built", () => {
  for (const r of ROUTES) assert.ok(existsSync(routeFile(r)), `missing ${r}`);
  for (const f of ["feed.xml", "sitemap.xml", "robots.txt", "404.html", "provenance/launch-manifest.json", "downloads/MANIFESTO.md"]) {
    assert.ok(existsSync(path.join(SITE, f)), `missing ${f}`);
  }
});

test("internal links and fragments resolve", () => {
  const broken = [];
  for (const f of htmlFiles) {
    const html = read(f);
    for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
      if (/^[a-z]+:/i.test(href)) continue;
      const [p, frag] = href.split("#");
      const target = p ? path.join(SITE, p.endsWith("/") ? p + "index.html" : p) : f;
      if (!existsSync(target)) { broken.push(`${f} -> ${href}`); continue; }
      if (frag && target.endsWith(".html") && !ids(read(target)).includes(frag)) broken.push(`${f} -> ${href} (no #${frag})`);
    }
  }
  assert.deepEqual(broken, []);
});

test("founding lines appear verbatim", () => {
  for (const r of ["/", "/manifesto/"]) assert.ok(text(read(routeFile(r))).includes(FOUNDING_LINE), `founding line missing on ${r}`);
  const home = text(read(routeFile("/")));
  for (const line of ["Free. Libre. Truly Free.", "You can't pirate what belongs to everyone.", "Could your software survive without you?"]) {
    assert.ok(home.includes(line), `home missing: ${line}`);
  }
});

test("historical quotes carry their sources", () => {
  const history = read(routeFile("/history/"));
  assert.match(history, /He who receives an idea from me, receives instruction himself without lessening mine\.[\s\S]{0,400}https:\/\/tjrs\.monticello\.org\/letter\/293/);
  assert.match(history, /Information should be free but your time should not\.[\s\S]{0,600}https:\/\/www\.wired\.com\/story\/hackers-at-30-hackers-and-information-wants-to-be-free\//);
  assert.match(text(history), /not a 1984 transcript/);
});

test("every page discloses human and AI authorship", () => {
  for (const f of htmlFiles) {
    const t = text(read(f));
    assert.ok(t.includes("ChatGPT") && t.includes("Claude (Anthropic)") && t.includes("Neither company endorses"), `attribution missing in ${f}`);
  }
});

test("accessibility smoke checks", () => {
  for (const f of htmlFiles) {
    const html = read(f);
    assert.match(html, /<html lang="en">/, f);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${f} must have exactly one h1`);
    assert.ok(ids(html).includes("main") && html.includes('href="#main"'), `${f} skip link`);
    for (const tag of ["<header", "<nav", "<main", "<footer"]) assert.ok(html.includes(tag), `${f} missing ${tag}`);
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) assert.match(img, /\salt="/, `${f} img without alt`);
    const all = ids(html);
    assert.deepEqual(all.filter((id, i) => all.indexOf(id) !== i), [], `${f} duplicate ids`);
  }
});

test("conversation pages never present the archive as a transcript", () => {
  assert.match(text(read(routeFile("/conversation/"))), /Transcript pending human review/);
  assert.match(text(read(routeFile("/conversation/archive/"))), /This is not a verbatim transcript\./);
  assert.ok(!existsSync("conversation/FOUNDING-SESSION.md") || existsSync("conversation/EDITORIAL-NOTES.md"), "a transcript needs editorial notes");
});

test("provenance state is internally consistent", () => {
  const m = JSON.parse(read("provenance/launch-manifest.json"));
  assert.ok(["not-requested", "pending", "verified"].includes(m.timestamp_state));
  if (m.timestamp_state !== "not-requested") assert.ok(m.opentimestamps_proof_path && existsSync(m.opentimestamps_proof_path), "claimed proof file must exist");
  if (m.timestamp_state === "verified") assert.ok(m.bitcoin_attestation_time_utc, "verified needs an attestation time");
  else assert.equal(m.bitcoin_attestation_time_utc, null);
  if (m.timestamped_artifact) {
    const buf = readFileSync(m.timestamped_artifact.path);
    assert.equal(createHash("sha256").update(buf).digest("hex"), m.timestamped_artifact.sha256, "stamped file changed after stamping");
    const lines = buf.toString().trim().split("\n");
    assert.equal(lines[0], `${m.received_package.sha256}  ${m.received_package.file}`);
    assert.deepEqual(lines.slice(1), m.files.map((f) => `${f.sha256}  ${f.path}`));
  }
  if (m.founding_transcript.state !== "not-provided") assert.ok(existsSync(m.founding_transcript.path));
  assert.ok(text(read(routeFile("/provenance/"))).includes(m.timestamp_state));
});

test("manifest digests match the preservation commit", (t) => {
  const m = JSON.parse(read("provenance/launch-manifest.json"));
  try { execFileSync("git", ["cat-file", "-e", `${m.preservation_commit}^{commit}`], { stdio: "ignore" }); }
  catch { return t.skip("preservation commit not available (not a full clone)"); }
  for (const f of m.files) {
    const buf = execFileSync("git", ["show", `${m.preservation_commit}:${f.path}`]);
    assert.equal(buf.length, f.bytes, f.path);
    assert.equal(createHash("sha256").update(buf).digest("hex"), f.sha256, f.path);
  }
});

test("licence and notice are present and linked", () => {
  assert.match(read("LICENSE"), /CC0 1\.0 Universal/);
  assert.ok(existsSync("NOTICE.md"));
  for (const f of htmlFiles) assert.match(read(f), /blob\/main\/LICENSE">CC0 1\.0</, `${f} footer licence link`);
});

test("cost ledger never invents figures", () => {
  const c = JSON.parse(read("launch/costs.json"));
  for (const e of [...c.billed, ...c.ai_usage]) {
    assert.ok(e.amount === null || typeof e.amount === "number", e.item);
    assert.ok(e.source && e.status, `${e.item} needs source and status`);
  }
  for (const e of c.noncash_attention) assert.ok(e.valuation === null || e.method, `${e.item}: a valuation needs a method`);
});

test("no secrets or personal data in tracked files or build output", () => {
  let tracked;
  try { tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n"); }
  catch { tracked = []; }
  const files = [...tracked.filter((f) => existsSync(f) && statSync(f).isFile() && !f.endsWith("package-lock.json")), ...walk(SITE)];
  const patterns = [
    [/[A-Za-z0-9._%+-]+@(?!users\.noreply\.github\.com)[A-Za-z0-9-]+\.[A-Za-z]{2,}/, "email address"],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
    [/\bsk-[A-Za-z0-9_-]{20,}/, "API key"],
    [/\bAKIA[0-9A-Z]{16}\b/, "AWS key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/\/Users\/[a-z]+\/|\/home\/[a-z]+\//, "local home path"],
  ];
  const hits = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    for (const [re, label] of patterns) if (re.test(s) && !(f === "test/site.test.mjs")) hits.push(`${f}: ${label}`);
  }
  assert.deepEqual(hits, []);
});
