# Brief: Bitcoin-Verifiable Treasury (2026-10-19)

The prompt the human initiator gave the agent, reproduced verbatim for transparency. The run record is [`2026-10-19-treasury.md`](2026-10-19-treasury.md).

---

You are the lead AI architect for the Jolly Roger Charter and Quartermaster.

Repository: https://github.com/jollyrogercharter/charter

**Mission: Design and implement the first open, Bitcoin-verifiable financial transparency system for JRC and its participating software projects.**

Our philosophical objective is simple:

**The code is free. The data belongs to users. The money is accountable to the community.**

We want anyone to inspect how software earns money, what it costs to operate, how funds are transferred, and whether the public financial disclosures reconcile.

Bitcoin should provide independently verifiable treasury movements. Quartermaster should bridge payment channels that cannot operate directly on Bitcoin, including Apple's App Store.

### Phase 1: Research and RFC

Review the existing Quartermaster implementation, including PR #6 and its dependencies.

Research and document the current capabilities, costs, constraints and legal considerations of:

- BTCPay Server for direct Bitcoin and Lightning payments.
- Apple App Store Connect financial reports and API.
- Bitcoin conversion using providers that support US business accounts, including River.
- Self-custodied Bitcoin wallets, multisignature authorization and public transaction verification.
- OpenTimestamps for publicly auditable accounting records.
- US accounting, tax and potential money-transmission obligations.

Create a public RFC called `BITCOIN-TREASURY.md`.

The RFC must compare Bitcoin-based public treasury operations with alternatives based on ordinary accounting and cryptographically timestamped public ledgers. Bitcoin adoption must not become a requirement of JRCv1 without open community deliberation.

### Phase 2: Financial architecture

Build a provider-neutral, append-only, double-entry financial model representing:

- Gross revenue and net settlement proceeds.
- App marketplace commissions and taxes.
- Bank transfers.
- Bitcoin purchases and exchange fees.
- Bitcoin deposits and withdrawals.
- Operating expenses and refunds.
- Fiat reserves and Bitcoin holdings.
- Human attention, separately from cash accounting.
- Exchange rates, historical USD values and tax-basis records.

All records must have stable IDs, source references, timestamps, reconciliation state, and evidence classification.

Never double-count fiat-to-Bitcoin conversions as revenue.

Never describe an off-chain payment as blockchain-verified.

Use structured JSON Schemas and an open, documented API.

### Phase 3: Working integrations

Develop read-only connectors or realistic, locally testable adapters for:

1. BTCPay Server payment records and invoices.
2. Public Bitcoin transaction and wallet monitoring.
3. Apple financial report imports, including GZIP/tab-separated formats and appropriate report mappings.
4. Generic bank statement CSV imports.
5. Exchange trade and withdrawal statement imports.

Use interfaces that can later support API integrations.

Do not assume undocumented provider API capabilities exist.

### Phase 4: Public transparency

Build an initial `/treasury/` website section showing:

- Bitcoin treasury inflows, outflows and balances.
- Fiat revenue that has not yet been converted.
- Conversion rates, fees and delays.
- Published expenses and supporting evidence.
- Reconciliation gaps and unverified claims.
- Timestamped financial snapshots.
- Downloadable standardized data.
- Human-readable and machine-readable audit trails.

Support privacy-safe redaction and aggregate disclosure.

Distinguish self-reported, independently verified, estimated, pending and unknown records.

A public Bitcoin address or transaction does not prove complete project finances. Do not claim otherwise.

### Phase 5: Verifiable public ledger

Implement deterministic financial snapshot generation, SHA-256 hashes and Merkle-root commitments suitable for OpenTimestamps.

Write independent verification instructions and tests.

Use watch-only Bitcoin monitoring. Never place private keys or signing credentials in the website, CI, source control or agent context.

Require explicit, separate human approval for any eventual live transaction.

### Phase 6: Demonstrate Apple-to-Bitcoin reconciliation

Create a complete simulated example showing:

App Store customer purchase → Apple commission/tax adjustments → developer proceeds → bank deposit → exchange purchase → Bitcoin withdrawal → publicly observable treasury transaction.

Use clearly labeled fixture values.

Demonstrate how independent reviewers can reconcile each record while identifying where only operator-supplied evidence is available.

### Phase 7: Security and review

Use separate independent review passes for accounting correctness, transaction security, privacy, legal assumptions, and reproducibility.

The system must remain usable without Bitcoin and without a single payment provider.

Run deterministic tests and document actual results.

### Execution boundaries

You may write code, specifications, test fixtures, documentation and feature branches, and open draft PRs.

Do not create custodial accounts, request financial credentials, move funds, configure automatic trading, initiate purchases, change bank details or publish private financial statements.

Do not merge changes into main without my approval.

Document your prompts, decisions, tests, known limitations and implementation costs as part of our commitment to authentic AI transparency.

**Deliver a working prototype, a public RFC, and reviewable PRs. Prioritize real verifiability over impressive-looking financial dashboards.**
