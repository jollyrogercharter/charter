import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { buildDemo } from "../scripts/treasury-demo.mjs";
import { appleProposals, parseFinancialReport } from "../lib/treasury/adapters/apple.mjs";
import { btcpayClient, btcpayProposal, normalizeInvoice } from "../lib/treasury/adapters/btcpay.mjs";
import { parseStatement, statementProposals } from "../lib/treasury/adapters/csv-statements.mjs";
import { confirmAnchors, esploraClient, fetchProof, observations } from "../lib/treasury/adapters/esplora.mjs";
import { addressToScript, scriptToAddress } from "../lib/treasury/bitcoin/address.mjs";
import { verifyTxProof } from "../lib/treasury/bitcoin/spv.mjs";
import { parseHeader, parseTx } from "../lib/treasury/bitcoin/tx.mjs";
import { appendRecords, parseJournal, serializeJournal, validateJournal } from "../lib/treasury/journal.mjs";
import { chainCustody, index } from "../lib/treasury/ledger.mjs";
import { canonical, inclusionProof, leafHash, merkleRoot, recordLeaf, verifyInclusion } from "../lib/treasury/merkle.mjs";
import { convert, effectiveRate } from "../lib/treasury/money.mjs";
import { appendCheck, buildSnapshot, checkDisclosure, proveRecord, verifyPublic } from "../lib/treasury/snapshot.mjs";
import { fromHex, hex, sha256Hex } from "../lib/treasury/sha256.mjs";
import { fullReport } from "../lib/treasury/cli.mjs";

const demo = buildDemo();
const B170 = JSON.parse(readFileSync("test/fixtures/treasury/block170.json", "utf8"));
const errs = (records) => validateJournal(records).map((e) => e.message).join(" | ");
const edit = (records, id, fn) => records.map((r) => (r.id === id ? fn(structuredClone(r)) : r));
// Re-chains everything after an edit, as a dishonest operator rewriting history would, so only the published snapshot catches it.
const rechain = (records) => appendRecords([], records.map(({ seq, prev, ...r }) => r));

test("sha256 and canonical JSON: match Node's SHA-256 and refuse floats", () => {
  for (const n of [0, 1, 55, 56, 63, 64, 65, 1000, 70000]) {
    const b = randomBytes(n);
    assert.equal(sha256Hex(b), createHash("sha256").update(b).digest("hex"), `length ${n}`);
  }
  assert.equal(canonical({ b: 1, a: [true, null, "é"] }), '{"a":[true,null,"é"],"b":1}');
  for (const bad of [1.5, -0, NaN, 2 ** 53]) assert.throws(() => canonical({ x: bad }));
});

test("merkle: RFC 6962 reference vectors, every proof verifies, tampering fails", () => {
  const ct = ["", "00", "10", "2021", "3031", "40414243", "5051525354555657", "606162636465666768696a6b6c6d6e6f"].map((x) => hex(leafHash(fromHex(x))));
  assert.equal(ct[0], "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d");
  assert.equal(merkleRoot(ct), "5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328");
  assert.equal(merkleRoot(ct.slice(0, 7)), "ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c");
  for (let n = 1; n <= 33; n++) {
    const leaves = Array.from({ length: n }, (_, i) => recordLeaf({ i }));
    const root = merkleRoot(leaves);
    for (let i = 0; i < n; i++) {
      const p = inclusionProof(leaves, i);
      assert.ok(verifyInclusion(p, root), `${n}/${i}`);
      if (n > 1) {
        assert.equal(verifyInclusion({ ...p, index: (i + 1) % n }, root), false, "wrong index");
        assert.equal(verifyInclusion({ ...p, leaf: recordLeaf({ i: -1 }) }, root), false, "wrong leaf");
      }
    }
  }
});

test("bitcoin: a real mainnet transaction (block 170) verifies offline, and every tampering fails", () => {
  const p = B170.proof;
  const ok = verifyTxProof(p, { anchors: { 170: B170.block_hash }, expectTxid: p.txid });
  assert.equal(ok.status, "chain-verified", JSON.stringify(ok.checks.filter((c) => !c.ok)));
  assert.equal(verifyTxProof(p, { expectTxid: p.txid }).status, "proof-valid-unanchored", "no anchor, no chain-verified");
  assert.equal(verifyTxProof(p, { anchors: { 170: "00".repeat(32) } }).status, "invalid", "a contradicting anchor fails");
  const flip = (h, i) => h.slice(0, i) + (h[i] === "0" ? "1" : "0") + h.slice(i + 1);
  assert.equal(verifyTxProof({ ...p, tx_hex: flip(p.tx_hex, 200) }).ok, false, "changed transaction");
  assert.equal(verifyTxProof({ ...p, merkle: [flip(p.merkle[0], 5)] }).ok, false, "changed branch");
  assert.equal(verifyTxProof({ ...p, pos: 0 }).ok, false, "wrong position");
  assert.equal(verifyTxProof({ ...p, header_hex: flip(p.header_hex, 150) }).ok, false, "changed header");
  assert.equal(verifyTxProof({ ...p, merkle: [] }).ok, false, "missing branch");
  assert.equal(verifyTxProof({ ...p, network: "bogus" }).ok, false);
  assert.equal(parseHeader(p.header_hex).hash, B170.block_hash);
});

test("bitcoin: simulated regtest proofs can never pass as mainnet", () => {
  const proof = demo.records.find((r) => r.id === "proof-withdrawal");
  const anchors = JSON.parse(demo.files["regtest-anchors.json"]).anchors.regtest;
  assert.equal(verifyTxProof(proof, { anchors }).status, "chain-verified");
  const asMainnet = verifyTxProof({ ...proof, network: "mainnet" }, { anchors });
  assert.equal(asMainnet.ok, false);
  assert.equal(asMainnet.checks.find((c) => c.id === "network-difficulty").ok, false);
});

test("bitcoin: transaction parsing is strict; 64-byte transactions are refused as proofs", () => {
  const tx = parseTx(B170.proof.tx_hex);
  assert.equal(tx.txid, B170.proof.txid);
  assert.equal(tx.outputs[0].value_sats, 1000000000);
  for (const bad of [B170.proof.tx_hex + "00", B170.proof.tx_hex.slice(0, -2), "01000000", "zz"]) assert.throws(() => parseTx(bad));
  const tiny = "01000000" + "01" + "00".repeat(32) + "00000000" + "00" + "ffffffff" + "01" + "0000000000000000" + "00" + "00000000";
  assert.equal(parseTx(tiny).stripped_size, 60);
  const sixtyFour = "01000000" + "01" + "00".repeat(32) + "00000000" + "04" + "51515151" + "ffffffff" + "01" + "0000000000000000" + "00" + "00000000";
  assert.equal(parseTx(sixtyFour).stripped_size, 64);
  const r = verifyTxProof({ network: "regtest", tx_hex: sixtyFour, header_hex: B170.proof.header_hex, merkle: [], pos: 0 });
  assert.equal(r.checks.find((c) => c.id === "not-64-bytes").ok, false);
  const overSupply = "01000000" + "01" + "00".repeat(32) + "00000000" + "00" + "ffffffff" + "01" + "ffffffffffffffff" + "00" + "00000000";
  assert.throws(() => parseTx(overSupply), /21 million/);
});

test("bitcoin: addresses match BIP 173/350 vectors and refuse other networks", () => {
  const v = [["BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4", "0014751e76e8199196d454941c45d1b3a323f1433bd6"], ["bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0", "512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"], ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac"], ["3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "a914b472a266d0bd89c13706a4132ccfb16f7c3b9fcb87"]];
  for (const [a, s] of v) { assert.equal(addressToScript(a), s); assert.equal(scriptToAddress(s), /^bc1/i.test(a) ? a.toLowerCase() : a); }
  for (const bad of ["bc1zw508d6qejxtdg4y5r3zarvaryvqyzf3du", "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5"]) assert.throws(() => addressToScript(bad), bad);
});

test("money: integer minor units, BigInt rates, no float drift", () => {
  assert.equal(convert(86087, "BTC", "USD", "115000.00"), 9900);
  assert.equal(convert(-50000, "BTC", "USD", "120000.00"), -6000);
  assert.equal(convert(1, "BTC", "USD", "0.000001"), 0);
  assert.equal(effectiveRate(10000, "USD", 86087, "BTC"), "116161.56");
  for (const bad of ["1e5", "-1", "0", "1,000", ""]) assert.throws(() => convert(1, "BTC", "USD", bad), bad);
});

test("demo: regenerates byte-for-byte and matches the committed files", () => {
  for (const [f, text] of Object.entries(demo.files)) assert.equal(readFileSync(`treasury/demo/${f}`, "utf8"), text, f);
  assert.deepEqual(validateJournal(demo.records), []);
  assert.ok(demo.records.every((r) => r.simulated === true), "every record says it is simulated");
});

test("journal: history can't be edited, reordered or truncated without breaking the chain", () => {
  const recs = demo.records;
  assert.match(errs(edit(recs, "apple-payment-2026-11", (r) => { r.postings[0].amount += 1; r.postings[1].amount -= 1; return r; })), /previous record's leaf hash/);
  const swapped = [...recs]; [swapped[20], swapped[21]] = [swapped[21], swapped[20]];
  assert.match(errs(swapped), /expected 21|leaf hash/);
  assert.match(errs(recs.filter((r) => r.id !== "src-bank")), /expected|leaf hash/);
  const forged = rechain(edit(recs, "apple-payment-2026-11", (r) => { r.description = "rewritten"; return r; }));
  assert.deepEqual(validateJournal(forged), [], "a fully re-chained rewrite validates on its own…");
  assert.equal(appendCheck(recs, forged).ok, false, "…but not against what was already published");
  const more = appendRecords(recs, [{ type: "attention", id: "attention-extra", role: "maintainer", period_start: "2026-12-01", period_end: "2026-12-31", minutes: null, simulated: true }]);
  assert.deepEqual(appendCheck(recs, more), { ok: true, appended: 1 });
  assert.equal(appendCheck(more, recs).ok, false, "truncation");
});

function tiny(extra = []) {
  return appendRecords([], [
    { type: "journal", id: "journal", qmt: "0.1", entity: "Test", base_currency: "USD" },
    { type: "account", id: "assets:bank", kind: "asset", commodity: "USD", description: "Bank" },
    { type: "account", id: "assets:btc", kind: "asset", commodity: "BTC", description: "Custodial bitcoin" },
    { type: "account", id: "assets:cold", kind: "asset", commodity: "BTC", description: "Cold", onchain: { network: "mainnet", addresses: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"] } },
    { type: "account", id: "income:sales", kind: "income", commodity: "USD", description: "Sales" },
    { type: "account", id: "income:btc", kind: "income", commodity: "BTC", description: "BTC income" },
    { type: "account", id: "expenses:hosting", kind: "expense", commodity: "USD", description: "Hosting" },
    { type: "account", id: "equity:conv:usd", kind: "equity", commodity: "USD", description: "Conversion", conversion: true },
    { type: "account", id: "equity:conv:btc", kind: "equity", commodity: "BTC", description: "Conversion", conversion: true },
    { type: "source", id: "bank", kind: "bank-statement", description: "Statement", operator_supplied: true, retrieved_at: "2026-10-19T00:00:00Z" },
    { type: "source", id: "chain", kind: "chain", description: "Chain", operator_supplied: false, retrieved_at: "2026-10-19T00:00:00Z" },
    ...extra,
  ]);
}
const ev = { source: "bank" };
const tx = (id, kind, postings, more = {}) => ({ type: "transaction", id, kind, status: "posted", occurred_at: "2026-10-19T00:00:00Z", description: "t", privacy: "public", postings, ...more });

test("journal: fiat-to-bitcoin conversions are never revenue, and off-chain money is never chain-verified", () => {
  assert.deepEqual(validateJournal(tiny([tx("sale", "sale", [{ account: "assets:bank", amount: 500, commodity: "USD", evidence: ev }, { account: "income:sales", amount: -500, commodity: "USD", evidence: ev }])])), []);
  const disguised = tx("buy", "sale", [{ account: "assets:bank", amount: -500, commodity: "USD", evidence: ev }, { account: "assets:btc", amount: 4000, commodity: "BTC", evidence: ev }, { account: "income:btc", amount: -4000, commodity: "BTC", evidence: ev }, { account: "income:sales", amount: 500, commodity: "USD", evidence: ev }]);
  assert.match(errs(tiny([disguised])), /only conversion and settlement entries mix commodities/);
  const conv = tx("buy", "conversion", [{ account: "assets:bank", amount: -500, commodity: "USD", evidence: ev }, { account: "income:btc", amount: -4000, commodity: "BTC", evidence: ev }, { account: "assets:btc", amount: 4000, commodity: "BTC", evidence: ev }, { account: "equity:conv:usd", amount: 500, commodity: "USD" }]);
  assert.match(errs(tiny([conv])), /can't touch income/);
  assert.match(errs(tiny([tx("t", "transfer", [{ account: "assets:bank", amount: -5, commodity: "USD", evidence: ev }, { account: "income:sales", amount: 5, commodity: "USD", evidence: ev }])])), /can't touch income/);
  assert.match(errs(tiny([tx("u", "transfer", [{ account: "assets:bank", amount: -5, commodity: "USD", evidence: ev }, { account: "expenses:hosting", amount: 4, commodity: "USD", evidence: ev }])])), /doesn't balance/);
  assert.match(errs(tiny([tx("c", "expense", [{ account: "assets:bank", amount: -5, commodity: "USD", evidence: { source: "chain" } }, { account: "expenses:hosting", amount: 5, commodity: "USD", evidence: ev }])])), /never blockchain-verified/);
  assert.match(errs(tiny([tx("f", "expense", [{ account: "assets:bank", amount: -5.5, commodity: "USD", evidence: ev }, { account: "expenses:hosting", amount: 5.5, commodity: "USD", evidence: ev }])])), /integer/);
  assert.match(errs(tiny([tx("n", "expense", [{ account: "assets:bank", amount: -5, commodity: "USD" }, { account: "expenses:hosting", amount: 5, commodity: "USD", evidence: ev }])])), /cite evidence/);
});

test("journal: chain evidence must match the proven transaction's amounts", () => {
  const proof = { type: "chain_proof", id: "p170", ...B170.proof, source: "chain" };
  const pay = (sats) => tx("in", "deposit", [{ account: "assets:cold", amount: sats, commodity: "BTC", evidence: { source: "chain" } }, { account: "assets:btc", amount: -sats, commodity: "BTC", evidence: ev }], { chain_proof: "p170" });
  // Block 170 pays nothing to the genesis address, so any positive deposit to it is refused.
  assert.match(errs(tiny([proof, pay(1000)])), /pays 0 sats/);
  assert.match(errs(tiny([{ ...proof, txid: "00".repeat(32) }])), /doesn't match the transaction bytes/);
  assert.match(errs(tiny([proof, tx("x", "deposit", [{ account: "assets:cold", amount: 5, commodity: "BTC", evidence: { source: "chain" } }, { account: "assets:btc", amount: -5, commodity: "BTC", evidence: ev }])])), /needs a chain_proof/);
});

test("journal: reversals, privacy classes, key material and account numbers", () => {
  const sale = tx("sale", "sale", [{ account: "assets:bank", amount: 500, commodity: "USD", evidence: ev }, { account: "income:sales", amount: -500, commodity: "USD", evidence: ev }]);
  const rev = (amt) => tx("rev", "reversal", [{ account: "assets:bank", amount: -amt, commodity: "USD" }, { account: "income:sales", amount: amt, commodity: "USD" }], { reverses: "sale" });
  assert.deepEqual(validateJournal(tiny([sale, rev(500)])), []);
  assert.match(errs(tiny([sale, rev(400)])), /negates the original/);
  assert.match(errs(tiny([sale, rev(500), { ...rev(500), id: "rev2" }])), /already reversed/);
  assert.match(errs(tiny([{ ...sale, privacy: "committed" }])), /salt/);
  assert.match(errs(tiny([{ ...sale, description: "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi" }])), /extended private key/);
  assert.match(errs(tiny([{ ...sale, description: "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ" }])), /WIF/);
  assert.match(errs(tiny([{ ...sale, description: "deposit to account 4417123456" }])), /account identifier/);
  assert.match(errs(tiny([{ ...sale, description: "card 4111 1111 1111 1111" }])), /card or account number/);
  assert.match(errs([...tiny([sale]), { seq: 13, prev: recordLeaf(tiny([sale]).at(-1)), type: "transaction", id: "sim", simulated: true }]), /simulated records can't appear in a real journal/);
});

test("journal: works with no bitcoin and no payment provider at all", () => {
  const fiat = appendRecords([], [
    { type: "journal", id: "journal", qmt: "0.1", entity: "Fiat only", base_currency: "USD" },
    { type: "account", id: "assets:bank", kind: "asset", commodity: "USD", description: "Bank" },
    { type: "account", id: "income:grants", kind: "income", commodity: "USD", description: "Grants" },
    { type: "source", id: "manual", kind: "manual", description: "Maintainer's record", operator_supplied: true, retrieved_at: "2026-10-19T00:00:00Z" },
    tx("grant", "donation", [{ account: "assets:bank", amount: 100000, commodity: "USD", evidence: { source: "manual" } }, { account: "income:grants", amount: -100000, commodity: "USD", evidence: { source: "manual" } }]),
  ]);
  const s = buildSnapshot(fiat);
  assert.equal(s.error, undefined);
  assert.deepEqual(s.snapshot.chain.proofs, []);
  assert.equal(s.snapshot.evidence_counts["self-reported"], 2);
  assert.ok(verifyPublic(s.public_journal, s.snapshot).ok);
});

test("snapshot: anyone can verify the public journal; withheld records stay verifiable on disclosure", () => {
  const { snapshot, public_journal: pub } = demo.snapshot;
  assert.ok(verifyPublic(pub, snapshot).ok);
  assert.equal(snapshot.journal.withheld, 2, "the private donation and the single refund (below the aggregate threshold)");
  const hidden = demo.records.find((r) => r.id.startsWith("bank-") && r.privacy === "committed");
  assert.ok(!serializeJournal(pub).includes(hidden.salt), "salts of withheld records are never published");
  const proof = proveRecord(pub, hidden.seq);
  assert.ok(checkDisclosure(hidden, proof, snapshot.journal.merkle_root), "an auditor shown the record can check it against the root");
  assert.equal(checkDisclosure({ ...hidden, postings: hidden.postings.map((p) => ({ ...p, amount: p.amount * 2 })) }, proof, snapshot.journal.merkle_root), false, "an altered disclosure fails");
  assert.equal(checkDisclosure({ ...hidden, salt: "0".repeat(64) }, proof, snapshot.journal.merkle_root), false, "without the right salt the amount can't be confirmed by guessing");
  const tampered = pub.map((r, i) => (i === 25 ? { ...r, description: "changed" } : r));
  assert.equal(verifyPublic(tampered, snapshot).ok, false);
  assert.equal(verifyPublic(pub.slice(0, -1), snapshot).ok, false);
  assert.ok(snapshot.statements.some((s) => /doesn't prove the operator's complete finances/.test(s)));
});

test("ledger: custody follows coins, catches unproven spends and wrong fees; lots carry basis", () => {
  const rep = fullReport(demo.records, JSON.parse(demo.files["regtest-anchors.json"]).anchors);
  assert.deepEqual(rep.custody.issues, []);
  assert.equal(rep.custody.proven_balance_sats["assets:treasury:btc"], 56073);
  assert.equal(rep.balances["assets:treasury:btc"].BTC, 56073, "books equal the proven coins");
  assert.equal(rep.custody.spends[0].network_fee_sats, 1200);
  assert.equal(rep.evidence.counts["chain-verified"], 4);
  assert.equal(fullReport(demo.records).evidence.counts["chain-verified"], 0, "nothing is chain-verified without the viewer's own anchors");
  assert.deepEqual(rep.lots.disposals.map((d) => [d.sats, d.proceeds_cents, d.basis_cents, d.gain_cents]), [[50000, 6000, 5808, 192]]);
  assert.equal(rep.conversions[0].effective_rate, "116161.56");
  const flow = rep.flows.find((f) => f[0].transaction.startsWith("apple-"));
  assert.deepEqual(flow.map((s) => s.kind), ["sale", "settlement", "transfer", "conversion", "withdrawal"]);
  const noDeposit = demo.records.filter((r) => r.id !== "exchange-withdrawal-2026-11-14");
  const custody = chainCustody(index(rechain(noDeposit)));
  assert.ok(custody.issues.some((i) => /chain shows/.test(i.issue)), "a spend of coins the journal never proved arriving is flagged");
  const wrongFee = rechain(edit(demo.records, "pay-design-studio-2026-12-01", (r) => { r.postings[1].amount = 1000; r.postings[0].amount = 50200; r.postings[1].value.amount = 120; r.postings[0].value.amount = 6024; return r; }));
  assert.ok(chainCustody(index(wrongFee)).issues.some((i) => /network fee/.test(i.issue)));
});

test("apple: both header spellings, footers ignored, mismatched rows flagged, gzip accepted", () => {
  const tsv = demo.files["sources/apple-financial-US-2026-09.txt"];
  const parsed = parseFinancialReport(tsv);
  assert.equal(parsed.rows.length, 3);
  const older = tsv.replace("ISRC / ISBN", "ISRC/ISBN").replace("Sale or Return", "Sales or Return").replace("Country of Sale", "Country Of Sale");
  assert.deepEqual(parseFinancialReport(older).rows, parsed.rows);
  const withFooter = parseFinancialReport(tsv + "Total_Rows\t3\nTotal_Amount\t104.49\n");
  assert.equal(withFooter.rows.length, 3);
  assert.equal(withFooter.footer.length, 2);
  const wrong = parseFinancialReport(tsv.replace("83.88", "93.88"));
  assert.ok(wrong.issues.some((i) => /Quantity x Partner Share/.test(i.issue)));
  const { proposals } = appleProposals(parsed, { source: "s", accounts: { income: "i", commission: "c", receivable: "r" } });
  assert.deepEqual(proposals.map((p) => [p.kind, p.postings.map((q) => q.amount)]), [["sale", [-15948, 4800, 11148]], ["refund", [999, -300, -699]]]);
  const gz = gzipSync(tsv);
  const dir = `${process.env.TMPDIR ?? "/tmp"}/qmt-${process.pid}.txt.gz`;
  spawnSync("sh", ["-c", `cat > ${dir}`], { input: gz });
  const cli = spawnSync(process.execPath, ["bin/qm.mjs", "treasury", "import", "apple", dir, "--source", "s", "--income", "i", "--commission", "c", "--receivable", "r"], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).proposals.length, 2);
  for (const bad of ["", "just\ttext\n", tsv.replace("Partner Share Currency", "Currency")]) assert.throws(() => parseFinancialReport(bad));
  assert.ok(parseFinancialReport(tsv.replace("08/30/2026", "13/45/2026")).footer.length + parseFinancialReport(tsv.replace("08/30/2026", "13/45/2026")).issues.length >= 1);
});

test("statements: declared profiles only, parentheses and debit/credit columns, unmatched rows never booked", () => {
  const dc = parseStatement("Date,Description,Debit,Credit\n10/01/2026,COFFEE,4.50,\n10/02/2026,REFUND,,1.25\n", "generic-debit-credit");
  assert.deepEqual(dc.rows.map((r) => r.amount), [-450, 125]);
  const paren = parseStatement("Date,Description,Amount\n2026-10-01,FEE,\"($1,234.50)\"\n", "generic-signed");
  assert.deepEqual(paren.rows.map((r) => r.amount), [-123450]);
  const k = parseStatement(demo.files["sources/exchange-ledgers.csv"], "kraken-ledgers");
  assert.deepEqual(k.rows.map((r) => [r.asset, r.amount, r.fee]), [["USD", 10000, 0], ["USD", -9900, 100], ["BTC", 86087, 0], ["BTC", -86087, 0]]);
  assert.throws(() => parseStatement("When,What,How much\n", "generic-signed"), /lacks the profile's columns/);
  const r = statementProposals(parseStatement(demo.files["sources/bank-statement.csv"], "generic-signed"), { account: "a", source: "s", rules: [{ match: "HOSTING", counter: "e", kind: "expense" }], idPrefix: "b" });
  assert.equal(r.proposals.length, 1);
  assert.equal(r.unmatched.length, 3);
  assert.ok(parseStatement("Date,Description,Amount\n2026-10-01,X,1.234\n", "generic-signed").issues.length, "sub-cent amounts are refused, not rounded");
});

test("btcpay: settled on-chain invoices only, ids hashed, client is GET-only with the key never echoed", async () => {
  const d = JSON.parse(demo.files["sources/btcpay-invoice.json"]);
  const inv = normalizeInvoice(d.invoice, d.payment_methods);
  assert.equal(inv.payments[0].value_sats, 21186);
  const prop = btcpayProposal(inv, { source: "s", accounts: { treasury: "t", income: "i" } }).proposal;
  assert.ok(!JSON.stringify(prop).includes(d.invoice.id), "the invoice id itself isn't published");
  assert.match(btcpayProposal({ ...inv, status: "Expired" }, { source: "s", accounts: {} }).skipped, /only settled/);
  assert.throws(() => normalizeInvoice({ ...d.invoice, status: "Bogus" }, []));
  const calls = [];
  const fake = async (url, init) => { calls.push([String(url), init.method, init.headers.Authorization]); return { ok: false, status: 403, json: async () => ({}) }; };
  const c = btcpayClient({ baseUrl: "https://pay.example", apiKey: "SECRETKEY", fetch: fake });
  await assert.rejects(c.getInvoice("abc"), (e) => !String(e.message).includes("SECRETKEY") && /403/.test(e.message));
  assert.deepEqual(calls[0].slice(0, 2), ["https://pay.example/api/v1/invoices/abc", "GET"]);
  assert.throws(() => btcpayClient({ baseUrl: "http://pay.example", apiKey: "k", fetch: fake }), /https/);
});

test("esplora: GET-only, explorer data re-checked, anchors need agreeing sources", async () => {
  const p = B170.proof;
  const routes = {
    [`/tx/${p.txid}/hex`]: p.tx_hex, [`/tx/${p.txid}/merkle-proof`]: JSON.stringify({ block_height: 170, merkle: p.merkle, pos: p.pos }),
    [`/tx/${p.txid}/status`]: JSON.stringify({ confirmed: true, block_height: 170, block_hash: B170.block_hash }), [`/block/${B170.block_hash}/header`]: p.header_hex, "/block-height/170": B170.block_hash,
  };
  const mk = (over = {}) => esploraClient({ baseUrl: "https://explorer.example/api", fetch: async (url, init) => { assert.equal(init.method, "GET"); const k = String(url).replace("https://explorer.example/api", ""); const body = over[k] ?? routes[k]; return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => body }; } });
  const proof = await fetchProof(mk(), p.txid, { id: "x", source: "chain" });
  assert.equal(verifyTxProof(proof, { anchors: { 170: B170.block_hash } }).status, "chain-verified");
  await assert.rejects(fetchProof(mk({ [`/tx/${p.txid}/hex`]: B170.proof.tx_hex.replace("0100000001", "0200000001") }), p.txid, { id: "x", source: "chain" }), /different transaction/);
  const agree = await confirmAnchors([170], [mk(), mk()]);
  assert.deepEqual(agree.anchors, { 170: B170.block_hash });
  const liar = await confirmAnchors([170], [mk(), mk({ "/block-height/170": "11".repeat(32) })]);
  assert.deepEqual(liar.anchors, {});
  assert.deepEqual((await confirmAnchors([170], [mk()])).anchors, {}, "one source is never enough");
  assert.throws(() => esploraClient({ baseUrl: "http://explorer.example" }), /https/);
  await assert.rejects(mk({ [`/tx/${p.txid}/hex`]: "<html>" }).txHex(p.txid), /malformed/);
  const obs = observations([{ txid: "t", status: { confirmed: true, block_height: 1 }, vout: [{ scriptpubkey: "76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac", value: 5000 }], vin: [] }], ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"]);
  assert.deepEqual(obs.map((o) => [o.net_sats, o.basis]), [[5000, "explorer-reported"]]);
});

test("cli: validate, verify, prove and append-check run on the published demo", () => {
  const run = (...a) => spawnSync(process.execPath, ["../../bin/qm.mjs", "treasury", ...a], { encoding: "utf8", cwd: "treasury/demo" });
  assert.equal(run("validate", "journal.jsonl").status, 0);
  const v = run("verify", "public-journal.jsonl", "snapshot.json");
  assert.equal(v.status, 0, v.stdout);
  assert.equal(JSON.parse(v.stdout).snapshot_sha256, readFileSync("treasury/demo/snapshot.sha256", "utf8").split(" ")[0]);
  assert.equal(run("append-check", "journal.jsonl", "public-journal.jsonl").status, 0, "a redacted copy keeps every leaf hash, so it checks against the private journal");
  assert.equal(run("append-check", "public-journal.jsonl", "public-journal.jsonl").status, 0);
  const chain = run("chain-check", "../../test/fixtures/treasury/block170.json");
  assert.equal(chain.status, 1, "the fixture wraps the proof; chain-check wants a proof file");
  assert.equal(run("nonsense").status, 1);
  assert.match(run("--help").stdout, /Nothing here holds keys/);
  assert.ok(parseJournal(readFileSync("treasury/demo/public-journal.jsonl", "utf8")).length === 45);
});

test("schema: every demo record, private and public, matches the published JSON Schema", async () => {
  const { default: Ajv2020 } = await import("ajv/dist/2020.js");
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const check = ajv.compile(JSON.parse(readFileSync("spec/quartermaster/qmt-0.1.schema.json", "utf8")));
  for (const r of [...demo.records, ...demo.snapshot.public_journal]) assert.ok(check(r), `${r.id ?? r.seq}: ${JSON.stringify(check.errors?.slice(0, 2))}`);
  assert.equal(check({ seq: 1, prev: "0".repeat(64), type: "transaction", id: "x", kind: "sale", status: "posted", occurred_at: "2026-10-19T00:00:00Z", description: "d", privacy: "public", postings: [{ account: "a", amount: 1.5, commodity: "USD" }, { account: "b", amount: -1.5, commodity: "USD" }] }), false, "fractional minor units");
});

test("bitcoin: the genesis block's coinbase verifies against the well-known genesis hash", () => {
  const tx = "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";
  const header = "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c";
  const r = verifyTxProof({ network: "mainnet", tx_hex: tx, header_hex: header, merkle: [], pos: 0, block_height: 0 }, { anchors: { 0: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f" }, expectTxid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b" });
  assert.equal(r.status, "chain-verified");
});

test("[simulated] /treasury/ page: the in-browser check recomputes the published root, and the page never shows withheld details", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const html = readFileSync("_site/treasury/index.html", "utf8");
  assert.match(html, /has no treasury/);
  assert.match(html, /simulated example/i);
  const hidden = demo.records.filter((r) => r.type === "transaction" && demo.snapshot.public_journal[r.seq - 1].type === "commitment");
  for (const r of hidden) assert.ok(!html.includes(r.description), `withheld record ${r.seq} isn't described on the page`);
  const nodes = [];
  const mk = (tag) => { const n = { tag, children: [], textContent: "", append(...k) { this.children.push(...k); }, replaceChildren() { this.children = []; }, focus() { this.focused = true; } }; nodes.push(n); return n; };
  const out = mk("div"), live = mk("p"), button = { disabled: false };
  let submit;
  const form = { elements: { seq: { value: "30" } }, querySelector: () => button, addEventListener: (_, fn) => { submit = fn; } };
  const root = { hidden: true, querySelector: (s) => ({ "[data-results]": out, "[data-live]": live, form }[s]) };
  globalThis.document = { querySelectorAll: (s) => (s === "[data-jrc-treasury]" ? [root] : []), createElement: mk };
  globalThis.fetch = async (url) => ({ text: async () => readFileSync(`_site${url}`, "utf8"), json: async () => JSON.parse(readFileSync(`_site${url}`, "utf8")) });
  const src = readFileSync("_site/assets/treasury.js", "utf8").replaceAll('"/js/lib/', JSON.stringify(pathToFileURL(path.resolve("_site/js/lib")).href + "/").slice(0, -1));
  const tmp = path.join(mkdtempSync(path.join(tmpdir(), "jrc-treasury-")), "treasury.mjs");
  writeFileSync(tmp, src);
  await import(pathToFileURL(tmp).href);
  assert.equal(root.hidden, false);
  await submit({ preventDefault() {} });
  const text = out.children.map((c) => c.textContent).join("\n");
  assert.match(text, /Roots match: yes/);
  assert.match(text, /Hash chain intact: yes/);
  assert.match(text, /verifies against the published root: yes/);
  assert.equal(live.textContent, "Record 30 verified.");
  form.elements.seq.value = "999";
  await submit({ preventDefault() {} });
  assert.match(live.textContent, /Choose a record from 1 to 45/);
  delete globalThis.document;
});
