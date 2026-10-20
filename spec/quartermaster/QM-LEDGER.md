# Quartermaster Expense Ledger, version 0.1 draft

The first small, testable piece of [Quartermaster](../../product/QUARTERMASTER.md): a format for publishing a project's operating costs honestly, and a validator for it. It is **not** a billing integration. Nothing here connects to a provider, holds credentials or reads invoices automatically.

- Schema: [`qm-0.1.schema.json`](qm-0.1.schema.json)
- Tool: `node bin/qm.mjs validate | summary | csv2json | compare | savings`, local files only
- Live example: [`launch/costs.json`](../../launch/costs.json), rendered at https://jollyrogercharter.org/costs/

## Five categories, never added together

| Category | Meaning | Amount | Hours |
|---|---|---|---|
| `cash` | Money actually paid or billed | known number, or `null` = unknown | — |
| `forecast` | Expected future spending, not billed yet | known or `null` | — |
| `reserve` | Money set aside, not spent | known or `null` | — |
| `donated-labor` | Unpaid contributor time | only with a published `valuation_method` | number, or `null` = unmeasured |
| `user-attention` | Time users spend because of the software | only with a published `valuation_method` | number, or `null` = unmeasured |

`qm summary` reports known cash spending and **counts** unknown items. It never treats an unknown as zero, and it never folds forecasts or noncash time into the cash total. There's no default hourly rate; see the attention-valuation RFC in `launch/RFC-DRAFTS-OVERNIGHT.md`.

## Every entry is sourced

Entries reference a declared `source` with a `kind` (`invoice`, `registrar`, `provider-dashboard`, `provider-api`, `manual`, `estimate`) and a `retrieved_utc` time. A `cash` amount can't come from an `estimate` source; use `forecast`.

## Privacy rules (enforced by `qm validate`)

- Publish amounts, never billing identifiers: invoice numbers, account numbers and card-like digit runs are rejected.
- The same scanner `jrc` uses rejects email addresses, tokens, keys, credentials, home-directory paths and hidden characters.
- Each entry carries a `privacy` class: `public`, `aggregated` (combined from several private records) or `redacted` (details withheld; say why in `status`).
- Keep raw invoices and provider exports out of the repository entirely.

## CSV import

```bash
node bin/qm.mjs csv2json entries.csv --header ledger-header.json > launch/costs.json
```

Columns: `id, category, item, provider, amount, hours, valuation_method, date, period_end, recurrence, status, source, attribution, privacy`. Write `unknown` or leave `amount` empty for unknown. The header JSON supplies `qm`, `project`, `currency`, `as_of_utc` and `sources`. Nothing is written unless the combined ledger validates.

## Not built yet

Provider adapters: no credentials-free, publicly documented sample billing export was available to build and test one against honestly. FOCUS 1.4 mapping is a candidate for the next version (`cash` ~ BilledCost, `forecast` outside FOCUS scope); see seed RFC 6.
