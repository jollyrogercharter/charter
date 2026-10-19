// Public journals, deterministic snapshots and their Merkle commitments, inclusion proofs and the append-only check.
import { canonical, inclusionProof, merkleRoot, recordLeaf, verifyInclusion } from "./merkle.mjs";
import { GENESIS_PREV, leafOf, validateJournal } from "./journal.mjs";
import { balances, chainCustody, conversions, evidenceReport, index, verifyProofs } from "./ledger.mjs";
import { computeLots } from "./lots.mjs";
import { sha256Hex } from "./sha256.mjs";

export const SNAPSHOT_VERSION = "qmt-snapshot/0.1";
export const DEFAULT_POLICY = { min_aggregate_count: 3 };

// Committed records, and aggregates over too few items, are published as their leaf hash only.
export function publicJournal(records, policy = DEFAULT_POLICY) {
  const withheld = [];
  const out = records.map((r) => {
    const hide = r.type === "transaction" && (r.privacy === "committed" || (r.privacy === "aggregated" && r.count < policy.min_aggregate_count));
    if (!hide) return r;
    withheld.push({ seq: r.seq, reason: r.privacy === "committed" ? "committed" : `aggregate of ${r.count} < ${policy.min_aggregate_count}` });
    return { seq: r.seq, type: "commitment", leaf: recordLeaf(r) };
  });
  return { records: out, withheld };
}

export function buildSnapshot(records, { policy = DEFAULT_POLICY } = {}) {
  const problems = validateJournal(records);
  if (problems.length) return { error: { code: "INVALID_JOURNAL", problems: problems.slice(0, 20) } };
  const ix = index(records);
  const pub = publicJournal(records, policy);
  const leaves = pub.records.map(leafOf);
  const proofs = verifyProofs(ix);
  const ev = evidenceReport(ix, proofs);
  const custody = chainCustody(ix);
  const lots = computeLots(ix);
  const last = ix.transactions.reduce((m, t) => (t.occurred_at > m ? t.occurred_at : m), "");
  const snapshot = {
    version: SNAPSHOT_VERSION,
    entity: ix.header.entity,
    simulated: ix.header.simulated === true,
    base_currency: ix.header.base_currency,
    as_of: last || null,
    journal: { records: records.length, head_leaf: leaves.at(-1), merkle_root: merkleRoot(leaves), withheld: pub.withheld.length, policy },
    balances: balances(ix),
    pending_balances: balances(ix, { status: "pending" }),
    evidence_counts: ev.counts,
    gaps: ev.gaps.length,
    operator_only_postings: ev.operator_only.length,
    chain: {
      proofs: [...proofs].map(([id, r]) => ({ id, txid: r.txid, network: r.network, block_height: r.block_height, block_hash: r.block_hash, offline_checks: r.ok ? "pass" : "fail" })),
      proven_balance_sats: custody.proven_balance_sats,
      custody_issues: custody.issues.length,
    },
    conversions: conversions(ix),
    lots: { open: Object.fromEntries(Object.entries(lots.open_lots).map(([k, v]) => [k, { lots: v.length, sats: v.reduce((n, l) => n + l.sats, 0), basis_cents: v.some((l) => l.basis_cents === null) ? null : v.reduce((n, l) => n + l.basis_cents, 0) }])), disposals: lots.disposals.length },
    attention: ix.attention.map((a) => ({ id: a.id, role: a.role, period_start: a.period_start, period_end: a.period_end, minutes: a.minutes })),
    statements: [
      "Balances are computed from the operator's full journal, including any withheld records; withheld records appear only as hashes.",
      "Chain proofs are checked offline here; 'chain-verified' needs a block hash you confirm yourself.",
      "A Bitcoin address or transaction shows only those coins. It doesn't prove the operator's complete finances.",
    ],
  };
  const bytes = canonical(snapshot);
  return { snapshot, snapshot_canonical: bytes, snapshot_sha256: sha256Hex(bytes), public_journal: pub.records };
}

// Recomputes what anyone can from the public journal alone.
export function verifyPublic(publicRecords, snapshot) {
  const checks = [];
  const leaves = publicRecords.map(leafOf);
  checks.push({ id: "record-count", ok: publicRecords.length === snapshot.journal.records });
  checks.push({ id: "merkle-root", ok: merkleRoot(leaves) === snapshot.journal.merkle_root });
  checks.push({ id: "head", ok: leaves.at(-1) === snapshot.journal.head_leaf });
  let chainOk = true;
  publicRecords.forEach((r, i) => { if (r.type !== "commitment" && r.prev !== (i ? leaves[i - 1] : GENESIS_PREV)) chainOk = false; });
  checks.push({ id: "hash-chain", ok: chainOk });
  checks.push({ id: "withheld-count", ok: publicRecords.filter((r) => r.type === "commitment").length === snapshot.journal.withheld });
  return { ok: checks.every((c) => c.ok), checks };
}

export function proveRecord(publicRecords, seq) {
  const leaves = publicRecords.map(leafOf);
  return inclusionProof(leaves, seq - 1);
}

// Shows a withheld record to an auditor: it is in the snapshot if its leaf hash is.
export function checkDisclosure(record, proof, merkleRootHex) {
  return recordLeaf(record) === proof.leaf && verifyInclusion(proof, merkleRootHex);
}

export { verifyInclusion };

// The new journal must start with exactly the old one: no edits, deletions or reordering.
export function appendCheck(oldRecords, newRecords) {
  const a = oldRecords.map(leafOf), b = newRecords.map(leafOf);
  if (b.length < a.length) return { ok: false, reason: `the new journal has ${b.length} records, fewer than the old ${a.length}` };
  const i = a.findIndex((h, k) => h !== b[k]);
  if (i >= 0) return { ok: false, reason: `record ${i + 1} differs from the published one` };
  return { ok: true, appended: b.length - a.length };
}
