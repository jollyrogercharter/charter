// Bank and exchange CSV statements, read through a declared column profile. There's no US standard bank CSV, so nothing is guessed.
import { parseCsv } from "../../qm/expenses.mjs";
import { parseDecimal } from "./apple.mjs";

export const PROFILES = {
  // Column names as reported for common US bank exports; confirm against your own file before relying on one.
  "generic-signed": { date: "Date", description: "Description", amount: "Amount", date_format: "YYYY-MM-DD", currency: "USD" },
  "generic-debit-credit": { date: "Date", description: "Description", debit: "Debit", credit: "Credit", date_format: "MM/DD/YYYY", currency: "USD" },
  // Kraken ledgers.csv, per Kraken's "How to interpret Ledger history fields" (2026-10-06).
  "kraken-ledgers": { date: "time", description: "type", amount: "amount", fee: "fee", asset: "asset", ref: "refid", txid_column: "txid", date_format: "YYYY-MM-DD hh:mm:ss", kind: "subtype" },
};
const ASSETS = { XBT: "BTC", XXBT: "BTC", BTC: "BTC", ZUSD: "USD", USD: "USD", EUR: "EUR", ZEUR: "EUR" };
const MAX_ROWS = 100000;

function parseDate(s, fmt) {
  const t = String(s).trim();
  let m;
  if (fmt === "YYYY-MM-DD" && (m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) return `${m[1]}-${m[2]}-${m[3]}T00:00:00Z`;
  if (fmt === "MM/DD/YYYY" && (m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t))) return `${m[3]}-${m[1]}-${m[2]}T00:00:00Z`;
  if (fmt === "YYYY-MM-DD hh:mm:ss" && (m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?$/.exec(t))) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  return null;
}

// Accepts "1,234.56", "$1,234.56", "(12.00)" and "-12.00".
function money(s, currency) {
  let t = String(s ?? "").trim().replace(/[$,\s]/g, "");
  if (t === "") return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  const v = parseDecimal(t, currency);
  return neg ? -v : v;
}

export function parseStatement(text, profileOrName) {
  const p = typeof profileOrName === "string" ? PROFILES[profileOrName] : profileOrName;
  if (!p) throw new RangeError("unknown statement profile");
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new RangeError("empty CSV");
  if (rows.length > MAX_ROWS) throw new RangeError(`statements over ${MAX_ROWS} rows aren't accepted`);
  const col = (name) => (name ? header.findIndex((h) => h.trim() === name) : -1);
  const need = [p.date, p.description, ...(p.amount ? [p.amount] : [p.debit, p.credit])];
  const missing = need.filter((n) => col(n) < 0);
  if (missing.length) throw new RangeError(`CSV lacks the profile's columns: ${missing.join(", ")}`);
  const out = [], issues = [];
  rows.forEach((r, i) => {
    const line = i + 2;
    try {
      const at = parseDate(r[col(p.date)], p.date_format);
      if (!at) throw new RangeError(`date isn't ${p.date_format}`);
      const asset = p.asset ? ASSETS[String(r[col(p.asset)]).trim().toUpperCase()] : p.currency;
      if (!asset) throw new RangeError(`unsupported asset "${String(r[col(p.asset)]).slice(0, 10)}"`);
      const amt = p.amount ? money(r[col(p.amount)], asset) : (money(r[col(p.credit)], asset) ?? 0) - (money(r[col(p.debit)], asset) ?? 0);
      if (amt === null) throw new RangeError("no amount");
      out.push({
        line, at, asset, amount: amt, fee: p.fee ? money(r[col(p.fee)], asset) ?? 0 : 0,
        description: String(r[col(p.description)] ?? "").trim().slice(0, 200),
        ...(p.kind ? { subtype: String(r[col(p.kind)] ?? "").trim().slice(0, 40) } : {}),
        ...(p.ref ? { ref: String(r[col(p.ref)] ?? "").trim().slice(0, 80) } : {}),
      });
    } catch (e) { issues.push({ line, issue: e.message }); }
  });
  return { rows: out, issues };
}

// Rules the operator writes: the first whose pattern matches a row's description decides the counter-account. Unmatched rows are listed, never booked.
export function statementProposals(parsed, { account, source, rules = [], idPrefix, simulated }) {
  const proposals = [], unmatched = [];
  for (const row of parsed.rows) {
    const rule = rules.find((r) => new RegExp(r.match, "i").test(row.description) && (r.sign === undefined || Math.sign(row.amount) === r.sign));
    if (!rule) { unmatched.push({ line: row.line, at: row.at, amount: row.amount, asset: row.asset }); continue; }
    const ref = `statement line ${row.line}`;
    const postings = [
      { account, amount: row.amount - row.fee, commodity: row.asset, evidence: { source, ref } },
      { account: rule.counter, amount: -row.amount, commodity: row.asset, ...(rule.counter_evidence ? { evidence: rule.counter_evidence } : {}) },
      ...(row.fee ? [{ account: rule.fee_account, amount: row.fee, commodity: row.asset, evidence: { source, ref } }] : []),
    ];
    proposals.push({ type: "transaction", id: `${idPrefix}-${row.line}`, kind: rule.kind, status: "posted", occurred_at: row.at, description: rule.description ?? row.description, privacy: rule.privacy ?? "public", postings, ...(simulated ? { simulated: true } : {}) });
  }
  return { proposals, unmatched, issues: parsed.issues };
}

// A trade appears as one row per asset sharing a reference; together they become one conversion through the conversion accounts.
export function tradeProposals(parsed, { accounts, conversion, feeAccounts, source, tradeType = "trade", idPrefix, simulated }) {
  const groups = new Map();
  for (const r of parsed.rows) if (r.description === tradeType && r.ref) groups.set(r.ref, [...(groups.get(r.ref) ?? []), r]);
  const proposals = [], issues = [];
  for (const [ref, rows] of groups) {
    if (rows.length !== 2 || rows[0].asset === rows[1].asset) { issues.push({ ref, issue: "a trade needs exactly two rows in different assets" }); continue; }
    const postings = rows.flatMap((r) => [
      { account: accounts[r.asset], amount: r.amount - r.fee, commodity: r.asset, evidence: { source, ref: `statement line ${r.line}` } },
      { account: conversion[r.asset], amount: -r.amount, commodity: r.asset },
      ...(r.fee ? [{ account: feeAccounts[r.asset], amount: r.fee, commodity: r.asset, evidence: { source, ref: `statement line ${r.line}` } }] : []),
    ]);
    proposals.push({ type: "transaction", id: `${idPrefix}-${ref.toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 80), kind: "conversion", status: "posted", occurred_at: rows[0].at, description: `Exchange trade ${rows.map((r) => r.asset).join("/")}`, privacy: "public", postings, ...(simulated ? { simulated: true } : {}) });
  }
  return { proposals, issues };
}
