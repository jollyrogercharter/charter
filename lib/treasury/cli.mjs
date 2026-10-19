// `qm treasury ...`: local files in, JSON out. Network use is limited to GETs against the explorer the user names.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import { appleProposals, parseFinancialReport } from "./adapters/apple.mjs";
import { btcpayProposal, normalizeInvoice } from "./adapters/btcpay.mjs";
import { parseStatement, PROFILES, statementProposals, tradeProposals } from "./adapters/csv-statements.mjs";
import { confirmAnchors, esploraClient, fetchProof, KNOWN_HOSTS, observations } from "./adapters/esplora.mjs";
import { verifyTxProof } from "./bitcoin/spv.mjs";
import { newSalt, parseJournal, validateJournal } from "./journal.mjs";
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
  prove PUBLIC.jsonl SEQ                    Inclusion proof for record SEQ (1-based; the proof's index is 0-based)
  check-proof PROOF.json ROOT               Check an inclusion proof against a published root
  append-check OLD.jsonl NEW.jsonl          Fail unless NEW only appends to OLD
  chain-check PROOF.json [--anchors F] [--address A]... [--require-anchor]
                                            Check a chain_proof record (or { "proof": ... }) offline: txid, Merkle,
                                            work, anchor. Extract one from a journal with:
                                            grep '"type":"chain_proof"' journal.jsonl | head -1 > proof.json
  import apple REPORT.txt[.gz] --source ID --income A --commission A --receivable A
  import statement FILE.csv --profile NAME --account A --source ID --rules RULES.json
                                            Rules: [{ match, counter, kind, description, counter_evidence: { source, ref? },
                                            sign?, fee_account?, privacy? }]; see treasury/demo/example-rules.json
  import trades FILE.csv --profile kraken-ledgers --source ID --account A --btc-account A
         --conversion-fiat A --conversion-btc A [--fee-account A] [--fee-account-btc A]
  import btcpay INVOICE.json --source ID --treasury A --income A
                                            Print proposed transactions; nothing is written to the journal
  watch ADDRESS... --explorer NAME|URL [--network N]
  fetch-proof TXID --id ID --source ID --explorer NAME|URL
  anchors HEIGHT... --explorer A --explorer B [--network N]   (output works directly as --anchors)
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
// Accepts { anchors: { network: { height: hash } } } or the flat { anchors: { height: hash } } that `anchors` writes for one network.
export function readAnchors(obj, network) {
  const a = obj?.anchors ?? obj ?? {};
  const flat = Object.keys(a).length && Object.keys(a).every((k) => /^\d+$/.test(k));
  return flat ? { [obj?.network ?? network]: a } : a;
}
const need = (v, what) => { if (!v) throw new Error(`missing ${what}; run qm treasury --help`); return v; };

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
    "btc-account": { type: "string" }, "conversion-fiat": { type: "string" }, "conversion-btc": { type: "string" }, "fee-account": { type: "string" }, "fee-account-btc": { type: "string" }, "require-anchor": { type: "boolean" },
  } });
  const json = (v) => { out(JSON.stringify(v, null, 2) + "\n"); };
  const journal = (f) => parseJournal(readText(need(f, "a journal file")));
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
      json(fullReport(recs, o.anchors ? readAnchors(readJson(o.anchors), network) : {}));
      return 0;
    }
    case "snapshot": {
      if (!o.out) throw new Error("snapshot needs --out DIR");
      const s = buildSnapshot(journal(args[0]));
      if (s.error) { json(s); return 1; }
      mkdirSync(o.out, { recursive: true });
      writeFileSync(path.join(o.out, "public-journal.jsonl"), s.public_journal.map(canonical).join("\n") + "\n");
      // No trailing newline, so `ots stamp snapshot.json` and `shasum -a 256` both cover exactly the published digest.
      writeFileSync(path.join(o.out, "snapshot.json"), s.snapshot_canonical);
      writeFileSync(path.join(o.out, "snapshot.sha256"), `${s.snapshot_sha256}  snapshot.json\n`);
      json({ snapshot_sha256: s.snapshot_sha256, merkle_root: s.snapshot.journal.merkle_root, records: s.snapshot.journal.records, withheld: s.snapshot.journal.withheld, next: "Timestamp it yourself: ots stamp snapshot.json (that sends only its hash to public calendars)." });
      return 0;
    }
    case "verify": {
      const pub = journal(args[0]);
      const text = readText(need(args[1], "SNAPSHOT.json"));
      const snap = JSON.parse(text);
      const r = verifyPublic(pub, snap);
      const canonicalOk = text === canonical(snap);
      json({ ...r, ok: r.ok && canonicalOk, snapshot_sha256: sha256Hex(text), canonical_bytes: canonicalOk, ...(canonicalOk ? {} : { why: text.includes("\r") ? "the file has Windows line endings (CR); check it out with LF" : "the file isn't byte-for-byte canonical JSON (whitespace, key order or a trailing newline)" }) });
      return r.ok && canonicalOk ? 0 : 1;
    }
    case "prove": json(proveRecord(journal(need(args[0], "PUBLIC.jsonl")), Number(need(args[1], "SEQ")))); return 0;
    case "check-proof": { const ok = verifyInclusion(readJson(args[0]), args[1]); json({ ok }); return ok ? 0 : 1; }
    case "append-check": { const r = appendCheck(journal(args[0]), journal(args[1])); json(r); return r.ok ? 0 : 1; }
    case "chain-check": {
      const raw = readJson(need(args[0], "PROOF.json"));
      const p = raw.proof ?? raw;
      const anchors = o.anchors ? readAnchors(readJson(o.anchors), p.network)[p.network] ?? {} : {};
      const r = verifyTxProof(p, { anchors, treasuryAddresses: o.address ?? [], expectTxid: p.txid });
      json(r);
      return r.ok && (!o["require-anchor"] || r.status === "chain-verified") ? 0 : 1;
    }
    case "import": {
      const [kind, file] = args;
      if (kind === "apple") json(appleProposals(parseFinancialReport(readText(file)), { source: o.source, accounts: { income: o.income, commission: o.commission, receivable: o.receivable }, salt: newSalt }));
      else if (kind === "statement") json(statementProposals(parseStatement(readText(file), o.profile), { account: o.account, source: o.source, rules: o.rules ? readJson(o.rules) : [], idPrefix: o.id ?? "statement", salt: newSalt }));
      else if (kind === "trades") json(tradeProposals(parseStatement(readText(file), o.profile), { accounts: { USD: need(o.account, "--account (fiat)"), BTC: need(o["btc-account"], "--btc-account") }, conversion: { USD: need(o["conversion-fiat"], "--conversion-fiat"), BTC: need(o["conversion-btc"], "--conversion-btc") }, feeAccounts: { USD: o["fee-account"], BTC: o["fee-account-btc"] }, source: o.source, idPrefix: o.id ?? "trade" }));
      else if (kind === "btcpay") { const d = readJson(file); const r = btcpayProposal(normalizeInvoice(d.invoice, d.payment_methods), { source: o.source, accounts: { treasury: o.treasury, income: o.income } }); json({ proposals: [r.price, r.proposal].filter(Boolean), ...(r.skipped ? { skipped: r.skipped } : {}) }); }
      else throw new Error("import apple | statement | trades | btcpay");
      return 0;
    }
    case "watch": {
      if (!o.explorer?.length) throw new Error("watch needs --explorer: it sends your addresses to that service, so name it (or your own node) explicitly");
      const c = explorer(o.explorer[0], network);
      const all = [];
      for (const a of args) all.push(...observations(await c.addressTxs(a), [a], network).map((x) => ({ address: a, ...x })));
      json({ explorer: c.base, observations: all, note: "Explorer-reported, not proven. Use fetch-proof and anchors to turn one into evidence." });
      return 0;
    }
    case "fetch-proof":
      if (!o.explorer?.length) throw new Error("fetch-proof needs --explorer");
      json(await fetchProof(explorer(o.explorer[0], network), args[0], { id: o.id, source: o.source, network }));
      return 0;
    case "anchors": {
      if ((o.explorer ?? []).length < 2) throw new Error("anchors needs at least two --explorer sources (or your own node twice is no better than once)");
      const r = await confirmAnchors(args.map(Number), o.explorer.map((e) => explorer(e, network)));
      json({ network, ...r, anchors: { [network]: r.anchors } });
      return 0;
    }
    default: throw new Error(`unknown treasury command "${cmd}"`);
  }
}
