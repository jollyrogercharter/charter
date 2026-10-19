# RFC: Bitcoin-Verifiable Treasury for JRC and Participating Projects

| | |
|---|---|
| Status | **Draft RFC, open for criticism.** Nothing here changes JRCv1. |
| Author | Claude Opus 5.5 (AI agent) at the human initiator's request, 2026-10-19 |
| Prototype | `lib/treasury/`, `qm treasury`, `/treasury/` (a simulated example), spec [`spec/quartermaster/QMT-JOURNAL.md`](spec/quartermaster/QMT-JOURNAL.md) |
| Decision needed from | The community, through open deliberation, before Bitcoin becomes part of any JRC requirement |

> **Today, JRC has no revenue, no bank or exchange account, and no Bitcoin.** Its only spending is in [`launch/costs.json`](launch/costs.json). Every financial flow shown on `/treasury/` is a labelled simulation.

> **Not legal, tax or financial advice.** The legal and tax sections frame questions for a lawyer and an accountant. Facts were researched on 2026-10-19 from the sources linked, or named where no link is given. Items marked *unverified* couldn't be confirmed from a primary source.

## 1. Motivation

The charter says the code is free, the data belongs to users, and the money is accountable to the community. Publishing a cost ledger ([`launch/costs.json`](launch/costs.json)) covers spending. It doesn't cover income, conversions or reserves, and it doesn't let a reader tell whether a published statement was quietly rewritten later.

The brief asked for a system in which anyone can see how software earns money, what it costs to run, how funds move, and whether the public disclosures reconcile, with Bitcoin providing independently verifiable treasury movements.

This RFC separates three things that are easy to blur:

1. **Publishing books.** Anyone can read them, but readers have to trust the publisher.
2. **Committing to books.** The publisher can't later change what was published without being caught: hash chains, Merkle roots, timestamps.
3. **Proving some movements.** Certain entries can be checked against a public system the publisher doesn't control. Bitcoin is one; it covers only the coins that moved on it.

None of the three proves the books are **complete**. An operator can always leave out an account. That limit is stated everywhere the system speaks.

## 2. Three options compared

| | A. Open accounting | B. Open accounting + committed ledger | C. B + Bitcoin treasury |
|---|---|---|---|
| What's published | Statements and a ledger (like `costs.json`) | The same, as an append-only journal with a Merkle root per snapshot, timestamped with OpenTimestamps | B, plus watch-only treasury addresses and transaction proofs |
| What a reader can check alone | Arithmetic and internal consistency | Plus: nothing published was later edited, reordered or deleted; withheld records exist (but not what they say) and can be shown to an auditor | Plus: on-chain inflows, outflows and fees, and that coins the books say were spent were the treasury's coins |
| What still rests on the operator | Everything | Every off-chain fact: Apple reports, bank and exchange statements, invoices | The same off-chain facts, and the link between an exchange withdrawal and an on-chain transaction (statements usually carry no txid) |
| Needs Bitcoin | No | No (OpenTimestamps anchors in Bitcoin, but the project holds none) | Yes |
| New legal and tax work | Ordinary bookkeeping | Same | Per-wallet cost basis, gains on every spend, possibly appraisals for large donations, sanctions screening of addresses, and a careful look at money-transmission exposure (section 6) |
| Price risk | None | None | The treasury's dollar value moves with BTC |
| Privacy cost | Low with aggregation | Low; withheld records publish only a salted hash, though their existence (and sometimes a rough size) shows | Higher: published addresses expose counterparties to chain analysis |
| Works without any single provider | Yes | Yes | Yes for the journal; the Bitcoin part needs a block source you trust (your own node, or several explorers) |

**This RFC recommends B as a baseline any JRC project can adopt, and C as an option a project may choose.** B gives the main property the brief wants, that published history can't be quietly rewritten, without holding a volatile asset or taking on its legal duties. C adds real proof, but only for the coins themselves.

## 3. What the prototype does

Everything below is implemented in this PR, with tests (`test/treasury.test.mjs`). Nothing in it can hold keys, sign, broadcast or move money.

### 3.1 The journal (qmt 0.1)

A JSON Lines file, one record per line, specified in [`QMT-JOURNAL.md`](spec/quartermaster/QMT-JOURNAL.md) with a [JSON Schema](spec/quartermaster/qmt-0.1.schema.json).

- **Append-only, hash-chained.** Each record carries `prev`, the leaf hash of the record before it. Editing, reordering or deleting any record breaks the chain. `qm treasury append-check OLD NEW` fails unless NEW only adds records to OLD. Corrections are reversal entries, never edits.
- **Double-entry, one balance per commodity.** Amounts are integers in minor units (cents, satoshis). Every transaction balances separately in each commodity.
- **Conversions are never revenue.** A transaction that mixes dollars and bitcoin must be a `conversion` or `settlement` and must go through conversion accounts. Transfers, conversions, deposits and withdrawals can't touch an income account at all. The tests try to book a purchase of bitcoin as income in two different ways, and both are refused.
- **Every posting cites evidence.** Each posting names a source (Apple report, bank or exchange statement, BTCPay record, invoice, chain proof, manual, estimate). Sources say whether only the operator holds the document, and can carry the document's SHA-256, so the operator can later prove which file they used without publishing it.
- **Off-chain money is never "blockchain-verified".** Chain evidence is accepted only on postings to on-chain accounts (and that transaction's network fee). The amount must equal what the proven transaction pays to that account's addresses.
- **Prices and tax basis.** Price records carry a decimal-string rate and a source. A posting's dollar value must equal amount × rate, rounded, so it can't be invented. Lots are tracked FIFO per account, with basis following coins between the operator's own wallets, since US rules from 2025 apply per wallet or account ([26 CFR 1.1012-1(j)](https://www.ecfr.gov/current/title-26/part-1/section-1.1012-1)). The fee treatment is flagged as unresolved.
- **Human attention is separate.** `attention` records carry minutes (or `null` for unmeasured) and can never hold postings.
- **Simulation is marked in the data.** A simulated journal must mark every record `simulated: true`, and a real journal can't contain one.

### 3.2 Evidence classes

Every posting is shown with exactly one class, computed at read time:

| Class | Meaning |
|---|---|
| `chain-verified` | An on-chain posting whose transaction proof checks offline **and** whose block hash the *viewer* confirmed (own node, or several explorers that agree) |
| `chain-proof-unanchored` | The proof checks offline, but nobody has confirmed the block hash for this view. On its own this proves little: a minimum-difficulty block can be mined on a laptop. |
| `contradicted` | Chain evidence is cited, but the proven coins disagree with the posting or the books |
| `provider-document` | A third party's statement, usually held only by the operator |
| `self-reported` | The operator's own record |
| `estimate` / `pending` / `unknown` | As named |

Independent review is recorded separately: a `review` record names the reviewer, says whether they're affiliated, and links to a statement they published themselves. Affiliated reviews never count as independent.

### 3.3 Bitcoin verification, offline

`lib/treasury/bitcoin/` parses transactions and headers and checks a proof without a node or network:

1. The txid recomputed from the transaction bytes (double SHA-256 of the serialization without witness data).
2. Merkle inclusion: fold the branch by position bits and compare with the header's Merkle root.
3. Proof of work: the header hash meets its own target, and that target is no easier than the network allows. **A simulated regtest proof therefore can't pass as mainnet.**
4. 64-byte transactions are refused, because a branch without the block's transaction count could let one pose as an inner node (the CVE-2012-2459 family).
5. An **anchor**: a block hash for that height the verifier confirmed independently. Without it, the result is `proof-valid-unanchored`, never `chain-verified`.

Proofs that don't check offline can't enter the journal. Each transaction has one proof and each proof supports one entry, and each address belongs to one account. `chainCustody` follows treasury coins through checked proofs. Each spend must consume outputs this journal proved arriving, and the network fee (inputs minus outputs, when all inputs are the treasury's) must match the booked fee. An on-chain account's booked balance must equal the coins its proofs show. Coins count as *proven* only when the viewer anchored their blocks; a posting the chain disagrees with is shown as `contradicted`.

The test suite verifies a real mainnet transaction from block 170, fetched from two explorers that returned identical bytes, and the genesis coinbase. It also checks that every kind of tampering fails.

**Limits**: a proof shows that coins moved. It can't show a coin is still unspent today. It says nothing about other wallets, off-chain money, liabilities or who controls the keys.

### 3.4 Snapshots and timestamps

`qm treasury snapshot` writes a deterministic `snapshot.json`: balances, evidence counts, custody, conversions, lots, attention, and the journal's record count, head and Merkle root. Every figure comes from the public records, so `qm treasury verify` recomputes the whole snapshot and compares it byte for byte; a hand-edited figure fails. The tree is RFC 6962-style, with 0x00 for leaves and 0x01 for nodes, and the test suite checks it against the Certificate Transparency reference vectors.

The human then runs `ots stamp snapshot.json`, which sends only a hash to public calendars. The project's founding documents were timestamped the same way ([`provenance/`](provenance/)).

**Redaction without losing verifiability.** A record marked `committed`, or an aggregate below the minimum count (default 3), is published as its leaf hash only. Both kinds carry a random 32-byte salt (`newSalt()`; weak or reused salts are refused), so a small amount can't be guessed from the hash. Later, the operator can show the full record to an auditor, who checks it against the published root (`checkDisclosure`). A redacted public journal has the same leaf hashes as the private one, so `append-check` works across both.

**What withholding can't hide.** Every figure in a snapshot is computed from the public records only, so nothing withheld can be recovered by subtracting published totals. But a withheld record's *existence* is visible, and neighbouring public records can reveal its size: in the simulated example, the bank account looks overdrawn by $20.51 because a withheld deposit isn't counted. Publication is refused if a public record names a withheld one, or if a withheld record has an on-chain proof (on-chain data is public anyway). The `count` on an aggregate is units, not distinct people, so one buyer of three units passes a threshold of 3. Withhold only what can't be inferred, and prefer aggregation.

### 3.5 Adapters (read-only)

| Source | What's implemented | What it relies on |
|---|---|---|
| Apple Financial reports | Parser for the 22-field FINANCIAL report (tab-separated, MM/DD/YYYY, gzip accepted). Matches headers with or without Apple's spaced spelling, ignores trailing lines Apple doesn't document, flags rows where Extended Partner Share ≠ Quantity × Partner Share. One sale and one refund entry per fiscal period and currency. | [Apple's field reference](https://developer.apple.com/help/app-store-connect/reference/financial-report-fields). The API (`GET /v1/financeReports`) needs an App Store Connect key; the adapter reads downloaded files and doesn't call it. |
| Bank CSV | Declared profiles only: signed amount, or separate debit and credit columns. Handles `$`, commas and parentheses. Rows match operator-written rules; unmatched rows are listed, never booked. | No US standard bank CSV exists. OFX and ISO 20022 CAMT.053 are standards worth adding. |
| Exchange statements | Kraken `ledgers.csv` profile (txid, refid, time, type, subtype, aclass, asset, amount, fee, balance); `qm treasury import trades` groups a trade's rows by refid into one conversion, and publishes only a hash of the refid. | [Kraken's ledger field guide](https://support.kraken.com/articles/360001169383-how-to-interpret-ledger-history-fields). River's full export header couldn't be confirmed, so there's no River profile yet. |
| BTCPay Server | Greenfield invoice + payment-methods normaliser (field names from the official OpenAPI spec). Books only settled on-chain invoices. Invoice IDs are published as a hash. GET-only client; the key is read at run time and never stored or echoed. | Lightning payments aren't handled yet. Whether a payment `id` is `txid-vout` isn't documented, so the chain proof is fetched separately. |
| Watch-only monitoring | Esplora client (Blockstream, mempool.space, or your own instance): GET only, https or a local node. `fetchProof` re-checks everything the explorer sends. `confirmAnchors` needs at least two sources that agree. `observations` reports explorer data as `explorer-reported`, not proven. | Neither public explorer documents rate limits or terms (*unverified*); a project relying on one should run its own. |

Every adapter produces **proposals**. A person reviews them before anything is appended.

## 4. Provider facts (researched 2026-10-19)

**BTCPay Server** ([docs](https://docs.btcpayserver.org/), [Greenfield OpenAPI](https://github.com/btcpayserver/btcpayserver/tree/master/BTCPayServer/wwwroot/swagger/v1)):
- **Version and hosting:** MIT-licensed, v2.4.5 at the time of writing. Non-custodial. The [documented practical starting point](https://docs.btcpayserver.org/Docker/specs/) for a pruned, Bitcoin-only install is 4 GB RAM, 2 vCPU and 50 GB SSD (the FAQ cites lower figures). VPS prices weren't verified.
- **Rates and invoices:** an invoice expires after 15 minutes by default and carries the rate used for each payment method (the adapter books at that rate); whether the rate is locked for the invoice's whole life wasn't confirmed. Invoice statuses are New, Processing, Expired, Invalid and Settled, with extra flags for late, partial and over-payment.
- **Read-only access:** `btcpay.store.canviewinvoices` and `btcpay.store.canviewreports`, scoped to one store, cover most bookkeeping. Some read endpoints (the Lightning payment list, payouts) need broader permissions, so no strictly view-only key covers everything.
- **Webhooks:** signed with `BTCPay-Sig` (HMAC-SHA256). Payloads carry no amounts, so they're only triggers.
- **Privacy:** publishing the store's xpub would expose its whole address history. Invoice metadata can hold buyer data.

**Apple App Store** ([field reference](https://developer.apple.com/help/app-store-connect/reference/financial-report-fields), [receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)):
- **Reports:** Financial reports by region and currency, over Apple's fiscal months (the calendar itself is behind login). Payment comes within 45 days of the fiscal month's end, as one payment per fiscal month per currency. The [minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/minimum-payment-threshold) is US$0.02 for most listed bank-currency pairs, with exceptions, and US$40 for unlisted pairs.
- **Amounts:** Customer Price includes taxes Apple collects and remits. Partner Share is the price minus that tax and Apple's commission, and **the report doesn't split the two**, so the prototype books them together. Quantity and Extended Partner Share can be negative; in sample reports refunds are `R` rows with negative quantity, in the month they occur. The adapter takes the sign from Quantity and refuses rows whose `S`/`R` flag disagrees with it.
- **Reconciliation:** the report carries no bank deposit reference. The 7-digit payment Transaction ID appears only on the Payments page and in the bank remittance text. Matching is by fiscal month, currency and amount, with expected gaps for FX, withholding and bank fees.
- **Commission:** 15% under the Small Business Program and for subscriptions after a year. China moved to 25%/12% on 2026-03-15. EU terms changed on 2026-10-01 (26%/15% through Apple's in-app purchase, plus a 5% Core Technology Commission outside the App Store). The commission on US link-out purchases is reported to be still before the courts (*unverified*). These rates come from news coverage of Apple's announcements, not Apple's own pages.
- **Tax forms:** Apple's page says it issues Form 1099-K at $5,000 of gross sales, while the federal threshold was restored to $20,000 and 200 transactions ([IRS, Oct 2025](https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000)). Reconcile the forms actually received.

**US exchanges (River, Kraken, Coinbase, Strike, Swan)**:
- **River** ([river.com](https://river.com/)): takes LLCs, corporations and non-profits as sub-accounts of an individual account. Fees start at 1% on one-time buys, and recurring buys are free after the first week. ACH funds can be held from about 7 days to several weeks depending on account history; wires avoid the hold. Its monthly proof of reserves and the absence of a documented account API weren't confirmed from River's own pages.
- **Kraken:** documents its [ledger export fields](https://support.kraken.com/articles/360001169383-how-to-interpret-ledger-history-fields) (the export's `refid` column, which groups the two rows of a trade, is listed in the API's field list) and a read API. A trade costs 0.40%/0.80% (maker/taker) at the lowest Pro tier and 1% as an instant buy ([fee schedule](https://www.kraken.com/features/fee-schedule)). It has an ACH withdrawal hold and Merkle-tree proof of reserves. Third parties say New York and Washington are excluded (*unverified*).
- **Others:** Coinbase, Strike and Swan details were mostly *unverified*, because their help pages blocked automated reading.
- **1099-DA:** exchanges issue Form 1099-DA, with gross proceeds from tax year 2025 and basis on certain transactions from 2026. **A spend from self-custody produces no 1099-DA**, so the project reports it itself.
- **Before choosing a provider,** a person should re-read its current fee schedule and terms, and confirm the CSV headers against a real export.

**Bitcoin custody and verification** ([BIPs](https://github.com/bitcoin/bips), [Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md), [OpenTimestamps](https://opentimestamps.org/)):
- **Wallet setup:** a multisig treasury can be defined as an output descriptor. BIPs 380–387 are deployed; multipath descriptors (BIP 389) and miniscript (BIP 379) are still drafts. Signing would use PSBTs (BIP 174/370) on hardware wallets coordinated by tools such as Sparrow, Specter, Nunchuk or Bitcoin Core.
- **What to publish:** publishing an xpub or descriptor reveals every past and future address. The RFC recommends publishing the addresses actually used, or txids, per snapshot.
- **OpenTimestamps:** a proof shows that a hash existed no later than a block's time, not who made it. Pending proofs complete in hours, and full verification needs block headers from a source you trust. The `opentimestamps` npm package hasn't been released since 2021, so the prototype computes the commitments and leaves stamping to the `ots` client.
- **Reserves:** proof of reserves (BIP 127) and Merkle-sum liabilities proofs exist, and their own authors note the privacy and completeness limits.

## 5. Proposed operating model for a project that chooses option C

1. **Keys.** 2-of-3 (or 3-of-5) multisig on hardware wallets held by different people in different places. No key in any website, CI system, repository or AI agent's context. The prototype has no code that could use one.
2. **Live transactions.** Every spend is a PSBT. The journal entry is drafted in a pull request first, and the transaction is signed only after **separate, explicit human approvals** from the required signers. No agent signs, broadcasts or approves its own change.
3. **Publication.** Monthly: run `qm treasury snapshot`, review the public journal, `ots stamp snapshot.json` (the file has no trailing newline, so its SHA-256 is exactly the published digest), publish it, and `ots upgrade` the proof once it's confirmed. Publish used addresses and txids, not the xpub, and use a new address for each receipt.
4. **Verification by anyone.** Download the public journal and snapshot. Run `qm treasury verify` and `ots verify`. For any on-chain posting, confirm the block hash from your own node or two explorers (`qm treasury anchors HEIGHT --explorer A --explorer B > anchors.json`), then `qm treasury report public-journal.jsonl --anchors anchors.json`, or `chain-check` one proof with `--require-anchor`.
5. **Auditor disclosure.** Withheld records can be shown privately, and the auditor checks each against the published root.

A fiat-only project uses steps 3–5 without Bitcoin; the test suite includes a fiat-only journal.

## 6. Legal and tax questions (for counsel and a CPA)

Background, with sources, from research on 2026-10-19. **Not advice.**

- **Tax character.** The IRS treats digital assets as property ([Notice 2014-21](https://www.irs.gov/pub/irs-drop/n-14-21.pdf)). Paying an expense in BTC is a disposition with gain or loss. Moving BTC between one's own wallets generally isn't, **except that a fee paid in BTC is itself a disposition**, so even a self-transfer can trigger one for the fee portion ([IRS digital assets](https://www.irs.gov/filing/digital-assets)). How to measure and report that fee disposition, and whether the prototype's lot logic matches, is for a CPA. From 2025, basis is tracked per wallet or account, FIFO unless specific units are identified by the time of the disposition ([26 CFR 1.1012-1(j)](https://www.ecfr.gov/current/title-26/part-1/section-1.1012-1); read through secondary summaries, as the eCFR page was unreachable from the research tools). No de minimis exemption was found. Form 1099-DA reports gross proceeds from 2025 and basis on certain transactions from 2026.
- **Donations.** Donated BTC over $5,000 needs a qualified appraisal for the donor's deduction. Chief Counsel advice says an exchange price isn't enough ([CCA 202302012](https://www.irs.gov/pub/irs-wd/202302012.pdf), non-precedential). A donee that signs Form 8283 Section B is expected to file Form 8282 if it sells the property within three years; counsel should confirm how that applies to digital assets, and whether JRC would ever sign a Form 8283.
- **Accounting standard.** For entities reporting under US GAAP, [ASU 2023-08](https://dart.deloitte.com/USDART/home/publications/deloitte/heads-up/2023/fasb-issues-asu-crypto-assets) (fiscal years beginning after 2024-12-15, including not-for-profits; six scope criteria) measures in-scope crypto assets at fair value, with changes in net income (or, for a not-for-profit, in the change in net assets). Books would therefore show unrealized gains that tax doesn't recognize until a disposal. A project must state its basis of accounting; small projects often don't report under GAAP at all.
- **Money transmission.** FinCEN treats a "user" who obtains virtual currency to buy goods or services on its own behalf as not a money transmitter ([FIN-2019-G001](https://www.fincen.gov/system/files/2019-05/FinCEN%20Guidance%20CVC%20FINAL%20508.pdf)). That definition is about a purpose; holding BTC as a reserve or investment isn't squarely described, so put it to counsel. **The exposure is acting for others:** forwarding donations earmarked for other projects, distributing funds to participating projects as pass-through, holding balances or keys for others, or converting for others. A shared JRC treasury that pays "participating projects" sits close to that line. **This prototype records one entity's own books and deliberately has no per-project balances.** State laws need review for any multi-project design. A growing number of states have enacted the [CSBS model act](https://www.csbs.org/csbs-money-transmission-modernization-act-mtma) in whole or part (CSBS counted 31 in January 2026), and far fewer include its virtual-currency provisions; counts vary by source and date. New York's BitLicense exempts merchants and consumers using virtual currency *solely* for goods, services or investment (23 NYCRR 200.3(c)(2)). California's digital financial assets law applies too.
- **Sanctions.** OFAC obligations apply to every US person, are strict liability, and cover addresses on the SDN list ([OFAC's virtual currency guidance](https://ofac.treasury.gov/media/913571/download?inline), announced [2021-10-15](https://ofac.treasury.gov/recent-actions/20211015)). A project accepting donations to a public address needs a policy for screening, for blocked funds and for blocked-property reporting. Records should be kept for ten years under the amended 31 CFR 501.601, effective about March 2025; that comes from law-firm summaries, so confirm it against the eCFR text.
- **Legislation in flux.** The CLARITY Act failed cloture in the Senate on 2026-09-15 and isn't law. The GENIUS Act's stablecoin rules take effect no later than 2027-01-18. Both statuses come from secondary sources.

**Questions for counsel and a CPA** before any real treasury exists:
1. Which legal form holds the treasury (LLC, a 501(c)(3), or a fiscal sponsor's Model A or C), and who is the taxpayer?
2. Does a shared treasury that funds participating projects create money-transmission exposure, and what grant structure avoids it?
3. Which basis method, what counts as one "wallet" for a multisig, and how are network fees treated?
4. Is App Store income related or unrelated business income for a 501(c)(3)?
5. Which books do we publish (GAAP, tax basis or cash basis), and with what assurance level?
6. What is the minimum OFAC policy for a public donation address, including blocking and reporting blocked property (31 CFR 501.603)?
7. What may be published about donors, payees and addresses?
8. Which tax and legal positions need written advisor sign-off before publication? (No agent can approve its own production change.)

## 7. Threat model (summary)

| Threat | Mitigation | Residual |
|---|---|---|
| Operator omits accounts or income | Coverage is stated, never claimed complete. Apple and bank documents are hashed in the journal. | Can't be fully mitigated by any public ledger |
| History rewritten after publication | Hash chain, `append-check`, Merkle root, OpenTimestamps | None for snapshots whose timestamp is complete and independently verified, and of which someone kept a copy. A rewrite before the first stamp is undetectable. |
| Fake on-chain evidence | Offline proof, regtest can't pass as mainnet, viewer-chosen anchors | An anchor taken from a single colluding explorer |
| Explorer lies | `fetchProof` re-checks bytes; anchors need sources that agree; own node recommended | |
| Malicious import file | Bounded parsers; hostile-input tests; proposals need human review | |
| Privacy leak | Shared secret scanner (emails, tokens, keys, home paths); key formats (xprv, xpub, WIF); card, account, IBAN, routing, SSN/EIN and phone numbers; raw bank memos never copied; salted commitments; aggregation threshold; summaries from public records only; leaky links refused | The scanner is pattern matching, not a guarantee (names can't be detected). A withheld record's existence shows, and its size can sometimes be inferred. Published addresses remain linkable on-chain. |
| Key compromise | No keys anywhere in the system; multisig; human approval per spend | Physical and social-engineering attacks on signers |
| Small-scale deanonymization | Aggregation threshold; per-snapshot addresses | Small projects have few transactions to hide among |

## 8. Alternatives considered

- **A blockchain-only treasury.** Rejected: App Store, bank and most expenses are off-chain. Most of a project's money would be unproven anyway, and the system would say so.
- **Stablecoins.** Not researched in depth. Stablecoins bring issuer risk and new regulation (GENIUS Act), and don't help prove off-chain flows.
- **Publishing an xpub for full transparency.** Rejected by default: it exposes every counterparty forever.
- **Existing plain-text accounting (ledger, hledger, beancount).** Excellent tools. qmt adds evidence classes, hash chaining and Merkle commitments; an export to them is a candidate next step.
- **Open Collective-style hosted transparency.** Good precedent, but it depends on one host. JRC's reproducibility test asks for no single provider.

## 9. Migration and conformance effects

None today. JRCv1's economics pillar asks for open economics, not Bitcoin. If the community adopted option B, a project's `jrc.json` could cite its snapshot and OpenTimestamps proof as evidence. Option C would only ever be one way to satisfy a requirement, never the requirement.

## 10. Public criticism invited

- Is a hash-chained journal enough, or does it give false comfort, since omission is undetectable?
- Should JRC hold a treasury at all, and if so, whose decision is each spend?
- Is the aggregation threshold of 3 too low to protect donors at small scale?
- Is FIFO-per-account the right default, or should specific identification be required?
- Which provider formats matter most to you? Please send real, redacted header rows.

## 11. Versioning recommendation

qmt stays 0.x until at least one project outside JRC publishes a real journal and an unaffiliated reviewer checks it. Breaking changes are allowed until then, each with a migration note.
