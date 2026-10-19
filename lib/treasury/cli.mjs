// `qm treasury ...`: local files in, JSON out. Network use is limited to GETs against the explorer the user names.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import { appleProposals, parseFinancialReport } from "./adapters/apple.mjs";
import { btcpayProposal, normalizeInvoice } from "./adapters/btcpay.mjs";
import { parseStatement, PROFILES, statementProposals } from "./adapters/csv-statements.mjs";
import { confirmAnchors, esploraClient, fetchProof, KNOWN_HOSTS, observations } from "./adapters/esplora.mjs";
import { verifyTxProof } from "./bitcoin/spv.mjs";
import { parseJournal, validateJournal } from "./journal.mjs";
import { chainCustody, conversions, evidenceReport, flow, index, verifyProofs, balances } from "./ledger.mjs";
import { computeLots } from "./lots.mjs";
import { appendCheck, buildSnapshot, proveRecord, verifyInclusion, verifyPublic } from "./snapshot.mjs";
import { canonical } from "./merkle.mjs";
import { sha256Hex } from "./sha256.mjs";

export const TREASURY_USAGE = `qm treasury - verifiable treasury journal (qmt 0.1, draft)

  validate JOURNAL.jsonl                    Check the hash chain, double entry and evidence rules
  report JOURNAL.jsonl [--anchors F]        Balances, evidence per posting, custody, lots, conversions
  snapshot JOURNAL.jsonl --out DIR          Write public-journal.jsonl and snapshot.json (stamp it with: ots stamp)
  verify PUBLIC.jsonl SNAPSHOT.json         Recompute the Merkle root, head and hash chain anyone can check
  prove PUBLIC.jsonl SEQ                    Inclusion proof for one record
  check-proof PROOF.json ROOT               Check an inclusion proof against a published root
  append-check OLD.jsonl NEW.jsonl          Fail unless NEW only appends to OLD
  chain-check PROOF.json [--anchors F] [--address A]...
                                            Check a transaction proof offline (txid, Merkle, work, anchor)
  import apple REPORT.txt[.gz] --source ID --income A --commission A --receivable A
  import statement FILE.csv --profile NAME --account A --source ID [--rules RULES.json]
  import btcpay INVOICE.json --source ID --treasury A --income A
                                            Print proposed transactions; nothing is written to the journal
  watch ADDRESS... [--explorer NAME|URL] [--network N]
  fetch-proof TXID --id ID --source ID [--explorer NAME|URL]
  anchors HEIGHT... --explorer A --explorer B
                                            Read-only GETs to the explorers you name (blockstream, mempool or your own)

Profiles: ${Object.keys(PROFILES).join(", ")}. Nothing here holds keys, signs, broadcasts or moves money.`;

const MAX_FILE = 64 * 1024 * 1024;
function readText(file) {
  const st = statSync(file);
  if (!st.isFile()) throw new Error(`${file} is not a regular file`);
  if (st.size > MAX_FILE) throw new Error(`${file} is over 64 MiB`);
  const raw = readFileSync(file);
  return file.endsWith(".gz") ? gunzipSync(raw, { maxOutputLength: MAX_FILE }).toString("utf8") : raw.toString("utf8");
}
const readJson = (f) => { try { return JSON.parse(readText(f)); } catch (e) { throw new Error(e instanceof SyntaxError ? `${f}: not valid JSON` : e.message); } };
const explorer = (v, network) => esploraClient({ baseUrl: KNOWN_HOSTS[v] ?? v, network });

export function fullReport(records, anchors = {}) {
  const ix = index(records);
  const proofs = verifyProofs(ix, anchors);
  const ev = evidenceReport(ix, proofs);
  return {
    entity: ix.header.entity, simulated: ix.header.simulated === true,
    balances: balances(ix), pending: balances(ix, { status: "pending" }),
    evidence: ev, proofs: Object.fromEntries([...proofs].map(([k, v]) => [k, { status: v.status, txid: v.txid, block_height: v.block_height, failed: v.checks.filter((c) => !c.ok).map((c) => c.id) }])),
    custody: chainCustody(ix), lots: computeLots(ix), conversions: conversions(ix),
    flows: ix.transactions.filter((t) => t.follows && !ix.transactions.some((u) => u.follows?.includes(t.id))).map((t) => flow(ix, t.id)),
    attention: ix.attention,
  };
}

export async function treasuryMain(argv, { out = (s) => process.stdout.write(s) } = {}) {
  const { values: o, positionals: [cmd, ...args] } = parseArgs({ args: argv, allowPositionals: true, options: {
    out: { type: "string" }, anchors: { type: "string" }, address: { type: "string", multiple: true }, explorer: { type: "string", multiple: true }, network: { type: "string" },
    source: { type: "string" }, income: { type: "string" }, commission: { type: "string" }, receivable: { type: "string" }, treasury: { type: "string" },
    profile: { type: "string" }, account: { type: "string" }, rules: { type: "string" }, id: { type: "string" }, help: { type: "boolean", short: "h" },
  } });
  const json = (v) => { out(JSON.stringify(v, null, 2) + "\n"); };
  const journal = (f) => parseJournal(readText(f));
  const network = o.network ?? "mainnet";
  if (!cmd || o.help) { out(TREASURY_USAGE + "\n"); return cmd || o.help ? 0 : 2; }
  switch (cmd) {
    case "validate": {
      const recs = journal(args[0]);
      const errors = validateJournal(recs);
      json({ valid: !errors.length, records: recs.length, errors });
      return errors.length ? 1 : 0;
    }
    case "report": {
      const recs = journal(args[0]);
      const errors = validateJournal(recs);
      if (errors.length) { json({ valid: false, errors }); return 1; }
      json(fullReport(recs, o.anchors ? readJson(o.anchors).anchors ?? readJson(o.anchors) : {}));
      return 0;
    }
    case "snapshot": {
      if (!o.out) throw new Error("snapshot needs --out DIR");
      const s = buildSnapshot(journal(args[0]));
      if (s.error) { json(s); return 1; }
      mkdirSync(o.out, { recursive: true });
      writeFileSync(path.join(o.out, "public-journal.jsonl"), s.public_journal.map(canonical).join("\n") + "\n");
      writeFileSync(path.join(o.out, "snapshot.json"), s.snapshot_canonical + "\n");
      json({ snapshot_sha256: s.snapshot_sha256, merkle_root: s.snapshot.journal.merkle_root, records: s.snapshot.journal.records, withheld: s.snapshot.journal.withheld, next: "Timestamp it yourself: ots stamp snapshot.json (that sends only its hash to public calendars)." });
      return 0;
    }
    case "verify": {
      const pub = journal(args[0]);
      const text = readText(args[1]);
      const snap = JSON.parse(text);
      const r = verifyPublic(pub, snap);
      const canonicalOk = text.replace(/\n$/, "") === canonical(snap);
      json({ ...r, ok: r.ok && canonicalOk, snapshot_sha256: sha256Hex(text.replace(/\n$/, "")), canonical_bytes: canonicalOk });
      return r.ok && canonicalOk ? 0 : 1;
    }
    case "prove": json(proveRecord(journal(args[0]), Number(args[1]))); return 0;
    case "check-proof": { const ok = verifyInclusion(readJson(args[0]), args[1]); json({ ok }); return ok ? 0 : 1; }
    case "append-check": { const r = appendCheck(journal(args[0]), journal(args[1])); json(r); return r.ok ? 0 : 1; }
    case "chain-check": {
      const p = readJson(args[0]);
      const anchors = o.anchors ? (readJson(o.anchors).anchors ?? {})[p.network] ?? {} : {};
      const r = verifyTxProof(p, { anchors, treasuryAddresses: o.address ?? [], expectTxid: p.txid });
      json(r);
      return r.ok ? 0 : 1;
    }
    case "import": {
      const [kind, file] = args;
      if (kind === "apple") json(appleProposals(parseFinancialReport(readText(file)), { source: o.source, accounts: { income: o.income, commission: o.commission, receivable: o.receivable } }));
      else if (kind === "statement") json(statementProposals(parseStatement(readText(file), o.profile), { account: o.account, source: o.source, rules: o.rules ? readJson(o.rules) : [], idPrefix: o.id ?? "statement" }));
      else if (kind === "btcpay") { const d = readJson(file); json(btcpayProposal(normalizeInvoice(d.invoice, d.payment_methods), { source: o.source, accounts: { treasury: o.treasury, income: o.income } })); }
      else throw new Error("import apple | statement | btcpay");
      return 0;
    }
    case "watch": {
      const c = explorer(o.explorer?.[0] ?? "blockstream", network);
      const all = [];
      for (const a of args) all.push(...observations(await c.addressTxs(a), [a], network).map((x) => ({ address: a, ...x })));
      json({ explorer: c.base, observations: all, note: "Explorer-reported, not proven. Use fetch-proof and anchors to turn one into evidence." });
      return 0;
    }
    case "fetch-proof": json(await fetchProof(explorer(o.explorer?.[0] ?? "blockstream", network), args[0], { id: o.id, source: o.source, network })); return 0;
    case "anchors": {
      if ((o.explorer ?? []).length < 2) throw new Error("anchors needs at least two --explorer sources (or your own node twice is no better than once)");
      json(await confirmAnchors(args.map(Number), o.explorer.map((e) => explorer(e, network))));
      return 0;
    }
    default: throw new Error(`unknown treasury command "${cmd}"`);
  }
}
