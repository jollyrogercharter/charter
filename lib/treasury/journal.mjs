// The Quartermaster treasury journal (qmt 0.1): append-only JSON Lines, hash-chained, double-entry, one commodity balance per transaction.
import { privacyScan } from "../jrc/core.mjs";
import { addressToScript } from "./bitcoin/address.mjs";
import { parseTx } from "./bitcoin/tx.mjs";
import { canonical, recordLeaf } from "./merkle.mjs";
import { COMMODITIES, convert, isRate } from "./money.mjs";

export const QMT_VERSION = "0.1";
export const GENESIS_PREV = "0".repeat(64);
export const ACCOUNT_KINDS = ["asset", "liability", "equity", "income", "expense"];
export const SOURCE_KINDS = {
  "apple-financial-report": "provider-document", btcpay: "provider-document", "bank-statement": "provider-document", "exchange-statement": "provider-document", "provider-dashboard": "provider-document",
  invoice: "provider-document", receipt: "provider-document", "price-feed": "provider-document", chain: "chain-proof", manual: "self-reported", estimate: "estimate",
};
export const TX_KINDS = ["sale", "donation", "refund", "revenue-adjustment", "settlement", "transfer", "conversion", "deposit", "withdrawal", "expense", "adjustment", "reversal"];
const INCOME_KINDS = new Set(["sale", "donation", "refund", "revenue-adjustment", "reversal"]);
const PRIVACY = ["public", "aggregated", "committed"];
const ID = /^[a-z0-9][a-z0-9.:_-]{0,79}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const HEX64 = /^[0-9a-f]{64}$/;
const MAX_LINE = 64 * 1024, MAX_RECORDS = 200000;
// Never publish billing identifiers or key material; amounts and txids are fine.
const FORBIDDEN = [
  [/\b(?:xprv|tprv|yprv|zprv|Yprv|Zprv|uprv|vprv)[1-9A-HJ-NP-Za-km-z]{100,}/, "extended private key"],
  [/\b[5KLc9][1-9A-HJ-NP-Za-km-z]{50,51}\b/, "WIF private key"],
  [/\b(?:invoice|inv|acct|account|routing|iban)[\s#:-]*(?=[A-Z0-9]*\d)[A-Z0-9]{5,}\b/i, "billing or account identifier"],
  [/\b(?:\d[ -]?){13,19}\b/, "card or account number"],
];

export function parseJournal(text) {
  if (typeof text !== "string") throw new TypeError("journal must be text");
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length > MAX_RECORDS) throw new RangeError(`journals over ${MAX_RECORDS} records aren't accepted`);
  return lines.map((line, i) => {
    if (line.length > MAX_LINE) throw new RangeError(`line ${i + 1} is over ${MAX_LINE} characters`);
    let r;
    try { r = JSON.parse(line); } catch { throw new SyntaxError(`line ${i + 1} is not valid JSON`); }
    if (!r || typeof r !== "object" || Array.isArray(r)) throw new TypeError(`line ${i + 1} must be a JSON object`);
    return r;
  });
}

export const serializeJournal = (records) => records.map((r) => canonical(r)).join("\n") + "\n";

// Appends records, filling in seq and prev so the chain stays intact.
export function appendRecords(records, additions) {
  const out = [...records];
  for (const a of additions) {
    const { seq: _s, prev: _p, ...rest } = a;
    out.push({ seq: out.length + 1, prev: out.length ? recordLeaf(out.at(-1)) : GENESIS_PREV, ...rest });
  }
  return out;
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v, max = 500) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function validateJournal(records) {
  const errors = [];
  const err = (seq, at, message) => { if (errors.length < 200) errors.push({ seq, at, message }); };
  const byId = new Map(), accounts = new Map(), sources = new Map(), prices = new Map(), proofs = new Map(), reversed = new Set();
  let header = null;
  records.forEach((r, i) => {
    const seq = i + 1;
    if (r.type === "commitment") {
      if (r.seq !== seq) err(seq, "seq", `expected ${seq}`);
      if (!HEX64.test(r.leaf ?? "")) err(seq, "leaf", "a commitment carries the record's 64-hex leaf hash");
      return;
    }
    if (r.seq !== seq) err(seq, "seq", `expected ${seq}`);
    const expectedPrev = i === 0 ? GENESIS_PREV : leafOf(records[i - 1]);
    if (r.prev !== expectedPrev) err(seq, "prev", "doesn't match the previous record's leaf hash: the journal was edited, reordered or truncated");
    if (!(typeof r.id === "string" && ID.test(r.id))) return err(seq, "id", "required: lowercase letters, digits and . : _ -");
    if (byId.has(r.id)) return err(seq, "id", `duplicate id "${r.id}"`);
    byId.set(r.id, r);
    if (r.simulated !== undefined && typeof r.simulated !== "boolean") err(seq, "simulated", "must be true or false");
    if (i === 0) {
      if (r.type !== "journal") return err(seq, "type", "the first record must be the journal header");
      if (r.qmt !== QMT_VERSION) err(seq, "qmt", `must be "${QMT_VERSION}"`);
      if (!str(r.entity, 200)) err(seq, "entity", "required");
      if (!(r.base_currency in COMMODITIES) || r.base_currency === "BTC") err(seq, "base_currency", "a fiat ISO 4217 code this version supports");
      header = r;
      return;
    }
    if (header?.simulated && r.simulated !== true) err(seq, "simulated", "every record in a simulated journal must say simulated: true");
    if (!header?.simulated && r.simulated === true) err(seq, "simulated", "simulated records can't appear in a real journal");
    switch (r.type) {
      case "account": return checkAccount(r, seq, err, accounts);
      case "source": return checkSource(r, seq, err, sources);
      case "price": return checkPrice(r, seq, err, prices, sources);
      case "chain_proof": return checkProof(r, seq, err, proofs, sources);
      case "transaction": return checkTransaction(r, seq, err, { accounts, sources, prices, proofs, byId, reversed });
      case "attention": return checkAttention(r, seq, err);
      case "review": return checkReview(r, seq, err, byId);
      default: return err(seq, "type", `unknown record type "${String(r.type).slice(0, 40)}"`);
    }
  });
  records.forEach((r, i) => {
    if (r.type === "commitment") return;
    for (const h of privacyScan(r)) err(i + 1, h.at, `looks like a ${h.kind}`);
    for (const [at, s] of strings(r)) for (const [re, kind] of FORBIDDEN) if (!/(?:_hex|^\$\.(?:merkle|txid|prev|leaf|salt))/.test(at) && re.test(s)) err(i + 1, at, `looks like a ${kind}`);
  });
  return errors;
}

export const leafOf = (r) => (r?.type === "commitment" ? r.leaf : recordLeaf(r));

function strings(v, at = "$", out = []) {
  if (typeof v === "string") out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}[${i}]`, out));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) strings(x, `${at}.${k}`, out);
  return out;
}

function checkAccount(r, seq, err, accounts) {
  if (!ACCOUNT_KINDS.includes(r.kind)) err(seq, "kind", `one of ${ACCOUNT_KINDS.join(", ")}`);
  if (!(r.commodity in COMMODITIES)) err(seq, "commodity", `one of ${Object.keys(COMMODITIES).join(", ")}`);
  if (!str(r.description, 300)) err(seq, "description", "required");
  if (r.fee !== undefined && (r.fee !== true || r.kind !== "expense")) err(seq, "fee", "only expense accounts can be fee accounts");
  if (r.conversion !== undefined && (r.conversion !== true || r.kind !== "equity")) err(seq, "conversion", "only equity accounts can be conversion accounts");
  if (r.onchain !== undefined) {
    if (r.kind !== "asset" || r.commodity !== "BTC") err(seq, "onchain", "only BTC asset accounts are on-chain");
    else if (!isObj(r.onchain) || !["mainnet", "testnet", "regtest"].includes(r.onchain.network) || !Array.isArray(r.onchain.addresses) || !r.onchain.addresses.length || r.onchain.addresses.length > 500) err(seq, "onchain", "needs network and 1-500 watch-only addresses");
    else for (const a of r.onchain.addresses) { try { addressToScript(a, r.onchain.network); } catch (e) { err(seq, "onchain.addresses", `${String(a).slice(0, 90)}: ${e.message}`); } }
  }
  accounts.set(r.id, r);
}

function checkSource(r, seq, err, sources) {
  if (!(r.kind in SOURCE_KINDS)) err(seq, "kind", `one of ${Object.keys(SOURCE_KINDS).join(", ")}`);
  if (!str(r.description, 500)) err(seq, "description", "required");
  if (typeof r.operator_supplied !== "boolean") err(seq, "operator_supplied", "required: true when only the operator holds this document");
  if (r.document_sha256 !== undefined && !HEX64.test(r.document_sha256)) err(seq, "document_sha256", "64 lowercase hex");
  if (!UTC.test(r.retrieved_at ?? "")) err(seq, "retrieved_at", "UTC timestamp, e.g. 2026-10-19T12:00:00Z");
  if (r.url !== undefined && !/^https:\/\/\S{1,500}$/.test(r.url)) err(seq, "url", "an https URL");
  sources.set(r.id, r);
}

function checkPrice(r, seq, err, prices, sources) {
  if (!(r.base in COMMODITIES) || !(r.quote in COMMODITIES) || r.base === r.quote) err(seq, "base/quote", "two different supported commodities");
  if (!isRate(r.rate)) err(seq, "rate", "a positive decimal string, e.g. \"65432.10\"");
  if (!UTC.test(r.at ?? "")) err(seq, "at", "UTC timestamp");
  if (!sources.has(r.source)) err(seq, "source", "must reference an earlier source");
  prices.set(r.id, r);
}

function checkProof(r, seq, err, proofs, sources) {
  if (!["mainnet", "testnet", "regtest"].includes(r.network)) err(seq, "network", "mainnet, testnet or regtest");
  if (!sources.has(r.source) || sources.get(r.source).kind !== "chain") err(seq, "source", "must reference an earlier source of kind chain");
  try {
    const tx = parseTx(r.tx_hex);
    if (tx.txid !== r.txid) err(seq, "txid", `doesn't match the transaction bytes (${tx.txid})`);
    r = { ...r, _tx: tx };
  } catch (e) { return err(seq, "tx_hex", e.message); }
  proofs.set(r.id, r);
}

function checkTransaction(r, seq, err, ctx) {
  if (!TX_KINDS.includes(r.kind)) err(seq, "kind", `one of ${TX_KINDS.join(", ")}`);
  if (!UTC.test(r.occurred_at ?? "")) err(seq, "occurred_at", "UTC timestamp");
  if (!str(r.description, 300)) err(seq, "description", "required");
  if (!["posted", "pending"].includes(r.status)) err(seq, "status", "posted or pending");
  if (!PRIVACY.includes(r.privacy)) err(seq, "privacy", `one of ${PRIVACY.join(", ")}`);
  if (r.privacy === "committed" && !HEX64.test(r.salt ?? "")) err(seq, "salt", "committed records need a random 32-byte hex salt, or their leaf hash can be guessed");
  if (r.privacy === "aggregated" && !(Number.isInteger(r.count) && r.count >= 1)) err(seq, "count", "aggregated records say how many items they combine");
  if (!Array.isArray(r.postings) || r.postings.length < 2 || r.postings.length > 50) return err(seq, "postings", "2 to 50 postings");
  const sums = new Map();
  let touchesIncome = false;
  r.postings.forEach((p, j) => {
    const at = `postings[${j}]`;
    const acct = ctx.accounts.get(p.account);
    if (!acct) return err(seq, `${at}.account`, "must reference an earlier account");
    if (p.commodity !== acct.commodity) err(seq, `${at}.commodity`, `account ${acct.id} holds ${acct.commodity}`);
    if (!Number.isSafeInteger(p.amount) || p.amount === 0) err(seq, `${at}.amount`, "a non-zero integer in minor units (cents, sats)");
    sums.set(p.commodity, (sums.get(p.commodity) ?? 0) + (Number.isSafeInteger(p.amount) ? p.amount : 0));
    if (acct.kind === "income") touchesIncome = true;
    if (p.evidence !== undefined) {
      const src = ctx.sources.get(p.evidence?.source);
      if (!src) err(seq, `${at}.evidence.source`, "must reference an earlier source");
      else if (src.kind === "chain" && !acct.onchain && !(acct.fee && acct.commodity === "BTC" && r.chain_proof)) err(seq, `${at}.evidence`, "chain evidence can only support a posting to an on-chain account (or that transaction's network fee); an off-chain movement is never blockchain-verified");
      if (p.evidence?.ref !== undefined && !str(p.evidence.ref, 200)) err(seq, `${at}.evidence.ref`, "a short reference such as a report row or txid");
    } else if (r.status === "posted" && r.kind !== "reversal" && !acct.conversion) err(seq, `${at}.evidence`, "posted entries cite evidence for every posting (use a manual or estimate source when that's all there is)");
    if (p.value !== undefined) {
      const price = ctx.prices.get(p.value?.price);
      if (!price) err(seq, `${at}.value.price`, "must reference an earlier price");
      else if (price.base !== p.commodity || price.quote !== p.value.commodity) err(seq, `${at}.value`, `price ${price.id} is ${price.base}/${price.quote}`);
      else if (p.value.amount !== convert(p.amount, p.commodity, p.value.commodity, price.rate)) err(seq, `${at}.value.amount`, `must equal amount x rate, rounded: ${convert(p.amount, p.commodity, p.value.commodity, price.rate)}`);
    }
  });
  for (const [c, s] of sums) if (s !== 0) err(seq, "postings", `${c} doesn't balance (off by ${s} minor units)`);
  if (sums.size > 1 && !["conversion", "reversal", "settlement"].includes(r.kind)) err(seq, "kind", "only conversion and settlement entries mix commodities");
  if (sums.size > 1 && r.kind !== "reversal" && !r.postings.some((p) => ctx.accounts.get(p.account)?.conversion)) err(seq, "postings", "mixed-commodity entries go through a conversion account so each commodity balances on its own");
  if (touchesIncome && !INCOME_KINDS.has(r.kind)) err(seq, "kind", `${r.kind} entries can't touch income: transfers and conversions are never revenue`);
  if (r.follows !== undefined && (!Array.isArray(r.follows) || r.follows.length > 10 || r.follows.some((id) => ctx.byId.get(id)?.type !== "transaction" || ctx.byId.get(id).seq >= seq))) err(seq, "follows", "earlier transaction ids this one continues (for flow and delay reports)");
  if (r.kind === "reversal") {
    const orig = ctx.byId.get(r.reverses);
    if (!orig || orig.type !== "transaction" || orig.seq >= seq) err(seq, "reverses", "must reference an earlier transaction");
    else if (ctx.reversed.has(orig.id)) err(seq, "reverses", `${orig.id} is already reversed`);
    else {
      ctx.reversed.add(orig.id);
      const key = (ps, sign) => ps.map((p) => `${p.account}|${p.commodity}|${sign * p.amount}`).sort().join(";");
      if (key(r.postings, 1) !== key(orig.postings, -1)) err(seq, "postings", "a reversal negates the original postings exactly");
    }
  } else if (r.reverses !== undefined) err(seq, "reverses", "only reversal entries reverse");
  if (r.chain_proof !== undefined) {
    const proof = ctx.proofs.get(r.chain_proof);
    if (!proof) err(seq, "chain_proof", "must reference an earlier chain_proof");
    else checkProofAmounts(r, proof, ctx, seq, err);
  } else if (r.postings.some((p) => ctx.sources.get(p.evidence?.source)?.kind === "chain")) err(seq, "chain_proof", "chain evidence needs a chain_proof record");
}

// An inflow to an on-chain account must equal what the proven transaction pays to that account's addresses.
function checkProofAmounts(r, proof, ctx, seq, err) {
  for (const p of r.postings) {
    const acct = ctx.accounts.get(p.account);
    if (!acct?.onchain || ctx.sources.get(p.evidence?.source)?.kind !== "chain" || p.amount < 0) continue;
    if (acct.onchain.network !== proof.network) { err(seq, "chain_proof", `proof is on ${proof.network}, account on ${acct.onchain.network}`); continue; }
    const scripts = new Set(acct.onchain.addresses.map((a) => addressToScript(a, proof.network)));
    const paid = proof._tx.outputs.filter((o) => scripts.has(o.script)).reduce((n, o) => n + o.value_sats, 0);
    if (paid !== p.amount) err(seq, "chain_proof", `transaction pays ${paid} sats to ${acct.id}, posting says ${p.amount}`);
  }
}

function checkAttention(r, seq, err) {
  if (!str(r.role, 100)) err(seq, "role", "who spent the time, as a role, not a name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.period_start ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(r.period_end ?? "") || r.period_end < r.period_start) err(seq, "period", "period_start and period_end as YYYY-MM-DD");
  if (!(r.minutes === null || (Number.isInteger(r.minutes) && r.minutes >= 0 && r.minutes <= 6000000))) err(seq, "minutes", "whole minutes, or null for unmeasured");
  if (r.amount !== undefined && !str(r.valuation_method, 300)) err(seq, "valuation_method", "a money value for time needs a published valuation method");
  if (r.postings !== undefined) err(seq, "postings", "attention is never posted to the cash books");
}

function checkReview(r, seq, err, byId) {
  if (!str(r.reviewer, 100)) err(seq, "reviewer", "required");
  if (typeof r.affiliated !== "boolean") err(seq, "affiliated", "required: whether the reviewer is affiliated with the operator");
  if (!/^https:\/\/\S{1,500}$/.test(r.statement_uri ?? "")) err(seq, "statement_uri", "where the reviewer published their own statement (https)");
  if (!["agrees", "disagrees", "partial"].includes(r.result)) err(seq, "result", "agrees, disagrees or partial");
  if (!Array.isArray(r.covers) || !r.covers.length || r.covers.some((id) => byId.get(id)?.type !== "transaction")) err(seq, "covers", "earlier transaction ids");
}
