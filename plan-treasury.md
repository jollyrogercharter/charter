# Verifiable Treasury Plan — 2026-10-19

Brief (human initiator, 2026-10-19): an open, Bitcoin-verifiable financial transparency system for JRC and participating projects. "The code is free. The data belongs to users. The money is accountable to the community." Branch `feat/treasury`, stacked on `feat/agents-interop` (#15) because it extends Quartermaster (`lib/qm/`, from #6) and reuses the privacy scanner and site config.

**Ground truth today:** JRC has no revenue, no bank account, no exchange account and no Bitcoin. Everything financial in this branch beyond `launch/costs.json` is a *format, a tool, or a clearly labelled simulation*. The site must say so.

## Goals

1. `BITCOIN-TREASURY.md`: a public RFC comparing a Bitcoin public treasury with (a) ordinary accounting published openly and (b) ordinary accounting committed to a timestamped public ledger. Bitcoin is **optional**; making it part of JRCv1 needs open deliberation.
2. A provider-neutral, append-only, double-entry journal format (`qmt` 0.1) with JSON Schemas, and a deterministic engine: validation, balances, conversions, tax lots, reconciliation, snapshots.
3. Read-only adapters, each a pure parser plus an optional fetch client with injected transport: BTCPay Greenfield, Esplora-compatible watch-only monitoring, Apple financial reports (gzip TSV), bank CSV, exchange CSV.
4. Offline Bitcoin verification: transaction parsing, txid, output scripts and addresses, Merkle inclusion against a block header, proof of work, plus a real mainnet test vector.
5. Deterministic snapshots: canonical JSON, SHA-256 leaf hashes, a domain-separated Merkle root, per-record inclusion proofs, salted commitments for redacted records, and a file ready for `ots stamp`.
6. `/treasury/`: JRC's real state (nothing held), and the simulated Apple-to-Bitcoin example with every evidence class visible, downloads and verification instructions.
7. A simulated end-to-end reconciliation showing exactly where only operator-supplied evidence exists.

## Non-goals

- No custody, keys, signing, PSBT creation, wallets, trading, purchases or fund movement. No code path can spend.
- No credentials requested or stored. Fetch clients take a token only at runtime from the operator's environment; tests use fixtures.
- No claim that a public address or transaction proves complete finances.
- No tax or legal advice. The RFC lists questions for counsel.
- Not making Bitcoin a JRCv1 requirement.

## Acceptance criteria

- Every transaction balances per commodity; conversions go through `Equity:Conversion`, so a fiat→BTC purchase can never appear as income. A test tries to book one as income and fails.
- A posting is `chain-verified` only if the validator holds a proof that checks offline (txid, output to a declared treasury script, Merkle inclusion, PoW) **and** the block hash was confirmed from a source the verifier chose. Off-chain records can't be labelled chain-verified; tests try.
- The journal is append-only: each record carries `prev` (hash of the previous record); `append-check OLD NEW` fails on any edit, deletion or reorder. Corrections are reversing entries.
- Snapshots are byte-identical across runs and Node 20/24; Merkle proofs verify in Node and the browser.
- Simulated data is labelled in the data itself (`simulated: true`), on every page and in every export, and regtest proofs can't pass a mainnet check.
- Every adapter rejects malformed input safely and is tested with hostile fixtures. No adapter assumes undocumented provider fields.
- Works with no Bitcoin at all (a fiat-only journal validates, snapshots and publishes) and with any single provider removed.
- Five separate review passes (accounting, transaction security, privacy, legal assumptions, reproducibility), findings fixed with regression tests.

## Rights and data boundaries

- The operator's private journal stays private. The public journal is derived through a redaction policy: `public`, `aggregated` (only totals over a minimum count), or `committed` (only a salted leaf hash, so a reviewer can later be shown the record and check it against the published root).
- Salts make committed leaves unguessable; without them small amounts could be brute-forced from the hash.
- No customer, donor or payee identities; no bank, card, invoice or account numbers (existing scanner, plus xprv/tprv/WIF detection).
- Publishing an xpub reveals all past and future addresses; the RFC recommends addresses or txids only, per snapshot.

## Architecture

```
sources (BTCPay JSON, Esplora JSON, Apple .txt.gz, bank CSV, exchange CSV, manual)
  → adapters/*  (pure parse → normalized source records, each with source_ref)
  → proposals   (suggested journal transactions; a human accepts them)
  → journal.jsonl (append-only, hash-chained, double-entry, private)
  → engine: validate · balances · lots · reconcile · verify chain proofs
  → redact (policy) → public journal + snapshot.json (Merkle root) → ots stamp (human)
  → /treasury/, /api/v1/treasury/*.json, qm treasury CLI
```

Code: `lib/treasury/{sha256,canonical,money,journal,ledger,lots,reconcile,merkle,snapshot,redact}.mjs`, `lib/treasury/bitcoin/{tx,address,spv}.mjs`, `lib/treasury/adapters/{btcpay,esplora,apple,bank-csv,exchange-csv}.mjs`. Pure JS with no runtime dependencies (SHA-256 included, tested against Node's), so the same code runs in Node and the browser. Amounts are integers in minor units (cents, sats); rates are decimal strings evaluated with BigInt.

## Open standards used

JSON Schema 2020-12; RFC 8785-style canonical JSON (sorted keys, no floats); RFC 6962-style Merkle tree (0x00 leaf / 0x01 node prefixes); Bitcoin transaction and header serialization; BIP 173/350 addresses; BIP 380+ descriptors (documentation only); OpenTimestamps; ISO 4217; ISO 8601 UTC; Esplora REST.

## Threat model (summary)

Operator lies by omission (mitigation: publish what is and isn't covered; completeness is never claimed); history rewriting (hash chain + OTS); fake chain evidence (offline proof + independently sourced block hash; regtest rejected as mainnet); malicious import files (bounded parsers, hostile tests); privacy leaks through publication (scanner, redaction classes, aggregation thresholds, salts); key exposure (no key handling anywhere, scanner rejects key formats, CI never holds keys); explorer dishonesty (verifier chooses sources, can use own node).

## Infrastructure costs

None added: static pages, CLI, tests. Optional operator costs (BTCPay hosting, node) are researched in the RFC, not incurred. AI session cost: unknown, recorded as `null`.

## Deployment and rollback

Nothing deploys until the human merges. The `/treasury/` page is static; rollback is a revert. No data migration.

## Export and migration

Journal is JSON Lines with a published schema; CSV export of postings and balances; snapshot JSON; all importable by another tool. Plain-text accounting (ledger/hledger/beancount) export is a candidate, not in scope.

## Reproducibility test

`npm ci && npm test` regenerates the demo snapshot byte-for-byte and verifies the committed Merkle root; `qm treasury verify` instructions work without this project's help.

## Community review proposal

The RFC opens as a draft with explicit questions; nothing in JRCv1 changes. Seed an issue for critique once the human decides.

## Unresolved (human decisions)

Whether JRC wants a treasury at all; legal form; whether to adopt Bitcoin; who holds keys; which providers; publication policy thresholds; counsel review.
