import { readFileSync } from "node:fs";
import { fullReport } from "../../lib/treasury/cli.mjs";
import { parseJournal, validateJournal } from "../../lib/treasury/journal.mjs";
import { EVIDENCE_CLASSES, index } from "../../lib/treasury/ledger.mjs";
import { format } from "../../lib/treasury/money.mjs";
import { verifyPublic } from "../../lib/treasury/snapshot.mjs";

const DIR = "treasury/demo";

// The page shows only what the public journal shows: withheld records appear as leaf hashes, never by date, kind or amount.
export default () => {
  const records = parseJournal(readFileSync(`${DIR}/journal.jsonl`, "utf8"));
  const errors = validateJournal(records);
  if (errors.length) throw new Error(`treasury/demo/journal.jsonl is invalid; refusing to publish it: ${JSON.stringify(errors.slice(0, 3))}`);
  const pub = parseJournal(readFileSync(`${DIR}/public-journal.jsonl`, "utf8"));
  const snapshot = JSON.parse(readFileSync(`${DIR}/snapshot.json`, "utf8"));
  const publicCheck = verifyPublic(pub, snapshot);
  if (!publicCheck.ok) throw new Error("treasury/demo public journal doesn't match its snapshot");
  const visible = pub.filter((r) => r.type !== "commitment");
  const anchors = JSON.parse(readFileSync(`${DIR}/regtest-anchors.json`, "utf8")).anchors;
  const unanchored = fullReport(visible);
  const anchored = fullReport(visible, anchors);
  const ix = index(visible);
  const fmt = (p) => format(p.amount, p.commodity);
  const usd = (cents) => format(cents, "USD");
  const evidenceOf = new Map(anchored.evidence.transactions.map((t) => [t.transaction, t]));
  const plain = new Map(unanchored.evidence.transactions.map((t) => [t.transaction, t]));

  const rows = (pred) => ix.transactions.filter(pred).sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)).map((t) => ({
    id: t.id, seq: t.seq, kind: t.kind, status: t.status, date: t.occurred_at.slice(0, 10), description: t.description,
    postings: evidenceOf.get(t.id).postings.map((p, i) => ({ account: p.account, amount: format(p.amount, p.commodity), evidence: p.evidence, unanchored: plain.get(t.id).postings[i].evidence, operator_supplied: p.operator_supplied })),
  }));
  const touches = (prefix) => (t) => t.postings.some((p) => p.account.startsWith(prefix));
  const bal = anchored.balances;
  const sum = (prefix, c) => Object.entries(bal).filter(([a]) => a.startsWith(prefix)).reduce((n, [, v]) => n + (v[c] ?? 0), 0);

  return {
    entity: ix.header.entity,
    snapshot, snapshot_sha256: readFileSync(`${DIR}/snapshot.sha256`, "utf8").split(" ")[0],
    publicCheck,
    classes: EVIDENCE_CLASSES,
    counts: { unanchored: unanchored.evidence.counts, anchored: anchored.evidence.counts },
    withheld: pub.filter((r) => r.type === "commitment").map((r) => ({ seq: r.seq, leaf: r.leaf })),
    treasury: {
      rows: rows(touches("assets:treasury")),
      balance: format(bal["assets:treasury:btc"]?.BTC ?? 0, "BTC"),
      proven: format(anchored.custody.proven_balance_sats["assets:treasury:btc"] ?? 0, "BTC"),
      custody: anchored.custody,
      addresses: ix.accounts.get("assets:treasury:btc").onchain.addresses,
    },
    fiat: {
      unconverted: usd(sum("assets:bank", "USD") + sum("assets:exchange:usd", "USD")),
      bank: usd(bal["assets:bank:checking"]?.USD ?? 0),
      bankNegative: (bal["assets:bank:checking"]?.USD ?? 0) < 0,
      receivable: usd(sum("assets:receivable", "USD")),
      pending: usd(Object.entries(anchored.pending).filter(([a]) => a.startsWith("assets:")).reduce((n, [, v]) => n + (v.USD ?? 0), 0)),
    },
    revenue: rows((t) => ["sale", "refund", "donation"].includes(t.kind)),
    conversions: anchored.conversions.map((c) => ({ ...c, paid: fmt(c.paid), received: fmt(c.received), fees: c.fees.map(fmt).join(", ") || "none" })),
    expenses: rows((t) => t.kind === "expense"),
    flow: anchored.flows.find((f) => f[0]?.transaction.startsWith("apple-")) ?? [],
    lots: anchored.lots,
    gaps: anchored.evidence.gaps,
    operatorOnly: anchored.evidence.operator_only,
    attention: ix.attention,
    files: ["public-journal.jsonl", "snapshot.json", "snapshot.sha256", "regtest-anchors.json", "journal.jsonl", "example-rules.json", "sources/simulated-apple-financial-US-2026-09.txt", "sources/simulated-bank-statement.csv", "sources/simulated-exchange-ledgers.csv", "sources/simulated-btcpay-invoice.json"],
  };
};
