// Reads a validated journal: balances, evidence per posting, on-chain custody, conversions and the gaps a reviewer should see.
import { addressToScript } from "./bitcoin/address.mjs";
import { verifyTxProof } from "./bitcoin/spv.mjs";
import { parseTx } from "./bitcoin/tx.mjs";
import { SOURCE_KINDS } from "./journal.mjs";
import { effectiveRate } from "./money.mjs";

export const EVIDENCE_CLASSES = {
  "chain-verified": "An on-chain posting whose transaction proof checks offline against a block hash the verifier confirmed independently.",
  "chain-proof-unanchored": "The transaction proof checks offline, but nobody has confirmed the block hash against the best chain for this view.",
  "provider-document": "Backed by a third party's statement (Apple report, bank or exchange statement, BTCPay record). Usually supplied by the operator, so readers see the operator's copy.",
  "self-reported": "The operator's own record with no third-party document.",
  estimate: "A projection or allocation, not a recorded amount.",
  pending: "Not settled yet.",
  unknown: "No evidence recorded.",
};

export function index(records) {
  const ix = { accounts: new Map(), sources: new Map(), prices: new Map(), proofs: new Map(), transactions: [], attention: [], reviews: [], header: records[0] };
  for (const r of records) {
    if (r.type === "account") ix.accounts.set(r.id, r);
    else if (r.type === "source") ix.sources.set(r.id, r);
    else if (r.type === "price") ix.prices.set(r.id, r);
    else if (r.type === "chain_proof") ix.proofs.set(r.id, r);
    else if (r.type === "transaction") ix.transactions.push(r);
    else if (r.type === "attention") ix.attention.push(r);
    else if (r.type === "review") ix.reviews.push(r);
  }
  return ix;
}

// anchors: { network: { height: blockHash } } that the person viewing confirmed themselves. Without them nothing is chain-verified.
export function verifyProofs(ix, anchors = {}) {
  const out = new Map();
  for (const [id, p] of ix.proofs) out.set(id, verifyTxProof(p, { anchors: anchors[p.network] ?? {}, expectTxid: p.txid }));
  return out;
}

export function postingEvidence(ix, tx, p, proofResults) {
  if (tx.status === "pending") return "pending";
  const src = ix.sources.get(p.evidence?.source);
  if (!src) return "unknown";
  const cls = SOURCE_KINDS[src.kind];
  if (cls !== "chain-proof") return cls;
  const res = proofResults.get(tx.chain_proof);
  if (!res?.ok) return "unknown";
  return res.status === "chain-verified" ? "chain-verified" : "chain-proof-unanchored";
}

export function balances(ix, { status = "posted", until } = {}) {
  const out = {};
  for (const tx of ix.transactions) {
    if (tx.status !== status || (until && tx.occurred_at > until)) continue;
    for (const p of tx.postings) {
      out[p.account] ??= {};
      out[p.account][p.commodity] = (out[p.account][p.commodity] ?? 0) + p.amount;
    }
  }
  return out;
}

// Follows treasury coins through proven transactions: deposits create outputs, spends must consume them, and amounts must add up.
export function chainCustody(ix) {
  const utxos = new Map(), issues = [], spends = [];
  const scriptsOf = (acct) => new Set(acct.onchain.addresses.map((a) => addressToScript(a, acct.onchain.network)));
  for (const tx of ix.transactions) {
    if (!tx.chain_proof || tx.status !== "posted") continue;
    const proof = ix.proofs.get(tx.chain_proof);
    const parsed = parseTx(proof.tx_hex);
    for (const p of tx.postings) {
      const acct = ix.accounts.get(p.account);
      if (!acct?.onchain) continue;
      const scripts = scriptsOf(acct);
      const spent = parsed.inputs.map((i) => `${i.prev_txid}:${i.vout}`).filter((k) => utxos.get(k)?.account === acct.id);
      const spentSats = spent.reduce((n, k) => n + utxos.get(k).value_sats, 0);
      const back = parsed.outputs.filter((o) => scripts.has(o.script));
      const backSats = back.reduce((n, o) => n + o.value_sats, 0);
      if (p.amount < 0) {
        if (!spent.length) issues.push({ transaction: tx.id, issue: `spends from ${acct.id} but none of its inputs are treasury coins this journal has proven` });
        else if (backSats - spentSats !== p.amount) issues.push({ transaction: tx.id, issue: `chain shows ${backSats - spentSats} sats for ${acct.id}, posting says ${p.amount}` });
        const allTreasury = spent.length === parsed.inputs.length;
        const fee = allTreasury ? spentSats - parsed.outputs.reduce((n, o) => n + o.value_sats, 0) : null;
        const booked = tx.postings.filter((q) => ix.accounts.get(q.account)?.fee && q.commodity === "BTC").reduce((n, q) => n + q.amount, 0);
        if (fee !== null && booked !== fee) issues.push({ transaction: tx.id, issue: `chain shows a ${fee}-sat network fee, the books show ${booked}` });
        spends.push({ transaction: tx.id, txid: parsed.txid, inputs_from_treasury: spent.length, network_fee_sats: fee });
      }
      for (const k of spent) utxos.delete(k);
      for (const o of back) utxos.set(`${parsed.txid}:${o.n}`, { account: acct.id, value_sats: o.value_sats, txid: parsed.txid, vout: o.n });
    }
  }
  const byAccount = {};
  for (const u of utxos.values()) byAccount[u.account] = (byAccount[u.account] ?? 0) + u.value_sats;
  return { unspent: [...utxos.values()], proven_balance_sats: byAccount, spends, issues, limit: "Proofs show coins arrived and were spent as recorded. They can't show a coin is still unspent today; a watch-only node or explorer reports that, and it isn't proven here." };
}

export function conversions(ix) {
  const byId = new Map(ix.transactions.map((t) => [t.id, t]));
  return ix.transactions.filter((t) => t.kind === "conversion" && t.status === "posted").map((t) => {
    const legs = t.postings.filter((p) => ix.accounts.get(p.account)?.kind === "asset");
    const paid = legs.find((p) => p.amount < 0), got = legs.find((p) => p.amount > 0);
    const fees = t.postings.filter((p) => ix.accounts.get(p.account)?.fee).map((p) => ({ account: p.account, amount: p.amount, commodity: p.commodity }));
    const prior = (t.follows ?? []).map((id) => byId.get(id)).filter(Boolean);
    return {
      transaction: t.id, occurred_at: t.occurred_at,
      paid: paid && { amount: -paid.amount, commodity: paid.commodity }, received: got && { amount: got.amount, commodity: got.commodity },
      effective_rate: paid && got ? effectiveRate(-paid.amount, paid.commodity, got.amount, got.commodity) : null,
      fees,
      delay_after: prior.map((p) => ({ transaction: p.id, hours: Math.round((Date.parse(t.occurred_at) - Date.parse(p.occurred_at)) / 36e5) })),
    };
  });
}

// A transaction's flow chain (follows links), as delays in days between consecutive steps.
export function flow(ix, lastId) {
  const byId = new Map(ix.transactions.map((t) => [t.id, t]));
  const steps = [];
  for (let t = byId.get(lastId), seen = new Set(); t && !seen.has(t.id); t = byId.get(t.follows?.[0])) { seen.add(t.id); steps.unshift(t); }
  return steps.map((t, i) => ({ transaction: t.id, kind: t.kind, occurred_at: t.occurred_at, hours_after_previous: i ? Math.round((Date.parse(t.occurred_at) - Date.parse(steps[i - 1].occurred_at)) / 36e5) : null }));
}

export function evidenceReport(ix, proofResults) {
  const counts = Object.fromEntries(Object.keys(EVIDENCE_CLASSES).map((k) => [k, 0]));
  const rows = [];
  for (const tx of ix.transactions) {
    const reviews = ix.reviews.filter((r) => r.covers.includes(tx.id));
    // Conversion-account legs are bookkeeping that mirror the real legs, so they carry no evidence of their own.
    const postings = tx.postings.filter((p) => !ix.accounts.get(p.account)?.conversion).map((p) => {
      const cls = postingEvidence(ix, tx, p, proofResults);
      counts[cls]++;
      const src = ix.sources.get(p.evidence?.source);
      return { account: p.account, amount: p.amount, commodity: p.commodity, evidence: cls, source: src?.id ?? null, operator_supplied: src ? src.operator_supplied : null };
    });
    rows.push({
      transaction: tx.id, kind: tx.kind, occurred_at: tx.occurred_at, status: tx.status, privacy: tx.privacy, postings,
      independent_reviews: reviews.filter((r) => !r.affiliated).map((r) => ({ reviewer: r.reviewer, result: r.result, statement_uri: r.statement_uri })),
      affiliated_reviews: reviews.filter((r) => r.affiliated).length,
    });
  }
  const gaps = rows.flatMap((r) => r.postings.filter((p) => ["unknown", "self-reported", "estimate", "pending"].includes(p.evidence)).map((p) => ({ transaction: r.transaction, account: p.account, evidence: p.evidence })));
  const operatorOnly = rows.flatMap((r) => r.postings.filter((p) => p.operator_supplied && p.evidence === "provider-document").map((p) => ({ transaction: r.transaction, account: p.account, source: p.source })));
  return { counts, transactions: rows, gaps, operator_only: operatorOnly };
}
