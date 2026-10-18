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
  for (const word of ["Certified by JRC", "OSI-approved licence", "Endorsed by the Charter", "guaranteed compliant"]) {
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
