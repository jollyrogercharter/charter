# Quartermaster Treasury Journal (qmt), version 0.1 draft

An append-only, double-entry journal that any project can publish, and a snapshot format anyone can verify. It is provider-neutral and works without Bitcoin. Rationale and comparison with alternatives: [`BITCOIN-TREASURY.md`](../../BITCOIN-TREASURY.md).

- Schema (per record): [`qmt-0.1.schema.json`](qmt-0.1.schema.json)
- Reference implementation: `lib/treasury/` (no runtime dependencies; runs in Node and browsers)
- CLI: `node bin/qm.mjs treasury --help`
- Worked example (simulated): [`treasury/demo/`](../../treasury/demo/)

## File format

JSON Lines, UTF-8. Each line is one record in canonical JSON: keys sorted, no whitespace, integers only (no floats anywhere), strings NFC-normalized.

Every record has:
- `seq`: 1, 2, 3…
- `prev`: the leaf hash of the previous record (64 zeros for the first)
- `type`
- `id`: unique, lowercase, `[a-z0-9][a-z0-9.:_-]{0,79}`
- `simulated` (optional): if the header says `true`, every record must too.

**Leaf hash** = SHA-256(0x00 ‖ canonical JSON of the record). **Merkle root** = RFC 6962 tree over the leaves in order, with nodes = SHA-256(0x01 ‖ left ‖ right).

## Record types

| type | Purpose | Key fields |
|---|---|---|
| `journal` | First record only | `qmt: "0.1"`, `entity`, `base_currency` |
| `account` | Declares an account before use | `kind` (asset, liability, equity, income, expense), `commodity`, `description`, optional `fee`, `conversion`, `onchain: { network, addresses }` |
| `source` | Where evidence comes from | `kind`, `description`, `operator_supplied`, `retrieved_at`, optional `document_sha256`, `url` |
| `price` | A rate used to value postings | `at`, `base`, `quote`, `rate` (decimal string), `source` |
| `chain_proof` | A Bitcoin transaction with its inclusion proof | `network`, `txid`, `tx_hex`, `header_hex`, `merkle` (display-order hex), `pos`, `block_height`, `source` (kind `chain`) |
| `transaction` | Double-entry postings | `kind`, `status` (posted, pending), `occurred_at`, `description`, `privacy`, `postings[]`; optional `chain_proof`, `reverses`, `follows`, `count`, `salt`, `note` |
| `attention` | Human time, never money | `role`, `period_start`, `period_end`, `minutes` (or `null`); a value needs `valuation_method` |
| `review` | Someone's published check of transactions | `reviewer`, `affiliated`, `statement_uri`, `result`, `covers[]` |
| `commitment` | A withheld record in a public journal | `seq`, `leaf` |

A **posting** is `{ account, amount, commodity, evidence: { source, ref? }, value?: { amount, commodity, price } }`. Amounts are non-zero integers in minor units (cents; satoshis for BTC).

## Rules (enforced by `validateJournal`)

1. `seq` is consecutive and `prev` matches the previous leaf. Corrections are new `reversal` transactions that negate the original exactly; a transaction can be reversed once.
2. Accounts, sources, prices and proofs are declared before they are referenced.
3. Every transaction balances to zero **in each commodity**. Only `conversion` and `settlement` may mix commodities, and only through `conversion` equity accounts.
4. Income accounts appear only in `sale`, `donation`, `refund`, `revenue-adjustment` and `reversal`. **Transfers, conversions, deposits and withdrawals are never revenue.**
5. Posted transactions cite evidence on every posting, except conversion-account legs. Use a `manual` or `estimate` source when that's all there is.
6. Chain evidence is allowed only on postings to `onchain` accounts and on that transaction's BTC network fee. The transaction must reference a `chain_proof` whose bytes hash to its `txid`. An inflow must equal what the proven transaction pays to the account's addresses.
7. A posting `value` must equal `amount × rate`, rounded half away from zero.
8. `committed` transactions carry a 32-byte random `salt`; `aggregated` ones state their `count`.
9. No email addresses, tokens, keys, home paths, card or account numbers, or extended private keys or WIF keys anywhere.

## Evidence classes

Computed at read time per posting, never stored:

`chain-verified`, `chain-proof-unanchored`, `provider-document`, `self-reported`, `estimate`, `pending`, `unknown`.

`chain-verified` needs the viewer's own **anchor**: a block hash for that height that they confirmed from their own node or from at least two explorers that agree.

## Snapshots

`buildSnapshot(records)` produces canonical `snapshot.json` with:
- `journal: { records, head_leaf, merkle_root, withheld, policy }`;
- balances (posted and pending);
- evidence counts, gap and operator-only counts;
- chain proofs (offline result), proven treasury balance, custody issues;
- conversions with effective rate, fees and delays;
- open lots and disposals count;
- attention;
- fixed statements of what the snapshot can't show.

Its SHA-256 (of the canonical bytes, without the trailing newline) is what gets timestamped.

The **public journal** replaces each `committed` transaction, and each aggregate whose `count` is below `policy.min_aggregate_count` (default 3), with `{ seq, type: "commitment", leaf }`. Every leaf hash is unchanged, so:
- `verifyPublic(public, snapshot)` checks record count, Merkle root, head, the hash chain across visible records and the withheld count;
- `checkDisclosure(record, proof, root)` lets an auditor confirm a withheld record later;
- `appendCheck(old, new)` works between private and public copies.

## Verification without this project

1. **Recompute the snapshot.** `qm treasury verify public-journal.jsonl snapshot.json` recomputes the leaves, root and chain.
2. **Check the stamp.** `ots verify snapshot.json.ots` checks the timestamp; this needs a Bitcoin node, or use the explorer method in [`provenance/VERIFY.md`](../../provenance/VERIFY.md).
3. **Anchor on-chain postings.**
   - `qm treasury anchors HEIGHT --explorer blockstream --explorer mempool` gets agreeing block hashes, or take them from your own node.
   - Then `qm treasury report journal.jsonl --anchors anchors.json` reclassifies those postings.
4. **Check the code itself.** The algorithms (SHA-256, RFC 6962 Merkle trees, Bitcoin serialization) are standard, so an independent implementation in any language can check the same files.

## Not in 0.1

- Lightning payments.
- Multi-currency FX gain and loss.
- Consistency proofs between snapshots (`append-check` needs both journals).
- An OFX or CAMT.053 bank importer.
- A River export profile (headers not confirmed).
- Exports to plain-text accounting tools.
