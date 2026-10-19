# Quartermaster Treasury Journal (qmt), version 0.1 draft

An append-only, double-entry journal that any project can publish, and a snapshot format anyone can verify. It is provider-neutral and works without Bitcoin. Rationale and comparison with alternatives: [`BITCOIN-TREASURY.md`](../../BITCOIN-TREASURY.md).

- Schema (per record): [`qmt-0.1.schema.json`](qmt-0.1.schema.json)
- Reference implementation: `lib/treasury/` (no runtime dependencies; runs in Node and browsers)
- CLI: `node bin/qm.mjs treasury --help`
- Worked example (simulated): [`treasury/demo/`](../../treasury/demo/)

## File format

JSON Lines, UTF-8, LF line endings. Each line is one record in **canonical JSON**:
- object keys and string values NFC-normalized; two keys equal after normalization are an error;
- keys sorted by UTF-16 code units (as in RFC 8785, and JavaScript's default sort);
- no whitespace; strings escaped as `JSON.stringify` does (`"`, `\\` and control characters escaped; other characters, including non-ASCII, written as UTF-8);
- numbers are integers in the safe range ±(2^53 − 1), with no floats and no `-0` anywhere; keys whose value is undefined are omitted.

Test vectors: `{"b":1,"a":[true,null,"é"]}` → `{"a":[true,null,"é"],"b":1}`; keys `"\uffff"` and `"😀"` sort as `"😀"` first (UTF-16 surrogates sort below U+FFFF).

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
   - `merkle` hashes are in display order (byte-reversed). Reverse each, then at level *i* hash `sha256d(sibling ‖ h)` if bit *i* of `pos` is 1, else `sha256d(h ‖ sibling)`; the result, reversed, must equal the header's Merkle root.
   - Proof of work: the header hash, read as a big-endian number after reversal, must not exceed the target decoded from `bits`, and that target must not exceed the network's limit (mainnet and testnet `0x1d00ffff`, regtest `0x207fffff`).
7. A posting `value` must equal `amount × rate`, rounded half away from zero, using a price dated within a day of the entry.
8. `committed` and `aggregated` transactions carry a random 32-byte `salt` (64 hex digits, at least 10 distinct, never reused); `aggregated` ones also state their `count` (units, not distinct people).
9. No email addresses, tokens, keys, home paths, card, account, IBAN, routing, SSN/EIN or phone numbers, extended keys (private or public) or WIF keys, in values or in keys. This is pattern matching: it can't recognise a person's name, so descriptions come from the operator's rules, never from raw bank memos.
10. Transfers, conversions, deposits, withdrawals and settlements post to expense accounts only as positive fees. Conversion accounts appear only in conversion, settlement and reversal entries.
11. A `chain_proof` must check offline (txid, Merkle inclusion, proof of work within the network limit, no 64-byte transaction) to enter the journal. Each txid has one proof, and each proof supports one entry.
12. Each watch-only address belongs to one account. All on-chain accounts and proofs in a journal share one network, and testnet or regtest appear only in simulated journals.
13. Ids are never reserved JavaScript names such as `constructor` or `__proto__`.
14. A reversal has the same status as the entry it reverses. A posted entry may list `retires: [ids]` to replace earlier pending estimates, each once; retired estimates leave the pending balances.

## Evidence classes

Computed at read time per posting, never stored:

`chain-verified`, `chain-proof-unanchored`, `contradicted` (chain evidence cited, but the proven coins disagree with the posting or with the books), `provider-document`, `self-reported`, `estimate`, `pending`, `unknown`.

`chain-verified` needs the viewer's own **anchor**: a block hash for that height that they confirmed from their own node or from at least two different explorers that agree. Without one, a proof proves little: a block at minimum difficulty can be mined on a laptop in minutes. Custody counts only anchored proofs as *proven*; offline-checked coins are reported separately, and an on-chain account's booked balance must equal the coins its checked proofs show.

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

`snapshot.json` is written without a trailing newline, so its file SHA-256 (`shasum -a 256 snapshot.json`, also in `snapshot.sha256` in `sha256sum -c` format) is the digest `ots stamp snapshot.json` timestamps. Every figure in it is computed from the **public** records only.

The **public journal** replaces each `committed` transaction, and each aggregate whose `count` is below `policy.min_aggregate_count` (default 3), with `{ seq, type: "commitment", leaf }`. Publication is refused if a public record names a withheld one (`follows`, `reverses`, `covers`) or a withheld record has a chain proof. A withheld record's existence is visible, and neighbouring public records may reveal its size. Every leaf hash is unchanged, so:
- `verifyPublic(public, snapshot)` checks record count, Merkle root, head, the hash chain across visible records and the withheld count, then **recomputes the whole snapshot from the public records and compares it byte for byte**, so no figure in it can be edited by hand;
- `checkDisclosure(record, proof, snapshot)` lets an auditor confirm a withheld record later, at its own position in a tree of the published size;
- `appendCheck(old, new)` works between private and public copies.

## Verification without this project

1. **Recompute the snapshot.** `qm treasury verify public-journal.jsonl snapshot.json` recomputes the leaves, root and chain.
2. **Check the stamp.** `ots verify snapshot.json.ots` checks the timestamp; this needs a Bitcoin node, or use the explorer method in [`provenance/VERIFY.md`](../../provenance/VERIFY.md).
3. **Anchor on-chain postings.**
   - `qm treasury anchors HEIGHT --explorer blockstream --explorer mempool > anchors.json` gets agreeing block hashes, or write `{ "anchors": { "mainnet": { "HEIGHT": "HASH" } } }` from your own node.
   - Then `qm treasury report public-journal.jsonl --anchors anchors.json` reclassifies those postings, or check one proof with `grep '"type":"chain_proof"' public-journal.jsonl | head -1 > proof.json` and `qm treasury chain-check proof.json --anchors anchors.json --require-anchor`.
4. **Check the code itself.** The algorithms (SHA-256, RFC 6962 Merkle trees, Bitcoin serialization) are standard, so an independent implementation in any language can check the same files.

## Not in 0.1

- Lightning payments.
- Multi-currency FX gain and loss.
- Consistency proofs between snapshots (`append-check` needs both journals).
- An OFX or CAMT.053 bank importer.
- A guard against operator-written rule regexes that backtrack badly (rules are trusted input).
- A River export profile (headers not confirmed).
- Exports to plain-text accounting tools.
