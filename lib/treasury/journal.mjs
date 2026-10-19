// The Quartermaster treasury journal (qmt 0.1): append-only JSON Lines, hash-chained, double-entry, one commodity balance per transaction.
import { privacyScan } from "../jrc/core.mjs";
import { addressToScript } from "./bitcoin/address.mjs";
import { verifyTxProof } from "./bitcoin/spv.mjs";
import { parseTx } from "./bitcoin/tx.mjs";
import { canonical, recordLeaf } from "./merkle.mjs";
import { COMMODITIES, convert, isRate } from "./money.mjs";

export const QMT_VERSION = "0.1";
export const GENESIS_PREV = "0".repeat(64);
export const ACCOUNT_KINDS = ["asset", "liability", "equity", "income", "expense"];
export const SOURCE_KINDS = Object.freeze(Object.assign(Object.create(null), {
  "apple-financial-report": "provider-document", btcpay: "provider-document", "bank-statement": "provider-document", "exchange-statement": "provider-document", "provider-dashboard": "provider-document",
  invoice: "provider-document", receipt: "provider-document", "price-feed": "provider-document", chain: "chain-proof", manual: "self-reported", estimate: "estimate",
}));
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
  [/\b(?:xpub|tpub|ypub|zpub|Ypub|Zpub|upub|vpub)[1-9A-HJ-NP-Za-km-z]{100,}/, "extended public key (it reveals every address the wallet will ever use)"],
  [/\b[5KLc9][1-9A-HJ-NP-Za-km-z]{50,51}\b/, "WIF private key"],
  [/\b(?:invoice|inv|acct|account|routing|iban|aba|rtn)(?:\s*(?:no|number|num|#)\.?)?[\s#:.-]*(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{4,}\b/i, "billing or account identifier"],
  [/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}\s?[A-Z0-9]{1,4}\b/, "IBAN"],
  [/\b(?:\d[ -]?){13,19}\b/, "card or account number"],
  [/\b\d{3}-\d{2}-\d{4}\b|\b\d{2}-\d{7}\b/, "SSN or EIN"],
  [/(?:\+1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, "phone number"],
];
// Fields that hold hashes or transaction bytes, where long digit runs are expected.
const HASH_FIELDS = /^\$\.(?:tx_hex|header_hex|txid|prev|leaf|salt|document_sha256|merkle\[\d+\])$/;
const HASHLIKE = /^[0-9a-f]{64}$/;

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
  const byId = new Map(), accounts = new Map(), sources = new Map(), prices = new Map(), proofs = new Map(), reversed = new Set(), salts = new Set(), retired = new Set(), txids = new Set(), networks = new Set(), addressOwner = new Map(), usedProofs = new Set();
  let header = null;
  records.forEach((r, i) => {
    const seq = i + 1;
    if (r.type === "commitment") {
      if (r.seq !== seq) err(seq, "seq", `expected ${seq}`);
      if (!HEX64.test(r.leaf ?? "")) err(seq, "leaf", "a commitment carries the record's 64-hex leaf hash");
      if (Object.keys(r).some((k) => !["seq", "type", "leaf"].includes(k))) err(seq, "commitment", "a commitment holds only seq, type and leaf");
      return;
    }
    if (r.seq !== seq) err(seq, "seq", `expected ${seq}`);
    const expectedPrev = i === 0 ? GENESIS_PREV : leafOf(records[i - 1]);
    if (r.prev !== expectedPrev) err(seq, "prev", "doesn't match the previous record's leaf hash: the journal was edited, reordered or truncated");
    if (!(typeof r.id === "string" && ID.test(r.id)) || r.id in Object.prototype) return err(seq, "id", "required: lowercase letters, digits and . : _ - (and not a reserved name such as constructor)");
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
      case "account": return checkAccount(r, seq, err, accounts, addressOwner, networks, header);
      case "source": return checkSource(r, seq, err, sources);
      case "price": return checkPrice(r, seq, err, prices, sources);
      case "chain_proof": return checkProof(r, seq, err, proofs, sources, txids, networks);
      case "transaction": return checkTransaction(r, seq, err, { accounts, sources, prices, proofs, byId, reversed, salts, retired, usedProofs });
      case "attention": return checkAttention(r, seq, err);
      case "review": return checkReview(r, seq, err, byId);
      default: return err(seq, "type", `unknown record type "${String(r.type).slice(0, 40)}"`);
    }
  });
  records.forEach((r, i) => {
    if (r.type === "commitment") return;
    for (const h of privacyScan(r)) err(i + 1, h.at, `looks like a ${h.kind}`);
    for (const [at, s] of strings(r)) {
      if (HASH_FIELDS.test(at) || HASHLIKE.test(s)) continue;
      for (const [re, kind] of FORBIDDEN) if (re.test(s)) err(i + 1, at, `looks like a ${kind}`);
    }
  });
  return errors;
}

// A salt must look random: 64 hex digits using most of the alphabet, never reused.
const goodSalt = (s) => HEX64.test(s ?? "") && new Set(s).size >= 10;
export function newSalt() {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export const leafOf = (r) => (r?.type === "commitment" ? r.leaf : recordLeaf(r));

function strings(v, at = "$", out = []) {
  if (typeof v === "string") out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}[${i}]`, out));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) { out.push([`${at}{key}`, k]); strings(x, `${at}.${k}`, out); }
  return out;
}

function checkAccount(r, seq, err, accounts, addressOwner, networks, header) {
  if (!ACCOUNT_KINDS.includes(r.kind)) err(seq, "kind", `one of ${ACCOUNT_KINDS.join(", ")}`);
  if (!(r.commodity in COMMODITIES)) err(seq, "commodity", `one of ${Object.keys(COMMODITIES).join(", ")}`);
  if (!str(r.description, 300)) err(seq, "description", "required");
  if (r.fee !== undefined && (r.fee !== true || r.kind !== "expense")) err(seq, "fee", "only expense accounts can be fee accounts");
  if (r.conversion !== undefined && (r.conversion !== true || r.kind !== "equity")) err(seq, "conversion", "only equity accounts can be conversion accounts");
  if (r.onchain !== undefined) {
    if (r.kind !== "asset" || r.commodity !== "BTC") err(seq, "onchain", "only BTC asset accounts are on-chain");
    else if (!isObj(r.onchain) || !["mainnet", "testnet", "regtest"].includes(r.onchain.network) || !Array.isArray(r.onchain.addresses) || !r.onchain.addresses.length || r.onchain.addresses.length > 500) err(seq, "onchain", "needs network and 1-500 watch-only addresses");
    else {
      // One network per journal, and test networks only in simulations, so test coins are never added to real ones.
      networks.add(r.onchain.network);
      if (networks.size > 1) err(seq, "onchain.network", "all on-chain accounts and proofs in a journal use one network");
      if (r.onchain.network !== "mainnet" && !header?.simulated) err(seq, "onchain.network", "testnet and regtest accounts belong only in simulated journals");
      for (const a of r.onchain.addresses) {
        let script;
        try { script = addressToScript(a, r.onchain.network); } catch (e) { err(seq, "onchain.addresses", `${String(a).slice(0, 90)}: ${e.message}`); continue; }
        if (addressOwner.has(script)) err(seq, "onchain.addresses", `${a} already belongs to ${addressOwner.get(script)}; an output can only be credited once`);
        addressOwner.set(script, r.id);
      }
    }
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

// A proof enters the journal only if it checks offline; whether its block is in the best chain is the viewer's anchor to decide.
function checkProof(r, seq, err, proofs, sources, txids, networks) {
  if (!["mainnet", "testnet", "regtest"].includes(r.network)) return err(seq, "network", "mainnet, testnet or regtest");
  if (!sources.has(r.source) || sources.get(r.source).kind !== "chain") err(seq, "source", "must reference an earlier source of kind chain");
  if (!Number.isSafeInteger(r.block_height) || r.block_height < 0) err(seq, "block_height", "a non-negative integer");
  if (txids.has(r.txid)) return err(seq, "txid", `transaction ${String(r.txid).slice(0, 16)}... already has a proof in this journal`);
  const check = verifyTxProof(r, { expectTxid: r.txid });
  const failed = check.checks.filter((c) => !c.ok);
  if (failed.length) return err(seq, "chain_proof", `doesn't check offline: ${failed.map((c) => c.id).join(", ")}`);
  txids.add(r.txid);
  networks.add(r.network);
  if (networks.size > 1) err(seq, "network", "all on-chain accounts and proofs in a journal use one network");
  proofs.set(r.id, { ...r, _tx: parseTx(r.tx_hex) });
}

function checkTransaction(r, seq, err, ctx) {
  if (!TX_KINDS.includes(r.kind)) err(seq, "kind", `one of ${TX_KINDS.join(", ")}`);
  if (!UTC.test(r.occurred_at ?? "")) err(seq, "occurred_at", "UTC timestamp");
  if (!str(r.description, 300)) err(seq, "description", "required");
  if (!["posted", "pending"].includes(r.status)) err(seq, "status", "posted or pending");
  if (!PRIVACY.includes(r.privacy)) err(seq, "privacy", `one of ${PRIVACY.join(", ")}`);
  // Aggregates can be withheld too (below the publication threshold), so both carry a salt.
  if (["committed", "aggregated"].includes(r.privacy) && !goodSalt(r.salt)) err(seq, "salt", `${r.privacy} records need a random 32-byte hex salt (see newSalt()), or a withheld leaf hash can be guessed`);
  if (r.salt !== undefined) { if (ctx.salts.has(r.salt)) err(seq, "salt", "salts are never reused"); ctx.salts.add(r.salt); }
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
    sums.set(p.commodity, (sums.get(p.commodity) ?? 0n) + (Number.isSafeInteger(p.amount) ? BigInt(p.amount) : 0n));
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
      else if (Math.abs(Date.parse(price.at) - Date.parse(r.occurred_at)) > 864e5) err(seq, `${at}.value.price`, `price ${price.id} is from ${price.at}, more than a day from this entry`);
    }
  });
  for (const [c, s] of sums) if (s !== 0n) err(seq, "postings", `${c} doesn't balance (off by ${s} minor units)`);
  if (sums.size > 1 && !["conversion", "reversal", "settlement"].includes(r.kind)) err(seq, "kind", "only conversion and settlement entries mix commodities");
  if (sums.size > 1 && r.kind !== "reversal" && !r.postings.some((p) => ctx.accounts.get(p.account)?.conversion)) err(seq, "postings", "mixed-commodity entries go through a conversion account so each commodity balances on its own");
  if (touchesIncome && !INCOME_KINDS.has(r.kind)) err(seq, "kind", `${r.kind} entries can't touch income: transfers and conversions are never revenue`);
  // Moving or converting money is neither revenue nor spending: only fees may be expensed in these entries.
  if (["transfer", "conversion", "deposit", "withdrawal", "settlement"].includes(r.kind)) {
    for (const p of r.postings) {
      const a = ctx.accounts.get(p.account);
      if (a?.kind === "expense" && !(a.fee && p.amount > 0)) err(seq, "postings", `${r.kind} entries can't post to expense account ${a.id} except as a positive fee`);
      if (sums.size > 1 && a && a.kind !== "asset" && !a.conversion && !a.fee) err(seq, "postings", `in a mixed-commodity entry, ${a.id} must be an asset, conversion or fee account`);
    }
  }
  if (!["conversion", "settlement", "reversal"].includes(r.kind) && r.postings.some((p) => ctx.accounts.get(p.account)?.conversion)) err(seq, "postings", "conversion accounts are only for conversion and settlement entries");
  if (r.retires !== undefined) {
    if (r.status !== "posted" || !Array.isArray(r.retires) || r.retires.some((id) => ctx.byId.get(id)?.status !== "pending" || ctx.retired.has(id))) err(seq, "retires", "a posted entry may retire earlier pending entries it replaces, once each");
    else for (const id of r.retires) ctx.retired.add(id);
  }
  if (r.follows !== undefined && (!Array.isArray(r.follows) || r.follows.length > 10 || r.follows.some((id) => ctx.byId.get(id)?.type !== "transaction" || ctx.byId.get(id).seq >= seq))) err(seq, "follows", "earlier transaction ids this one continues (for flow and delay reports)");
  if (r.kind === "reversal") {
    const orig = ctx.byId.get(r.reverses);
    if (!orig || orig.type !== "transaction" || orig.seq >= seq) err(seq, "reverses", "must reference an earlier transaction");
    else if (orig.status !== r.status) err(seq, "reverses", `a ${r.status} reversal can't reverse a ${orig.status} entry`);
    else if (ctx.reversed.has(orig.id)) err(seq, "reverses", `${orig.id} is already reversed`);
    else {
      ctx.reversed.add(orig.id);
      const key = (ps, sign) => ps.map((p) => `${p.account}|${p.commodity}|${sign * p.amount}`).sort().join(";");
      if (key(r.postings, 1) !== key(orig.postings, -1)) err(seq, "postings", "a reversal negates the original postings exactly");
    }
  } else if (r.reverses !== undefined) err(seq, "reverses", "only reversal entries reverse");
  if (r.chain_proof !== undefined) {
    const proof = ctx.proofs.get(r.chain_proof);
    if (!proof) err(seq, "chain_proof", "must reference an earlier chain_proof that checks offline");
    else if (ctx.usedProofs.has(r.chain_proof)) err(seq, "chain_proof", `${r.chain_proof} already supports another entry; one on-chain transaction is booked once`);
    else { ctx.usedProofs.add(r.chain_proof); checkProofAmounts(r, proof, ctx, seq, err); }
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
