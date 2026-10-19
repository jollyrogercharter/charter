#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { entriesFromCsv, summarize, validateLedger } from "../lib/qm/expenses.mjs";

const USAGE = `qm 0.1 - Quartermaster expense ledger tools (draft)

Usage:
  qm validate LEDGER.json            Check a ledger against the qm 0.1 rules
  qm summary LEDGER.json [--json]    Totals per category; unknowns counted, never zeroed
  qm csv2json ENTRIES.csv --header HEADER.json
                                     Build a ledger from a CSV of entries plus a JSON header
                                     (qm, project, currency, as_of_utc, sources)

Exit codes: 0 ok, 1 invalid ledger or input, 2 usage error.
qm reads local files only. It never calls a billing API or asks for credentials.`;

const out = (s) => process.stdout.write(s);
const fail = (msg, code = 2) => { process.stderr.write(`qm: ${String(msg).replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, "?")}\n`); return code; };

function readJson(file) {
  try { return { value: JSON.parse(readFileSync(file, "utf8").replace(/^\ufeff/, "")) }; }
  catch (e) { return { error: `${file}: ${e.code ?? e.message}` }; }
}

function report(errors) {
  for (const e of errors) process.stderr.write(`error   ${e.at.replace(/[\x00-\x1f\x7f-\x9f]/g, "?")}: ${e.message}\n`);
}

export function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: { json: { type: "boolean" }, header: { type: "string" }, help: { type: "boolean", short: "h" } } });
  } catch (e) {
    return fail(e.message);
  }
  const { values: o, positionals: [cmd, file] } = parsed;
  if (!cmd || o.help) { out(USAGE + "\n"); return cmd || o.help ? 0 : 2; }
  if (!file) return fail(`${cmd} needs a file\n\n${USAGE}`);

  if (cmd === "validate" || cmd === "summary") {
    const { value, error } = readJson(file);
    if (error) return fail(error, 1);
    const errors = validateLedger(value);
    if (errors.length) { report(errors); return fail(`${file}: INVALID (${errors.length} error${errors.length === 1 ? "" : "s"})`, 1); }
    if (cmd === "validate") { out(`${file}: valid - ${value.entries.length} entries, ${value.sources.length} sources\n`); return 0; }
    const s = summarize(value);
    out(o.json ? JSON.stringify(s, null, 2) + "\n" : s.statement + "\n");
    return 0;
  }

  if (cmd === "csv2json") {
    if (!o.header) return fail("csv2json needs --header HEADER.json");
    const h = readJson(o.header);
    if (h.error) return fail(h.error, 1);
    let entries;
    try { entries = entriesFromCsv(readFileSync(file, "utf8")); }
    catch (e) { return fail(`${file}: ${e.code ?? e.message}`, 1); }
    const ledger = { ...h.value, entries };
    const errors = validateLedger(ledger);
    if (errors.length) { report(errors); return fail("the combined ledger is invalid; nothing written", 1); }
    out(JSON.stringify(ledger, null, 2) + "\n");
    return 0;
  }
  return fail(`unknown command "${cmd}"\n\n${USAGE}`);
}

const invoked = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (invoked) process.exitCode = main(process.argv.slice(2));
