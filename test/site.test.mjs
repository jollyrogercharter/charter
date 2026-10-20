import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { renderStatus } from "../scripts/render-status.mjs";

const SITE = "_site";
const ROUTES = ["/", "/manifesto/", "/charter/", "/challenge/", "/debate/", "/costs/", "/history/", "/adopt/", "/quartermaster/", "/governance/", "/updates/", "/status/", "/check/", "/spec/", "/spec/quartermaster/", "/agents/", "/stewardship/", "/pilot/", "/projects/", "/manifesto/v0-1/", "/get-involved/"];
const SLOGANS = ["Free. Libre. Truly Free.", "You can't pirate what belongs to everyone.", "Free the code. Reward the stewards. Give people their time back."];
const PRINCIPLES = ["Software should be free.", "Stewardship should be rewarded.", "Human attention is precious."];
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
  for (const f of ["check/report.json", "check/badge.svg", "check/jrc.json", "spec/jrc-0.1.schema.json", "challenge/log-template.md", "feed.xml", "sitemap.xml", "robots.txt", "404.html", "_redirects", "downloads/MANIFESTO.md", "downloads/MANIFESTO-v0.1-2026-10-17.md"]) {
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
  for (const r of ["/charter/", "/manifesto/v0-1/"]) assert.ok(text(read(routeFile(r))).includes(FOUNDING_LINE), `founding line missing on ${r}`);
  const home = text(read(routeFile("/")));
  for (const line of [...SLOGANS, ...PRINCIPLES, "Could your software survive without you?"]) assert.ok(home.includes(line), `home missing: ${line}`);
  const manifesto = text(read(routeFile("/manifesto/")));
  for (const line of SLOGANS) assert.ok(manifesto.includes(line), `manifesto missing: ${line}`);
});

test("the manifesto stays one page in plain words", () => {
  const body = read("MANIFESTO.md").split("\n").slice(1).join("\n").split(/^---$/m)[0];
  const words = body.split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 200 && words <= 300, `manifesto body is ${words} words`);
  assert.doesNotMatch(body, /\u2014/, "no em dashes");
  for (const tool of ["Bitcoin", "AT Protocol", "WebMCP", "DID", "Merkle", "JRCv1"]) assert.doesNotMatch(body, new RegExp(`\\b${tool}\\b`), `manifesto names a tool: ${tool}`);
});

test("the v0.1 manifesto stays available as a dated record", () => {
  const copy = readFileSync("history/MANIFESTO-v0.1-2026-10-17.md");
  assert.ok(copy.equals(readFileSync(path.join(SITE, "downloads/MANIFESTO-v0.1-2026-10-17.md"))), "published download differs");
  assert.match(text(read(routeFile("/manifesto/v0-1/"))), /kept as a record/);
});

test("retired founding-provenance routes are gone, redirected and unlinked", () => {
  const retired = ["/provenance/", "/conversation/", "/conversation/archive/", "/how-it-was-made/", "/updates/2026-10-17-founding-package-preserved/"];
  const redirects = new Map(read(path.join(SITE, "_redirects")).trim().split("\n").map((l) => { const [from, to, code] = l.split(/\s+/); return [from, { to, code }]; }));
  const sitemap = read(path.join(SITE, "sitemap.xml"));
  for (const r of retired) {
    assert.ok(!existsSync(routeFile(r)), `${r} is still built`);
    assert.ok(!sitemap.includes(`${r}<`), `${r} is still in the sitemap`);
    assert.equal(redirects.get(r)?.code, "301", `${r} has no redirect`);
    assert.ok(existsSync(routeFile(redirects.get(r).to)), `${r} redirects to a missing page`);
  }
  for (const f of ["provenance/launch-manifest.json", "api/v1/provenance.json", "api/v1/timestamp.json"]) assert.ok(!existsSync(path.join(SITE, f)), `${f} is still published`);
  for (const f of walk(SITE).filter((x) => /\.(html|json|xml|js)$/.test(x))) {
    const body = read(f);
    for (const r of retired) assert.ok(!body.includes(`href="${r}"`) && !body.includes(`"${r}"`), `${f} still links ${r}`);
    assert.doesNotMatch(body, /Who made this|Neither company endorses/, `${f} still carries the attribution banner`);
  }
});

test("economic pages say the model is unproven and label every dollar figure", () => {
  assert.match(text(read(routeFile("/"))), /not a proven business model[\s\S]*It hasn't started/);
  assert.match(text(read(routeFile("/pilot/"))), /proposed, not started\. There are no pilot customers, no revenue and no results yet\./);
  assert.match(text(read(routeFile("/stewardship/"))), /A proposal, not a proven business model\./);
  for (const r of ["/", "/pilot/", "/stewardship/", "/projects/"]) {
    for (const [, para] of read(routeFile(r)).matchAll(/<(?:p|li|td)>([\s\S]*?)<\/(?:p|li|td)>/g)) {
      if (/\$\s?\d/.test(para)) assert.match(para, /[Hh]ypothetical/, `unlabelled dollar figure on ${r}: ${text(para).slice(0, 80)}`);
    }
  }
});

test("pages that left the primary navigation are still linked from every page", () => {
  const formerPrimary = ["/manifesto/", "/charter/", "/adopt/", "/check/", "/challenge/", "/debate/", "/costs/", "/pilot/", "/projects/", "/status/", "/stewardship/", "/get-involved/"];
  for (const f of htmlFiles) {
    const html = read(f);
    for (const url of formerPrimary) assert.ok(html.includes(`href="${url}"`), `${f} no longer links ${url}`);
  }
});

test("historical quotes carry their sources", () => {
  const history = read(routeFile("/history/"));
  assert.match(history, /He who receives an idea from me, receives instruction himself without lessening mine\.[\s\S]{0,400}https:\/\/tjrs\.monticello\.org\/letter\/293/);
  assert.match(history, /Information should be free but your time should not\.[\s\S]{0,600}https:\/\/www\.wired\.com\/story\/hackers-at-30-hackers-and-information-wants-to-be-free\//);
  assert.match(text(history), /not a 1984 transcript/);
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

test("licence and notice are present and linked", () => {
  assert.match(read("LICENSE"), /CC0 1\.0 Universal/);
  assert.ok(existsSync("NOTICE.md"));
  for (const f of htmlFiles) assert.match(read(f), /blob\/main\/LICENSE">CC0 1\.0</, `${f} footer licence link`);
});

test("primary navigation is Manifesto, Stewardship, Get Involved", () => {
  for (const f of htmlFiles) {
    const nav = read(f).match(/<nav aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1] ?? "";
    assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), ["/manifesto/", "/stewardship/", "/get-involved/"], f);
  }
});

test("hourly work is never declared incompatible", () => {
  const absolute = /\bno hourly billing|without hourly billing|not by (billing|counting) hours|hourly billing punishes/i;
  for (const f of ["README.md", "MANIFESTO.md", "STEWARDSHIP-ECONOMY.md", "CHARTER.md", "community/GET-INVOLVED.md", ...htmlFiles]) assert.doesNotMatch(read(f), absolute, f);
});

test("current docs never call the applied CC0 dedication unapplied", () => {
  const stale = /final `?LICENSE`? claiming CC0|No licence or CC0 dedication has been applied|\(Decision Pending\)|before license is finalized/i;
  for (const f of ["README.md", "NOTICE.md", "OPEN-DEPENDENCIES.md", "DECISIONS-AND-QUESTIONS.md", "legal/LICENSE-AND-RISK.md", "launch/RFC-SEEDS.md", ...htmlFiles]) assert.doesNotMatch(read(f), stale, `${f} contradicts LICENSE`);
});

test("status has one source and every view agrees with it", () => {
  const s = JSON.parse(read("launch/status.json"));
  assert.equal(read("launch/LAUNCH-STATUS.md"), renderStatus(s), "LAUNCH-STATUS.md is stale; run npm run status");
  const ids = s.items.map((i) => i.id);
  assert.deepEqual(ids.filter((id, n) => ids.indexOf(id) !== n), [], "duplicate status ids");
  const page = text(read(routeFile("/status/")));
  for (const i of s.items) assert.ok(page.includes(i.title), `status page missing ${i.id}`);
  for (const i of s.items.filter((x) => x.state === "implemented" && x.url?.startsWith("https://jollyrogercharter.org/"))) {
    assert.ok(existsSync(routeFile(new URL(i.url).pathname)), `${i.id} claims a page that isn't built`);
  }
});

test("costs page shows the validated ledger and never invents figures", () => {
  const page = text(read(routeFile("/costs/")));
  assert.match(page, /known cash spending/);
  assert.ok(existsSync(path.join(SITE, "costs/ledger.json")));
  assert.equal(read(path.join(SITE, "costs/ledger.json")), read("launch/costs.json"), "published ledger is byte-identical to the source");
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
    [/(?<![\w.-])\/(?:Users|home)\/[a-z]+\//, "local home path"],
  ];
  const hits = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    for (const [re, label] of patterns) if (re.test(s) && !(f === "test/site.test.mjs")) hits.push(`${f}: ${label}`);
  }
  assert.deepEqual(hits, []);
});
