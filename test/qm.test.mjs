import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { entriesFromCsv, summarize, validateLedger } from "../lib/qm/expenses.mjs";

const BIN = path.resolve("bin/qm.mjs");
const ledger = () => JSON.parse(readFileSync("launch/costs.json", "utf8"));
const qm = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
const errs = (mutate) => { const l = ledger(); mutate(l); return validateLedger(l).map((e) => e.message).join(" | "); };

test("the published ledger is valid and the CLI agrees", () => {
  assert.deepEqual(validateLedger(ledger()), []);
  assert.equal(qm(["validate", "launch/costs.json"]).status, 0);
  assert.equal(qm(["summary", "launch/costs.json"]).status, 0);
  assert.equal(qm(["frob", "x"]).status, 2);
});

test("unknown is never zero, and categories are never added together", () => {
  const s = summarize(ledger());
  assert.equal(s.cash_known_total, 8.5);
  assert.equal(s.cash_unknown_entries, 3);
  assert.equal(s.categories.forecast.known_amount, 11.2, "forecast kept apart");
  assert.equal(s.categories["donated-labor"].unmeasured_hours, 1);
  assert.match(s.statement, /3 cash item\(s\) of unknown amount/);
  assert.match(errs((l) => delete l.entries[0].amount), /never 0 for unknown/);
});

test("noncash time can't be priced without a published method, or mixed into money", () => {
  const nc = (l) => l.entries.find((e) => e.category === "donated-labor");
  assert.match(errs((l) => { nc(l).hours = 10; nc(l).amount = 500; }), /valuation method/);
  assert.equal(errs((l) => { nc(l).hours = 10; nc(l).amount = 500; nc(l).valuation_method = "Reference rate per RFC, scenario B"; }), "");
  assert.match(errs((l) => (l.entries[0].hours = 3)), /hours belong only on noncash/);
  assert.match(errs((l) => delete nc(l).hours), /required on noncash/);
});

test("amounts must be sourced, and cash can't come from an estimate", () => {
  assert.match(errs((l) => (l.entries[0].source = "nowhere")), /declared source/);
  assert.match(errs((l) => (l.sources[0].kind = "estimate")), /can't come from an estimate/);
  assert.match(errs((l) => (l.sources.push({ ...l.sources[0] }))), /duplicate source id/);
  assert.match(errs((l) => (l.entries[1].amount = -5)), /non-negative/);
});

test("billing identifiers and private data are rejected", () => {
  const at = "@";
  for (const leak of ["Invoice IN-12345678", "account #1234567", "card 4111 1111 1111 1111", `billing${at}example.com`, "token " + "ghp" + "_abcdefghijklmnopqrstuvwxyz0123456789"]) {
    assert.notEqual(errs((l) => (l.entries[0].status = leak)), "", leak);
  }
});

test("CSV import validates before writing anything", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "qm-"));
  const { entries, ...header } = ledger();
  writeFileSync(path.join(dir, "h.json"), JSON.stringify(header));
  writeFileSync(path.join(dir, "ok.csv"), 'id,category,item,provider,amount,status,source,privacy\nvps,cash,"Server, small",Example Host,12.00,paid,cf-pages-dashboard,public\nai,cash,AI usage,Example AI,unknown,unknown,no-billing-access,public\n');
  const ok = qm(["csv2json", "ok.csv", "--header", "h.json"], dir);
  assert.equal(ok.status, 0, ok.stderr);
  const out = JSON.parse(ok.stdout);
  assert.equal(out.entries[0].item, "Server, small");
  assert.equal(out.entries[1].amount, null);
  writeFileSync(path.join(dir, "bad.csv"), "id,category,item,provider,amount,status,source,privacy\nx,cash,Thing,P,free,paid,cf-pages-dashboard,public\n");
  const bad = qm(["csv2json", "bad.csv", "--header", "h.json"], dir);
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, "", "nothing written on failure");
  writeFileSync(path.join(dir, "leak.csv"), "id,category,item,provider,amount,status,source,privacy\nx,cash,Invoice IN-99999999,P,1,paid,cf-pages-dashboard,public\n");
  assert.equal(qm(["csv2json", "leak.csv", "--header", "h.json"], dir).stdout, "");
  assert.throws(() => entriesFromCsv('id,item\nx,"unterminated\n'), /unterminated/);
  assert.throws(() => entriesFromCsv("id,secret_column\nx,y\n"), /unknown CSV column/);
  rmSync(dir, { recursive: true, force: true });
});

test("qm schema agrees with the validator on the published ledger and on broken ones", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync("spec/quartermaster/qm-0.1.schema.json", "utf8")));
  assert.ok(validate(ledger()), ajv.errorsText(validate.errors));
  const broken = [(l) => (l.qm = "1"), (l) => (l.entries[0].category = "misc"), (l) => (l.entries[0].hours = 1), (l) => (l.extra = 1), (l) => (l.currency = "usd")];
  for (const [i, mutate] of broken.entries()) {
    const l = ledger();
    mutate(l);
    assert.equal(validate(l), false, `schema case ${i}`);
    assert.ok(validateLedger(l).length, `validator case ${i}`);
  }
});
