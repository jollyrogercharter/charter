// Generates the SIMULATED Apple-to-Bitcoin treasury example in treasury/demo/. Every value is a fixture; no real money, account or key exists.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addressToScript, scriptToAddress } from "../lib/treasury/bitcoin/address.mjs";
import { parseHeader, parseTx, targetFromBits } from "../lib/treasury/bitcoin/tx.mjs";
import { appleProposals, parseFinancialReport } from "../lib/treasury/adapters/apple.mjs";
import { btcpayProposal, normalizeInvoice } from "../lib/treasury/adapters/btcpay.mjs";
import { parseStatement, statementProposals, tradeProposals } from "../lib/treasury/adapters/csv-statements.mjs";
import { appendRecords, serializeJournal, validateJournal } from "../lib/treasury/journal.mjs";
import { canonical } from "../lib/treasury/merkle.mjs";
import { convert } from "../lib/treasury/money.mjs";
import { buildSnapshot } from "../lib/treasury/snapshot.mjs";
import { concat, fromHex, hex, sha256, sha256d, sha256Hex } from "../lib/treasury/sha256.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "treasury/demo");
const SIM = true;

export function buildDemo() {
  // ---- Simulated regtest chain. Output scripts hash a public phrase, so no private key exists for any of them. ----
  const program = (label) => sha256(`JRC SIMULATED ${label}: no private key exists`).subarray(0, 20);
  const p2wpkh = (label) => `0014${hex(program(label))}`;
  const T1 = scriptToAddress(p2wpkh("treasury address 1"), "regtest");
  const T2 = scriptToAddress(p2wpkh("treasury address 2"), "regtest");
  const T3 = scriptToAddress(p2wpkh("treasury address 3"), "regtest");
  const le = (n, bytes) => { const b = new Uint8Array(bytes); let v = BigInt(n); for (let i = 0; i < bytes; i++) { b[i] = Number(v & 0xffn); v >>= 8n; } return b; };
  const varint = (n) => (n < 0xfd ? new Uint8Array([n]) : concat(new Uint8Array([0xfd]), le(n, 2)));
  const script = (h) => { const b = fromHex(h); return concat(varint(b.length), b); };
  function tx(inputs, outputs) {
    return hex(concat(le(2, 4), varint(inputs.length), ...inputs.map((i) => concat(fromHex(i.txid).reverse(), le(i.vout, 4), script(i.script_sig ?? ""), le(0xffffffff, 4))),
      varint(outputs.length), ...outputs.map((o) => concat(le(o.sats, 8), script(o.script))), le(0, 4)));
  }
  const coinbase = (height) => tx([{ txid: "00".repeat(32), vout: 0xffffffff, script_sig: `03${hex(le(height, 3))}${hex(new TextEncoder().encode("JRC simulated block"))}` }], [{ sats: 0, script: `6a${hex(varint(9))}${hex(new TextEncoder().encode("simulated"))}` }]);
  const fakePrevout = (label) => hex(sha256d(`JRC SIMULATED prevout ${label}`).reverse());

  function merkleBranch(txids, index) {
    let level = txids.map((t) => fromHex(t).reverse()), idx = index;
    const branch = [];
    while (level.length > 1) {
      if (level.length % 2) level.push(level.at(-1));
      branch.push(hex(level[idx ^ 1].slice().reverse()));
      const next = [];
      for (let i = 0; i < level.length; i += 2) next.push(sha256d(concat(level[i], level[i + 1])));
      level = next; idx >>= 1;
    }
    return { root: hex(level[0].slice().reverse()), branch };
  }

  function mine(prevHash, merkleRootDisplay, time) {
    const bits = 0x207fffff, target = targetFromBits(bits);
    for (let nonce = 0; ; nonce++) {
      const header = hex(concat(le(0x20000000, 4), fromHex(prevHash).reverse(), fromHex(merkleRootDisplay).reverse(), le(time, 4), le(bits, 4), le(nonce, 4)));
      if (BigInt(`0x${parseHeader(header).hash}`) <= target) return header;
    }
  }

  function block(height, prevHash, txHexes, time) {
    const txids = txHexes.map((h) => parseTx(h).txid);
    const header = mine(prevHash, merkleBranch(txids, 0).root, time);
    return { height, header, hash: parseHeader(header).hash, txs: txHexes.map((h, i) => ({ hex: h, txid: txids[i], ...merkleBranch(txids, i) })) };
  }

  const unix = (iso) => Date.parse(iso) / 1000;
  const SATS_BOUGHT = 86087, DONATION_SATS = 21186, PAID_SATS = 50000, FEE_SATS = 1200;
  const withdrawTx = tx([{ txid: fakePrevout("exchange hot wallet"), vout: 3 }], [{ sats: SATS_BOUGHT, script: addressToScript(T1, "regtest") }, { sats: 912345, script: p2wpkh("exchange change") }]);
  const donationTx = tx([{ txid: fakePrevout("donor wallet"), vout: 0 }], [{ sats: DONATION_SATS, script: addressToScript(T2, "regtest") }, { sats: 40000, script: p2wpkh("donor change") }]);
  const b1 = block(1001, hex(sha256d("JRC SIMULATED regtest block 1000")), [coinbase(1001), withdrawTx], unix("2026-11-14T10:20:00Z"));
  const b2 = block(1002, b1.hash, [coinbase(1002), donationTx], unix("2026-11-20T16:05:00Z"));
  const W = parseTx(withdrawTx).txid, D = parseTx(donationTx).txid;
  const spendTx = tx([{ txid: W, vout: 0 }, { txid: D, vout: 0 }], [{ sats: PAID_SATS, script: p2wpkh("design studio payee") }, { sats: SATS_BOUGHT + DONATION_SATS - PAID_SATS - FEE_SATS, script: addressToScript(T3, "regtest") }]);
  const b3 = block(1003, b2.hash, [coinbase(1003), spendTx], unix("2026-12-01T09:00:00Z"));
  const proof = (b, i, id) => ({ type: "chain_proof", id, network: "regtest", txid: b.txs[i].txid, tx_hex: b.txs[i].hex, header_hex: b.header, merkle: b.txs[i].branch, pos: i, block_height: b.height, source: "src-chain", simulated: SIM });

  // ---- Simulated source documents, in the formats the adapters read. ----
  const T = "\t";
  const appleHeader = ["Start Date", "End Date", "UPC", "ISRC / ISBN", "Vendor Identifier", "Quantity", "Partner Share", "Extended Partner Share", "Partner Share Currency", "Sale or Return", "Apple Identifier", "Artist / Show / Developer / Author", "Title", "Label / Studio / Network / Developer / Publisher", "Grid", "Product Type Identifier", "ISAN / Other Identifier", "Country of Sale", "Pre-order Flag", "Promo Code", "Customer Price", "Customer Currency"];
  const appleRow = (sku, qty, share, ext, sr, type, price) => ["08/30/2026", "09/26/2026", "", sku, sku, qty, share, ext, "USD", sr, "1000000001", "Example Project (SIMULATED)", sku, "", "", type, "", "US", "", "", price, "USD"].join(T);
  const appleTsv = [appleHeader.join(T), appleRow("EX-PRO-YEARLY", 12, "6.99", "83.88", "S", "IAY", "9.99"), appleRow("EX-TIP-SMALL", 40, "0.69", "27.60", "S", "IA1", "0.99"), appleRow("EX-PRO-YEARLY", -1, "6.99", "-6.99", "R", "IAY", "9.99")].join("\n") + "\n";
  const bankCsv = ["Date,Description,Amount", "2026-10-15,INCOMING TRANSFER PRIVATE DONOR,50.00", "2026-11-05,APPLE DEVELOPER PROCEEDS,104.49", "2026-11-06,ACH TRANSFER TO EXCHANGE,-100.00", "2026-11-20,EXAMPLE HOSTING CO,-25.00"].join("\n") + "\n";
  const exchangeCsv = ["txid,refid,time,type,subtype,aclass,asset,amount,fee,balance", "L1,R-DEP-1,2026-11-06 14:00:00,deposit,,currency,ZUSD,100.0000,0.0000,100.0000", "L2,R-TRD-1,2026-11-13 15:30:00,trade,,currency,ZUSD,-99.0000,1.0000,0.0000", "L3,R-TRD-1,2026-11-13 15:30:00,trade,,currency,XXBT,0.0008608700,0.0000000000,0.0008608700", "L4,R-WD-1,2026-11-14 10:00:00,withdrawal,,currency,XXBT,-0.0008608700,0.0000000000,0.0000000000"].join("\n") + "\n";
  const btcpayInvoice = { id: "SIMinv7Qd2", storeId: "SIMstore", amount: "25.00", paidAmount: "25.00", currency: "USD", type: "Standard", createdTime: unix("2026-11-20T15:58:00Z"), expirationTime: unix("2026-11-20T16:13:00Z"), status: "Settled", additionalStatus: "None", metadata: {} };
  const btcpayMethods = [{ paymentMethodId: "BTC-CHAIN", currency: "BTC", destination: T2, rate: "118000.00", amount: "0.00021186", due: "0.00000000", payments: [{ id: `${D}-0`, receivedDate: unix("2026-11-20T16:01:00Z"), value: "0.00021186", fee: "0.00000000", status: "Settled", destination: T2 }] }];

  // ---- Journal ----
  const base = { simulated: SIM };
  const acct = (id, kind, commodity, description, extra = {}) => ({ type: "account", id, kind, commodity, description, ...extra, ...base });
  const src = (id, kind, description, operator_supplied, doc) => ({ type: "source", id, kind, description, operator_supplied, retrieved_at: "2026-12-02T12:00:00Z", ...(doc ? { document_sha256: sha256Hex(doc) } : {}), ...base });
  // Deterministic so the demo regenerates byte-for-byte; a real operator uses newSalt(), 32 random bytes.
  let saltN = 0;
  const salt = () => sha256Hex(`JRC SIMULATED salt ${++saltN}; a real operator uses 32 random bytes`);
  const PRICE_BUY = "115000.00", PRICE_SPEND = "120000.00";

  const records = [];
  const add = (...rs) => records.splice(0, records.length, ...appendRecords(records, rs));
  add({ type: "journal", id: "journal", qmt: "0.1", entity: "Example Project (SIMULATED)", base_currency: "USD", created_at: "2026-10-01T00:00:00Z", note: "SIMULATED. Fixture values for demonstrating reconciliation; no real money, account, company or key exists.", simulated: true });
  add(
    acct("assets:receivable:apple", "asset", "USD", "App Store proceeds Apple owes but hasn't paid"),
    acct("assets:bank:checking", "asset", "USD", "Business checking account"),
    acct("assets:exchange:usd", "asset", "USD", "US dollars held at the exchange (custodial)"),
    acct("assets:exchange:btc", "asset", "BTC", "Bitcoin held at the exchange (custodial)"),
    acct("assets:treasury:btc", "asset", "BTC", "Self-custodied treasury, watch-only addresses (regtest)", { onchain: { network: "regtest", addresses: [T1, T2, T3] } }),
    acct("income:sales:app-store", "income", "USD", "App Store sales at customer price, including any tax Apple collected"),
    acct("income:donations:usd", "income", "USD", "Donations received in dollars"),
    acct("income:donations:btc", "income", "BTC", "Donations received in bitcoin"),
    acct("expenses:marketplace:commission-and-tax", "expense", "USD", "Apple's commission plus tax it collected; Apple's report doesn't split them"),
    acct("expenses:hosting", "expense", "USD", "Hosting"),
    acct("expenses:services:btc", "expense", "BTC", "Services paid in bitcoin"),
    acct("expenses:fees:exchange", "expense", "USD", "Exchange trading fees", { fee: true }),
    acct("expenses:fees:network", "expense", "BTC", "Bitcoin network fees", { fee: true }),
    acct("equity:conversion:usd", "equity", "USD", "Conversion account, dollar side", { conversion: true }),
    acct("equity:conversion:btc", "equity", "BTC", "Conversion account, bitcoin side", { conversion: true }),
  );
  add(
    src("src-apple-report", "apple-financial-report", "Apple Financial report, US, fiscal September 2026 (SIMULATED file in treasury/demo/sources)", true, appleTsv),
    src("src-apple-payments", "provider-dashboard", "App Store Connect Payments page for the November payment (SIMULATED; seen only by the operator)", true),
    src("src-bank", "bank-statement", "Bank statement CSV, October to November 2026 (SIMULATED file)", true, bankCsv),
    src("src-exchange", "exchange-statement", "Exchange ledger export in Kraken's ledgers.csv layout (SIMULATED file)", true, exchangeCsv),
    src("src-btcpay", "btcpay", "BTCPay Greenfield invoice and payment methods (SIMULATED file)", true, canonical({ invoice: btcpayInvoice, methods: btcpayMethods })),
    src("src-chain", "chain", "SIMULATED regtest blocks generated by scripts/treasury-demo.mjs; anyone can re-check them offline", false),
    src("src-invoice-hosting", "invoice", "Hosting invoice, November 2026 (SIMULATED)", true),
    src("src-invoice-design", "invoice", "Design studio invoice payable in bitcoin, USD 60.00 (SIMULATED)", true),
    src("src-prices", "price-feed", "Fixture BTC/USD prices (SIMULATED, not market data)", false),
    src("src-estimate", "estimate", "Operator's estimate from App Store Connect sales trends (SIMULATED)", true),
  );
  add(
    { type: "price", id: "price-2026-11-13", at: "2026-11-13T15:30:00Z", base: "BTC", quote: "USD", rate: PRICE_BUY, source: "src-prices", ...base },
    { type: "price", id: "price-2026-12-01", at: "2026-12-01T09:00:00Z", base: "BTC", quote: "USD", rate: PRICE_SPEND, source: "src-prices", ...base },
  );

  const bank = parseStatement(bankCsv, "generic-signed");
  const bankRules = [
    { match: "PRIVATE DONOR", counter: "income:donations:usd", kind: "donation", privacy: "committed", description: "Donation (donor withheld)", counter_evidence: { source: "src-bank", ref: "statement line 2" } },
    { match: "HOSTING", counter: "expenses:hosting", kind: "expense", description: "Hosting, November", counter_evidence: { source: "src-invoice-hosting" } },
  ];
  const bankProps = statementProposals(bank, { account: "assets:bank:checking", source: "src-bank", rules: bankRules, idPrefix: "bank", simulated: SIM, salt });
  const donation = bankProps.proposals.find((p) => p.kind === "donation");
  add(donation);

  const apple = appleProposals(parseFinancialReport(appleTsv), { source: "src-apple-report", accounts: { income: "income:sales:app-store", commission: "expenses:marketplace:commission-and-tax", receivable: "assets:receivable:apple" }, simulated: SIM, salt });
  add(...apple.proposals);
  const appleSales = apple.proposals[0];
  const proceeds = appleSales.postings[2].amount;

  add({ type: "transaction", id: "apple-payment-2026-11", kind: "settlement", status: "posted", occurred_at: "2026-11-05T00:00:00Z", description: "Apple pays fiscal September proceeds into the bank", privacy: "public", follows: [appleSales.id],
    postings: [
      { account: "assets:bank:checking", amount: proceeds, commodity: "USD", evidence: { source: "src-bank", ref: "statement line 3" } },
      { account: "assets:receivable:apple", amount: -proceeds, commodity: "USD", evidence: { source: "src-apple-payments", ref: "fiscal September, USD" } },
    ], ...base });

  const ex = parseStatement(exchangeCsv, "kraken-ledgers");
  add({ type: "transaction", id: "bank-to-exchange-2026-11-06", kind: "transfer", status: "posted", occurred_at: "2026-11-06T14:00:00Z", description: "ACH from the bank to the exchange", privacy: "public", follows: ["apple-payment-2026-11"],
    postings: [
      { account: "assets:exchange:usd", amount: 10000, commodity: "USD", evidence: { source: "src-exchange", ref: "statement line 2" } },
      { account: "assets:bank:checking", amount: -10000, commodity: "USD", evidence: { source: "src-bank", ref: "statement line 4" } },
    ], ...base });
  const trade = tradeProposals(ex, { accounts: { USD: "assets:exchange:usd", BTC: "assets:exchange:btc" }, conversion: { USD: "equity:conversion:usd", BTC: "equity:conversion:btc" }, feeAccounts: { USD: "expenses:fees:exchange", BTC: "expenses:fees:network" }, source: "src-exchange", idPrefix: "exchange-trade", simulated: SIM }).proposals[0];
  add({ ...trade, follows: ["bank-to-exchange-2026-11-06"], description: "Buy bitcoin with the dollars (a conversion, never revenue)" });

  add(proof(b1, 1, "proof-withdrawal"), proof(b2, 1, "proof-donation"), proof(b3, 1, "proof-spend"));
  add({ type: "transaction", id: "exchange-withdrawal-2026-11-14", kind: "withdrawal", status: "posted", occurred_at: "2026-11-14T10:20:00Z", description: "Withdraw the bitcoin to the self-custodied treasury", privacy: "public", follows: [trade.id], chain_proof: "proof-withdrawal",
    note: "The exchange statement carries no blockchain transaction id; the operator links them by amount and time.",
    postings: [
      { account: "assets:treasury:btc", amount: SATS_BOUGHT, commodity: "BTC", evidence: { source: "src-chain", ref: W } },
      { account: "assets:exchange:btc", amount: -SATS_BOUGHT, commodity: "BTC", evidence: { source: "src-exchange", ref: "statement line 5" } },
    ], ...base });

  const btcpay = btcpayProposal(normalizeInvoice(btcpayInvoice, btcpayMethods), { source: "src-btcpay", accounts: { treasury: "assets:treasury:btc", income: "income:donations:btc" }, chainProofId: "proof-donation", chainSource: "src-chain", simulated: SIM });
  add(btcpay.price, btcpay.proposal);
  add(bankProps.proposals.find((p) => p.kind === "expense"));

  const spendUsd = convert(PAID_SATS, "BTC", "USD", PRICE_SPEND), feeUsd = convert(FEE_SATS, "BTC", "USD", PRICE_SPEND);
  add({ type: "transaction", id: "pay-design-studio-2026-12-01", kind: "expense", status: "posted", occurred_at: "2026-12-01T09:00:00Z", description: "Pay the design studio in bitcoin from the treasury", privacy: "public", chain_proof: "proof-spend",
    postings: [
      { account: "expenses:services:btc", amount: PAID_SATS, commodity: "BTC", evidence: { source: "src-invoice-design" }, value: { amount: spendUsd, commodity: "USD", price: "price-2026-12-01" } },
      { account: "expenses:fees:network", amount: FEE_SATS, commodity: "BTC", evidence: { source: "src-chain", ref: parseTx(spendTx).txid }, value: { amount: feeUsd, commodity: "USD", price: "price-2026-12-01" } },
      { account: "assets:treasury:btc", amount: -(PAID_SATS + FEE_SATS), commodity: "BTC", evidence: { source: "src-chain", ref: parseTx(spendTx).txid } },
    ], ...base });
  add({ type: "transaction", id: "apple-2026-10-estimate", kind: "sale", status: "pending", occurred_at: "2026-10-31T23:59:59Z", description: "App Store fiscal October proceeds, estimated before Apple's report", privacy: "public",
    postings: [
      { account: "assets:receivable:apple", amount: 9000, commodity: "USD", evidence: { source: "src-estimate" } },
      { account: "income:sales:app-store", amount: -9000, commodity: "USD", evidence: { source: "src-estimate" } },
    ], ...base });
  add({ type: "attention", id: "attention-bookkeeping-2026-11", role: "maintainer doing the books", period_start: "2026-11-01", period_end: "2026-11-30", minutes: 360, note: "Time, not money; never added to the cash books.", ...base });
  add({ type: "attention", id: "attention-reviewers-2026-11", role: "outside reviewers", period_start: "2026-11-01", period_end: "2026-11-30", minutes: null, note: "Unmeasured.", ...base });

  const errors = validateJournal(records);
  if (errors.length) throw new Error(`demo journal is invalid: ${JSON.stringify(errors.slice(0, 5))}`);
  if (bankProps.unmatched.length !== 2) throw new Error("expected exactly the Apple deposit and the ACH to be booked by hand");


  const snap = buildSnapshot(records);
  const anchors = { regtest: Object.fromEntries([b1, b2, b3].map((b) => [b.height, b.hash])) };
  return {
    records, snapshot: snap,
    files: {
      "sources/simulated-apple-financial-US-2026-09.txt": appleTsv,
      "sources/simulated-bank-statement.csv": bankCsv,
      "sources/simulated-exchange-ledgers.csv": exchangeCsv,
      "sources/simulated-btcpay-invoice.json": JSON.stringify({ simulated: true, invoice: btcpayInvoice, payment_methods: btcpayMethods }, null, 2) + "\n",
      "journal.jsonl": serializeJournal(records),
      "public-journal.jsonl": serializeJournal(snap.public_journal),
      "snapshot.json": snap.snapshot_canonical,
      "snapshot.sha256": `${snap.snapshot_sha256}  snapshot.json\n`,
      "example-rules.json": JSON.stringify(bankRules, null, 2) + "\n",
      "regtest-anchors.json": JSON.stringify({ note: "SIMULATED. The block hashes a verifier would confirm from their own regtest node; on mainnet you confirm them from your own node or several explorers.", anchors }, null, 2) + "\n",
    },
  };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const demo = buildDemo();
  for (const [f, text] of Object.entries(demo.files)) { mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); writeFileSync(path.join(OUT, f), text); }
  console.log(`treasury demo: ${demo.records.length} records, root ${demo.snapshot.snapshot.journal.merkle_root}, snapshot ${demo.snapshot.snapshot_sha256}`);
}
