import { privacyScan } from "../jrc/core.mjs";

export const QM_VERSION = "0.1";
export const CATEGORIES = {
  cash: "Money actually paid or billed",
  forecast: "Expected future spending; not yet billed",
  reserve: "Money set aside; not spent",
  "donated-labor": "Unpaid contributor time (noncash)",
  "user-attention": "Time users spend because of the software (noncash)",
};
const MONEY = ["cash", "forecast", "reserve"];
const NONCASH = ["donated-labor", "user-attention"];
const RECURRENCE = ["one-time", "monthly", "yearly"];
const PRIVACY_CLASSES = ["public", "aggregated", "redacted"];
const SOURCE_KINDS = ["invoice", "registrar", "provider-dashboard", "provider-api", "manual", "estimate"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
// Billing identifiers that must never be published: invoice numbers and long card/account digit runs.
const BILLING = [/\bIN-\d{6,}\b/i, /\b(?:invoice|inv|acct|account)[\s#:-]*\d{5,}\b/i, /\b(?:\d[ -]?){13,19}\b/];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isNum = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function only(o, keys, at, errors) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) errors.push({ at: `${at}.${k}`, message: "unknown property" });
}

export function validateLedger(l) {
  const errors = [];
  const err = (at, message) => errors.push({ at, message });
  if (!isObj(l)) return [{ at: "$", message: "ledger must be a JSON object" }];
  only(l, ["$schema", "qm", "project", "currency", "as_of_utc", "note", "sources", "entries"], "$", errors);
  if (l.qm !== QM_VERSION) err("$.qm", `must be "${QM_VERSION}"`);
  if (!isStr(l.project)) err("$.project", "required string");
  if (!(typeof l.currency === "string" && /^[A-Z]{3}$/.test(l.currency))) err("$.currency", "required ISO 4217 code, e.g. USD");
  if (!(typeof l.as_of_utc === "string" && UTC.test(l.as_of_utc))) err("$.as_of_utc", "required UTC timestamp, e.g. 2026-10-18T05:00Z");
  if (l.note !== undefined && !isStr(l.note)) err("$.note", "must be a non-empty string");

  const sourceIds = new Set();
  if (!Array.isArray(l.sources)) err("$.sources", "required array");
  else l.sources.forEach((s, i) => {
    const at = `$.sources[${i}]`;
    if (!isObj(s)) return err(at, "must be an object");
    only(s, ["id", "kind", "description", "retrieved_utc", "url"], at, errors);
    if (!(typeof s.id === "string" && ID.test(s.id))) err(`${at}.id`, "required id");
    else if (sourceIds.has(s.id)) err(`${at}.id`, `duplicate source id "${s.id}"`);
    else sourceIds.add(s.id);
    if (!SOURCE_KINDS.includes(s.kind)) err(`${at}.kind`, `must be one of ${SOURCE_KINDS.join(", ")}`);
    if (!isStr(s.description)) err(`${at}.description`, "required string");
    if (!(typeof s.retrieved_utc === "string" && UTC.test(s.retrieved_utc))) err(`${at}.retrieved_utc`, "required UTC timestamp");
    if (s.url !== undefined && !(typeof s.url === "string" && /^https:\/\/\S+$/.test(s.url))) err(`${at}.url`, "must be an https URL");
  });

  const ids = new Set();
  if (!Array.isArray(l.entries)) err("$.entries", "required array");
  else l.entries.forEach((e, i) => {
    const at = `$.entries[${i}]`;
    if (!isObj(e)) return err(at, "must be an object");
    only(e, ["id", "category", "item", "provider", "amount", "hours", "valuation_method", "date", "period_end", "recurrence", "status", "source", "attribution", "privacy"], at, errors);
    if (!(typeof e.id === "string" && ID.test(e.id))) err(`${at}.id`, "required id");
    else if (ids.has(e.id)) err(`${at}.id`, `duplicate entry id "${e.id}"`);
    else ids.add(e.id);
    if (!(e.category in CATEGORIES)) return err(`${at}.category`, `must be one of ${Object.keys(CATEGORIES).join(", ")}`);
    if (!isStr(e.item)) err(`${at}.item`, "required string");
    if (!isStr(e.status)) err(`${at}.status`, "required string");
    if (!isStr(e.provider)) err(`${at}.provider`, "required string (use \"none\" if not applicable)");
    if (!("amount" in e) || !(e.amount === null || isNum(e.amount))) err(`${at}.amount`, "required: a non-negative number, or null for unknown (never 0 for unknown)");
    if (MONEY.includes(e.category) && e.hours !== undefined) err(`${at}.hours`, "hours belong only on noncash entries");
    if (NONCASH.includes(e.category)) {
      if (!("hours" in e) || !(e.hours === null || isNum(e.hours))) err(`${at}.hours`, "required on noncash entries: a number, or null for unmeasured");
      if (e.amount !== null && e.amount !== undefined && !isStr(e.valuation_method)) err(`${at}.valuation_method`, "a monetary value for noncash time needs a published valuation method");
    } else if (e.valuation_method !== undefined) err(`${at}.valuation_method`, "only noncash entries carry a valuation method");
    if (e.date !== undefined && !(typeof e.date === "string" && DATE.test(e.date))) err(`${at}.date`, "must be YYYY-MM-DD");
    if (e.period_end !== undefined && !(typeof e.period_end === "string" && DATE.test(e.period_end) && (!e.date || e.period_end >= e.date))) err(`${at}.period_end`, "must be YYYY-MM-DD on or after date");
    if (e.recurrence !== undefined && !RECURRENCE.includes(e.recurrence)) err(`${at}.recurrence`, `must be one of ${RECURRENCE.join(", ")}`);
    if (!sourceIds.has(e.source)) err(`${at}.source`, "must reference a declared source id");
    if (!PRIVACY_CLASSES.includes(e.privacy)) err(`${at}.privacy`, `must be one of ${PRIVACY_CLASSES.join(", ")}`);
    if (e.attribution !== undefined && !isStr(e.attribution)) err(`${at}.attribution`, "must be a non-empty string");
    if (e.category === "cash" && e.amount !== null && Array.isArray(l.sources) && l.sources.find((s) => s.id === e.source)?.kind === "estimate") {
      err(`${at}.source`, "a cash amount can't come from an estimate; use category forecast");
    }
  });

  for (const h of privacyScan(l)) err(h.at, `looks like a ${h.kind}; published ledgers must not carry it`);
  for (const [at, s] of collect(l)) if (BILLING.some((re) => re.test(s))) err(at, "looks like an invoice, account or card number; publish amounts, not billing identifiers");
  return errors;
}

function collect(v, at = "$", out = []) {
  if (typeof v === "string") out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => collect(x, `${at}[${i}]`, out));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) collect(x, `${at}.${k}`, out);
  return out;
}

const round = (n) => Math.round(n * 100) / 100;

// Totals per category; unknown amounts are counted, never treated as zero, and noncash is never added to money.
export function summarize(l) {
  const by = {};
  for (const c of Object.keys(CATEGORIES)) by[c] = { entries: 0, known_amount: 0, unknown_amounts: 0, known_hours: 0, unmeasured_hours: 0 };
  for (const e of l.entries) {
    const b = by[e.category];
    b.entries++;
    if (e.amount === null || e.amount === undefined) b.unknown_amounts++;
    else b.known_amount = round(b.known_amount + e.amount);
    if (NONCASH.includes(e.category)) {
      if (e.hours === null) b.unmeasured_hours++;
      else b.known_hours = round(b.known_hours + e.hours);
    }
  }
  return {
    currency: l.currency,
    as_of_utc: l.as_of_utc,
    categories: by,
    cash_known_total: by.cash.known_amount,
    cash_unknown_entries: by.cash.unknown_amounts,
    statement: `${l.currency} ${by.cash.known_amount.toFixed(2)} known cash spending${by.cash.unknown_amounts ? `, plus ${by.cash.unknown_amounts} cash item(s) of unknown amount` : ""}. Forecasts, reserves and noncash time are reported separately and not added in.`,
  };
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  const s = text.replace(/^\ufeff/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (q) throw new Error("unterminated quoted field");
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

const CSV_COLUMNS = ["id", "category", "item", "provider", "amount", "hours", "valuation_method", "date", "period_end", "recurrence", "status", "source", "attribution", "privacy"];

export function entriesFromCsv(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("empty CSV");
  const cols = header.map((h) => h.trim());
  const unknown = cols.filter((c) => !CSV_COLUMNS.includes(c));
  if (unknown.length) throw new Error(`unknown CSV column(s): ${unknown.join(", ")}`);
  return rows.map((r, n) => {
    if (r.length !== cols.length) throw new Error(`row ${n + 2}: expected ${cols.length} fields, got ${r.length}`);
    const e = {};
    cols.forEach((c, i) => {
      const v = r[i].trim();
      if (c === "amount" || c === "hours") {
        if (v === "" || /^unknown$/i.test(v)) e[c] = null;
        else if (/^\d+(\.\d+)?$/.test(v)) e[c] = Number(v);
        else throw new Error(`row ${n + 2}: ${c} "${v}" is not a non-negative number or "unknown"`);
      } else if (v !== "") e[c] = v;
    });
    if (!["donated-labor", "user-attention"].includes(e.category)) delete e.hours;
    return e;
  });
}
