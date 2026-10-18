import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { validateManifest } from "../lib/jrc/validate.mjs";

const BIN = path.resolve("bin/jrc.mjs");
const FIX = path.resolve("test/fixtures/jrc");
const jrc = (args, cwd = process.cwd()) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
const valid = () => JSON.parse(readFileSync(path.join(FIX, "valid/jrc.json"), "utf8"));
const codes = (r) => JSON.parse(r.stdout).filter((f) => f.severity === "error").map((f) => f.code);

function sandbox(manifest, files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "jrc-"));
  for (const [p, c] of Object.entries({ LICENSE: "CC0 1.0\n", "docs/BUILD.md": "Build: npm ci && npm test\n", ...files })) {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), c);
  }
  if (manifest !== undefined) writeFileSync(path.join(dir, "jrc.json"), typeof manifest === "string" ? manifest : JSON.stringify(manifest));
  return dir;
}
function checkErrors(mutate, files) {
  const m = valid();
  mutate(m);
  const dir = sandbox(m, files);
  const r = jrc(["check", "--json"], dir);
  rmSync(dir, { recursive: true, force: true });
  return { status: r.status, errors: codes(r) };
}

test("valid and incomplete-but-honest manifests exit 0", () => {
  for (const name of ["valid", "partial"]) {
    const r = jrc(["check", path.join(FIX, name, "jrc.json")]);
    assert.equal(r.status, 0, `${name}: ${r.stderr}`);
  }
});

test("malformed input exits 1, usage errors exit 2", () => {
  const dir = sandbox("{ not json");
  assert.equal(jrc(["check"], dir).status, 1);
  assert.equal(jrc(["check", "missing.json"], dir).status, 1);
  assert.equal(jrc(["frobnicate"], dir).status, 2);
  assert.equal(jrc(["check", "--nope"], dir).status, 2);
  rmSync(dir, { recursive: true, force: true });
});

test("schema violations are reported, not crashed on", () => {
  const cases = [
    (m) => delete m.pillars.data,
    (m) => (m.pillars.code_rights.status = "done"),
    (m) => (m.jrc = "1.0"),
    (m) => (m.assessment.date = "2026-02-30"),
    (m) => (m.extra = true),
    (m) => (m.pillars.development.claims[0].evidence[0] = { kind: "file" }),
    (m) => (m.pillars.code_rights.claims.push({ ...m.pillars.code_rights.claims[0] })),
    (m) => (m.pillars.code_rights.claims[0].evidence[0].sha256 = "ABC"),
  ];
  for (const [i, mutate] of cases.entries()) {
    const { status, errors } = checkErrors(mutate);
    assert.equal(status, 1, `case ${i}`);
    assert.ok(errors.includes("E-SCHEMA"), `case ${i}: ${errors}`);
  }
});

test("misleading authority claims fail; negated ones pass", () => {
  assert.equal(jrc(["check", path.join(FIX, "misleading/jrc.json")]).status, 1);
  for (const word of ["Certified by JRC", "Endorsed by the Charter", "guaranteed compliant", "officially recognised"]) {
    assert.deepEqual(checkErrors((m) => (m.pillars.operations.claims[0].statement = word)).errors, ["E-MISLEADING"], word);
  }
  assert.equal(checkErrors((m) => (m.pillars.operations.claims[0].statement = "This is not certified by anyone.")).status, 0);
});

test("privacy-sensitive values fail", () => {
  // Assembled at runtime so the repository itself never contains a matchable secret.
  const at = "@";
  const leaks = [
    `Contact maintainer at someone${at}example.com`,
    "token " + "ghp" + "_abcdefghijklmnopqrstuvwxyz0123456789",
    "see /" + "Users/someone/project/notes",
    `https://user:hunter2${at}example.org/repo`,
    "https://example.org/report?token=abcdef123456",
    "-----BEGIN RSA " + "PRIVATE KEY-----",
  ];
  for (const leak of leaks) {
    assert.ok(checkErrors((m) => (m.pillars.operations.claims[0].evidence[0].note = leak)).errors.includes("E-PRIVACY"), leak);
  }
  assert.ok(checkErrors((m) => (m.assessment.assessor = `someone${at}example.com`)).errors.includes("E-PRIVACY"));
});

test("evidence paths cannot escape the project, and hashes must match", () => {
  assert.deepEqual(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "../../etc/passwd")).errors, ["E-PATH"]);
  assert.deepEqual(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "/etc/hosts")).errors, ["E-PATH"]);
  assert.deepEqual(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "docs/MISSING.md")).errors, ["E-MISSING"]);
  assert.deepEqual(checkErrors((m) => (m.pillars.code_rights.claims[0].evidence[0].sha256 = "0".repeat(64))).errors, ["E-HASH"]);

  const outside = mkdtempSync(path.join(tmpdir(), "jrc-outside-"));
  writeFileSync(path.join(outside, "secret.txt"), "x");
  const m = valid();
  m.pillars.development.claims[0].evidence[0].path = "docs/link.txt";
  const dir = sandbox(m);
  symlinkSync(path.join(outside, "secret.txt"), path.join(dir, "docs/link.txt"));
  assert.deepEqual(codes(jrc(["check", "--json"], dir)), ["E-PATH"]);
  rmSync(dir, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

test("independence and evidenced status cannot be faked", () => {
  const indep = (m) => m.pillars.governance.claims[0].verification;
  assert.ok(checkErrors((m) => delete indep(m).reviewer).errors.includes("E-INDEPENDENT"));
  assert.ok(checkErrors((m) => delete indep(m).report).errors.includes("E-INDEPENDENT"));
  assert.ok(checkErrors((m) => (indep(m).reviewer = m.assessment.assessor)).errors.includes("E-INDEPENDENT"));
  assert.ok(checkErrors((m) => (indep(m).reviewed = "2999-01-01")).errors.includes("E-DATE"));
  assert.ok(checkErrors((m) => (m.pillars.development.claims[0].evidence = [])).errors.includes("E-EVIDENCED-EMPTY"));
  assert.ok(checkErrors((m) => delete m.pillars.data.applicability).errors.includes("E-NA-REASON"));
  assert.ok(checkErrors((m) => (m.assessment.date = "2999-01-01")).errors.includes("E-DATE"));
});

test("jrc never runs manifest commands", () => {
  const { status } = checkErrors((m) => (m.pillars.development.claims[0].evidence[1].command = "touch PWNED"));
  assert.equal(status, 0);
  const m = valid();
  m.pillars.development.claims[0].evidence[1].command = "touch PWNED";
  const dir = sandbox(m);
  jrc(["check"], dir);
  jrc(["report", "--out", "out"], dir);
  assert.equal(existsSync(path.join(dir, "PWNED")), false);
  rmSync(dir, { recursive: true, force: true });
});

test("report is reproducible and honest about what it checked", () => {
  const dir = sandbox(valid());
  const a = jrc(["report", "--format", "json"], dir);
  const b = jrc(["report", "--format", "json"], dir);
  assert.equal(a.status, 0);
  assert.equal(a.stdout, b.stdout, "two runs must be byte-identical");
  const r = JSON.parse(a.stdout);
  assert.equal(r.summary.applicable_pillars, 5);
  assert.equal(r.pillars.data.level, "not-applicable");
  assert.equal(r.pillars.economics.level, "partial");
  assert.equal(r.pillars.governance.level, "independently-reproduced");
  assert.equal(r.pillars.operations.claims[0].evidence[0].result, "not-fetched");
  assert.equal(r.pillars.code_rights.claims[0].evidence[0].result, "verified");
  assert.match(r.disclaimer, /not a licence or a certification/);
  const md = jrc(["report"], dir).stdout;
  assert.match(md, /not a licence or a certification/);
  assert.doesNotMatch(md.split("## Stated limitations")[0].replace(/not a licence or a certification/g, ""), /\bcertif/i, "the report itself never says certified");
  const badge = jrc(["report", "--format", "badge"], dir).stdout;
  assert.match(badge, /self-reported/);
  assert.match(badge, /Not a certification/);
  assert.equal(jrc(["report", "--out", "o"], dir).status, 0);
  for (const f of ["jrc-report.json", "JRC-REPORT.md", "jrc-badge.svg"]) assert.ok(existsSync(path.join(dir, "o", f)));
  rmSync(dir, { recursive: true, force: true });
});

test("init never overwrites and produces a manifest that checks", () => {
  const dir = sandbox(undefined, { "package-lock.json": "{}", "DEPLOYMENT.md": "x" });
  assert.equal(jrc(["init"], dir).status, 0);
  const created = readFileSync(path.join(dir, "jrc.json"), "utf8");
  assert.equal(jrc(["init"], dir).status, 1);
  assert.equal(readFileSync(path.join(dir, "jrc.json"), "utf8"), created, "existing manifest untouched");
  const m = JSON.parse(created);
  assert.ok(m.pillars.code_rights.candidates.includes("LICENSE"));
  assert.ok(Object.values(m.pillars).every((p) => p.claims.length === 0), "candidates are never turned into claims");
  assert.equal(jrc(["check"], dir).status, 0);
  assert.ok(JSON.parse(jrc(["check", "--json"], dir).stdout).some((f) => f.code === "W-PLACEHOLDER"), "unedited starter is flagged");
  rmSync(dir, { recursive: true, force: true });
});

test("challenge prints a template and never overwrites", () => {
  const dir = sandbox(undefined);
  const r = jrc(["challenge", "--project", "Demo"], dir);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Could your software survive without you\?/);
  assert.equal((r.stdout.match(/^## \d\./gm) ?? []).length, 9);
  assert.equal(jrc(["challenge", "--out", "LOG.md"], dir).status, 0);
  assert.equal(jrc(["challenge", "--out", "LOG.md"], dir).status, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("published JSON Schema agrees with the built-in validator", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  const validate = ajv.compile(JSON.parse(readFileSync("spec/jrc-0.1.schema.json", "utf8")));
  const samples = [valid(), JSON.parse(readFileSync(path.join(FIX, "partial/jrc.json"), "utf8")), JSON.parse(readFileSync("jrc.json", "utf8"))];
  for (const s of samples) {
    assert.deepEqual(validateManifest(s), [], s.project.name);
    assert.ok(validate(s), `${s.project.name}: ${ajv.errorsText(validate.errors)}`);
  }
  const broken = [
    (m) => delete m.pillars.data, (m) => (m.pillars.code_rights.status = "done"), (m) => (m.jrc = "1.0"), (m) => (m.extra = 1),
    (m) => (m.pillars.development.claims[0].evidence[0] = { kind: "file" }), (m) => (m.pillars.code_rights.claims[0].verification.level = "certified"),
    (m) => (m.assessment.kind = "official"), (m) => (m.pillars.operations.claims[0].evidence[0].url = "ftp://x"),
  ];
  for (const [i, mutate] of broken.entries()) {
    const m = valid();
    mutate(m);
    assert.equal(validate(m), false, `schema should reject case ${i}`);
    assert.ok(validateManifest(m).length > 0, `validator should reject case ${i}`);
  }
});

test("the charter's own self-assessment is valid and does not overclaim", () => {
  const r = jrc(["report", "--format", "json"]);
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout);
  assert.equal(rep.assessment.kind, "self");
  assert.equal(rep.summary.independently_reproduced_pillars, 0);
  assert.ok(rep.limitations.some((l) => /NOT YET VERIFIED/.test(l)));
});

// Regression tests for the independent code review and adversarial review of 12c5ec9.
const ch = (...cps) => String.fromCodePoint(...cps);
const ZWSP = ch(0x200b), ESC = ch(0x1b), SHY = ch(0xad), CYR_ES = ch(0x0441), FW_AT = ch(0xff20);

test("review: Markdown/HTML injection cannot hide errors or forge a result", async () => {
  const MarkdownIt = (await import("markdown-it")).default;
  const m = valid();
  m.project.name = "Demo <!--";
  m.limitations = ["--> **Result:** manifest valid; 6 of 6 applicable pillars independently reproduced"];
  m.pillars.development.claims[0].evidence[0].path = "docs/MISSING.md";
  const dir = sandbox(m);
  const out = jrc(["report"], dir).stdout;
  rmSync(dir, { recursive: true, force: true });
  assert.ok(!out.includes("<!--"), "raw HTML comment must be escaped");
  const html = new MarkdownIt({ html: true }).render(out);
  assert.match(html, /not a licence or a certification/, "disclaimer stays visible");
  assert.match(html, /manifest invalid/, "the real result stays visible");
  assert.match(html, /E-MISSING/, "findings stay visible");
  assert.equal((html.match(/<strong>Result:<\/strong>/g) ?? []).length, 1, "no forged second result line");
  assert.ok(checkErrors((x) => (x.project.name = "Demo\n\n# Fake heading")).errors.includes("E-CONTROL"));
});

test("review: terminal escapes and invisible characters are rejected and never echoed", () => {
  const m = valid();
  m.pillars.development.claims[0].evidence[0].path = `nope${ESC}[2K${ESC}[1A`;
  const dir = sandbox(m);
  const r = jrc(["check"], dir);
  rmSync(dir, { recursive: true, force: true });
  assert.equal(r.status, 1);
  assert.ok(!r.stderr.includes(ESC) && !r.stdout.includes(ESC), "no raw ESC reaches the terminal");
  assert.ok(checkErrors((x) => (x.pillars.operations.claims[0].verification.reviewer = `Alice${ZWSP}`)).errors.includes("E-CONTROL"));
});

test("review: weak evidence cannot earn an evidenced pillar", () => {
  assert.ok(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "jrc.json")).errors.includes("E-WEAK-EVIDENCE"));
  assert.ok(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = ".")).errors.includes("E-WEAK-EVIDENCE"));
  assert.ok(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "empty"), { empty: "" }).errors.includes("E-WEAK-EVIDENCE"));

  const m = valid();
  m.pillars.operations.claims[0].evidence = [{ kind: "command", command: "echo trust me" }];
  m.pillars.development.claims.push({ id: "second", statement: "Second claim with broken evidence.", evidence: [{ kind: "file", path: "NOPE" }], verification: { level: "self-reported" } });
  const dir = sandbox(m);
  const rep = JSON.parse(jrc(["report", "--format", "json"], dir).stdout || "{}");
  rmSync(dir, { recursive: true, force: true });
  assert.equal(rep.pillars?.development.level, "partial", "a pillar with failing evidence is not evidenced");
  assert.ok(rep.summary.evidenced_with_local_files < rep.summary.evidenced_pillars, "command-only evidence is not counted as locally checked");
});

test("review: independence cannot be faked with names, Unicode or bare assertions", () => {
  const rv = (m) => m.pillars.governance.claims[0].verification;
  assert.ok(checkErrors((m) => (rv(m).reviewer = m.project.name)).errors.includes("E-INDEPENDENT"));
  assert.ok(checkErrors((m) => (rv(m).reviewer = "@example maintainer")).errors.includes("E-INDEPENDENT"));
  assert.ok(checkErrors((m) => ((m.assessment.kind = "independent"), (m.assessment.assessor = `${m.project.name} maintainers`))).errors.includes("E-INDEPENDENT"));
  const m = valid();
  rv(m).reviewer = "Example Maintainer Smith";
  const dir = sandbox(m);
  const f = JSON.parse(jrc(["check", "--json"], dir).stdout);
  rmSync(dir, { recursive: true, force: true });
  assert.ok(f.some((x) => x.code === "W-INDEPENDENT"), "overlapping names are flagged");
});

test("review: misleading-wording bypasses are caught", () => {
  const bypasses = [
    `cer${SHY}tified`, `${CYR_ES}ertified`, "CERTIFIED".split("").map((c) => ch(c.charCodeAt(0) + 0xfee0)).join(""),
    "fully  compliant", "This is not a toy project, it is certified", "No doubt this is certified",
    "Independently audited and verified", "Audited by a foundation",
  ];
  for (const b of bypasses) {
    const errs = checkErrors((m) => (m.project.description = b)).errors;
    assert.ok(errs.includes("E-MISLEADING") || errs.includes("E-CONFUSABLE"), JSON.stringify(b));
  }
  assert.ok(checkErrors((m) => (m.limitations = ["Certified by a foundation"])).errors.includes("E-MISLEADING"), "limitations are scanned too");
  assert.equal(checkErrors((m) => (m.pillars.code_rights.claims[0].statement = "Licensed under an OSI-approved licence (MIT).")).status, 0);
  assert.equal(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "docs/CERTIFICATION.md"), { "docs/CERTIFICATION.md": "x" }).status, 0, "paths aren't prose");
});

test("review: privacy filter gaps are closed without flagging ordinary evidence", () => {
  const at = "@";
  const leaks = [
    `alice${FW_AT}example.com`, "PATH=/" + "Users/bob/bin:$PATH make", "cat C:/" + "Users/bob/x", "/" + "root/.ssh/id_rsa",
    "Authorization: Bearer abcdefghijklmnop1234567890", "sk_" + "live_4eC39HqLyjWDarjtT1zdp7dc", "https://example.org/cb?code=abcdefghijk",
    "https://example.org/#access_token=abcdefghijkl", "password: hunter2hunter2",
  ];
  for (const l of leaks) assert.ok(checkErrors((m) => (m.project.description = l)).errors.includes("E-PRIVACY"), l);
  for (const ok of [`git clone git${at}github.com:org/repo.git`, "cd /" + "home/runner/work && make"]) {
    assert.equal(checkErrors((m) => (m.pillars.development.claims[0].evidence[1].command = ok)).status, 0, ok);
  }
});

test("review: report refuses to publish private data", () => {
  const m = valid();
  m.assessment.method = "contact " + "bob" + "@" + "leak.example";
  const dir = sandbox(m);
  const r = jrc(["report", "--out", "o"], dir);
  assert.equal(r.status, 1);
  assert.equal(existsSync(path.join(dir, "o")), false, "nothing written");
  assert.equal(jrc(["report", "--format", "json"], dir).stdout, "", "nothing printed");
  rmSync(dir, { recursive: true, force: true });
});

test("review: bad input fails cleanly instead of crashing or hanging", () => {
  const dir = sandbox(valid(), { "a-file": "x" });
  for (const args of [["report", "--out", "a-file"], ["init", "a-file"], ["challenge", "--out", ""]]) {
    const r = jrc(args, dir);
    assert.equal(r.status, 2, args.join(" "));
    assert.doesNotMatch(r.stderr, /\n\s+at /, "no stack trace");
  }
  symlinkSync(path.join(dir, "nowhere"), path.join(dir, "dangling"));
  mkdirSync(path.join(dir, "sub"));
  symlinkSync(path.join(dir, "nowhere"), path.join(dir, "sub", "jrc.json"));
  const r = jrc(["init", "sub"], dir);
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
  const bad = jrc(["check", "--json", "a-file"], dir);
  assert.equal(JSON.parse(bad.stdout)[0].code, "E-LOAD", "--json always emits JSON");
  rmSync(dir, { recursive: true, force: true });

  if (process.platform !== "win32") {
    const m = valid();
    m.pillars.development.claims[0].evidence[0] = { kind: "file", path: "pipe", sha256: "0".repeat(64) };
    const d2 = sandbox(m);
    spawnSync("mkfifo", [path.join(d2, "pipe")]);
    const t = spawnSync(process.execPath, [BIN, "check", "--json"], { cwd: d2, encoding: "utf8", timeout: 5000 });
    assert.notEqual(t.signal, "SIGTERM", "FIFO evidence must not hang");
    assert.ok(codes(t).includes("E-PATH"));
    rmSync(d2, { recursive: true, force: true });
  }
});

test("review: BOM, deep nesting, '..name' paths and the validator/schema boundary", () => {
  const dir = sandbox("\uFEFF" + JSON.stringify(valid()));
  assert.equal(jrc(["check"], dir).status, 0, "UTF-8 BOM is accepted");
  rmSync(dir, { recursive: true, force: true });

  let deep = "0";
  for (let i = 0; i < 20000; i++) deep = `[${deep}]`;
  const d2 = sandbox(JSON.stringify(valid()).replace(/}$/, `,"zz":${deep}}`));
  const r = jrc(["check", "--json"], d2);
  assert.equal(r.status, 1);
  assert.ok(codes(r).includes("E-SCHEMA"));
  rmSync(d2, { recursive: true, force: true });

  assert.equal(checkErrors((m) => (m.pillars.development.claims[0].evidence[0].path = "..data/f.txt"), { "..data/f.txt": "x" }).status, 0);

  for (const url of ["HTTPS://example.com", " https://example.com", "https:/example.com", "http:example.com"]) {
    assert.ok(checkErrors((m) => (m.project.homepage = url)).errors.includes("E-SCHEMA"), url);
  }
  assert.ok(checkErrors((m) => (m.pillars.code_rights.claims[0].statement = ch(0x1f600, 0x1f600))).errors.includes("E-SCHEMA"), "length counts code points");
});

test("review: report --out never writes through a symlink", () => {
  const dir = sandbox(valid(), { "victim.txt": "keep me" });
  mkdirSync(path.join(dir, "o"));
  symlinkSync(path.join(dir, "victim.txt"), path.join(dir, "o", "JRC-REPORT.md"));
  assert.equal(jrc(["report", "--out", "o"], dir).status, 1);
  assert.equal(readFileSync(path.join(dir, "victim.txt"), "utf8"), "keep me");
  rmSync(dir, { recursive: true, force: true });
});
