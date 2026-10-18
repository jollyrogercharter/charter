# Human Attention Accounting (HAA): Draft Standard Extension

**Proposal for JRCv1 discussion, October 17, 2026.** The user has explicitly requested that human attention have a monetized representation in Quartermaster and that the underlying valuation be openly, broadly debated. **No universally accepted hourly price or methodology has yet been agreed.** This document proposes a public and revisable method, not a declaration of consensus or a claim that a person has a market price.

## Core principles

1. **Human attention is a real economic resource even when donated.** It cannot be treated as free simply because a human did not issue an invoice. Do not confuse valuing time with treating a human being as a commodity.
2. **Software should minimize involuntary demands on attention.** A cost-saving change that increases cognitive load, support burden or time spent by users may be a net loss even if cloud bills fall.
3. **Value assumptions are public and contestable.** Publish source, location/year/currency, rate-selection process, reference scenarios, uncertainty ranges and adjustment rules. Anyone can submit reproducible criticism or proposals through public PRs, not only accountants or maintainers.
4. **No mandatory global rate.** A common measurement standard may be globally discussable while context-dependent rates vary by geography, purpose, opportunity cost and task. Provide community-maintained reference rates and transparently allow local overrides. Never infer that a person with lower wages has less inherent worth.
5. **User time belongs to users.** User-attention costs may be estimated from consensual aggregate research or disclosed task models. No covert attention tracking, behavioral scoring, identity-level surveillance or sale of attention data. Do not optimize a product to maximize engagement time.
6. **Avoid double counting.** Paid workers' actual compensation is a cash expense; it must not also be added again as an estimated attention expense. Donated/volunteer effort and attention burdens imposed on users appear as separate imputed economic cost categories.

## Two core ledgers, three useful lenses

| Ledger | Description | Included in the cash price automatically? |
|---|---|---|
| **Cash operating cost** | Provider bills, paid salaries/contracts, support expenses and other actually paid amounts | Potentially, according to a published pricing policy |
| **Stewardship attention imputed cost** | Verified/estimated value of *unpaid* review, volunteer maintenance, governance, incident response and management attention | **No**; it is a noncash economic contribution unless actual compensation is paid |
| **User attention burden** | Time spent learning, waiting, troubleshooting, navigating, recovering from errors, or being interrupted | **No**; an external cost borne by users, reported separately |

Optional additional lenses: (a) **total economic footprint**, combining these without overlap; (b) **attention avoided**, the estimated time saved relative to a documented baseline; and (c) **attention debt**, foreseeable recurring attention caused by avoidable design/maintenance deficiencies. These are analytical measures, not universally accepted accounting measures.

## Calculation v0 proposal

For a task class `j`: `attention_hours_j = instances_j × active_minutes_per_instance_j / 60`.

`imputed_attention_usd_j = attention_hours_j × declared_reference_rate_usd_per_hour_j`.

`stewardship_full_cost = cash_operating_cost + imputed_unpaid_stewardship_attention`.

`total_economic_footprint = stewardship_full_cost + estimated_user_attention_burden`.

Paid human time already included in cash operating cost must not be added again as imputed attention. Interruption / context-recovery overhead may be separately modeled only with a documented, nonoverlapping time estimate. Do not imply that money is actually being transferred when a cost is imputed.

## Example (illustrative, hypothetical, not JRC's actual rates)

- Cloud and other vendor bills: **$500 per month**.
- Paid support: **4 hours × $50 = $200**, recorded as actual paid expense.
- Volunteer code-review and security work: **8 hours × $40 reference = $320**, recorded as imputed donated labor, not paid cost.
- The product requires **10,000 user workflows × 45 seconds = 125 user-hours** monthly; at an illustrative **$20 reference = $2,500** user-attention burden.

Dashboard displays **$700 cash operating cost**; **$320 donated attention**; **$1,020 full stewardship economic cost**; **$2,500 user attention burden**; and **$3,520 estimated combined footprint**, all distinctly labeled. This does **not** mean Quartermaster should charge users $3,520 or that the user time is revenue. If the organization pays reviewers, their invoices move from the noncash ledger into the paid ledger rather than being counted twice.

## Open reference valuation process

- Launch a public debate topic titled **“What is an hour of human attention worth?”** Publish multiple defensible models rather than picking a figure before consultation.
- Candidate scenarios: living-wage baseline; actual compensation for paid work; geographic cost-of-living-sensitive reference; opportunity-cost bands; a purpose-neutral common baseline for evaluation; and user-selected values. These are proposals to compare, not agreed policy.
- Accept evidence and critiques from workers, disabled users, accessibility specialists, maintainers, economists, psychologists, and ordinary users.
- A published reference table must name its stewards, update date, source data, assumptions, equity concerns, dissenting opinions, and version identifier. Adoption is voluntary; alternative valuations remain visible.
- Have independent contributors demonstrate impacts on a reproducible benchmark app and test whether optimizing financial expenses unintentionally moves the burden onto users or volunteers.

## Proposed machine-readable record

```yaml
attention_cost:
  methodology: jrc-human-attention-draft-0.1
  activity: pull_request_review
  perspective: unpaid_stewardship # or user_burden / paid_work
  quantity: 8
  unit: hour
  rate:
    amount: 40
    currency: USD
    basis: illustrative_reference_only
    geography: unspecified
  imputed_amount: 320
  is_cash_expense: false
  measurement: voluntary_aggregate_report
  confidence: estimated
  disclosure: public_aggregate
  reference_period: monthly
```

For user attention, report observations only in aggregate, with consent and privacy safeguards. A project can use public task benchmarks and opt-in usability studies instead of telemetry. Publish data quality and uncertainty; suppress low-count statistics.

## Conformance and decision gates

A JRC application should disclose whether attention is included, for whom, how estimates were obtained, and what is missing. The first conformance levels can require **disclosure and methodology**, not mandatory adoption of any one dollar value. A project may not claim financial savings while hiding increased maintenance/support/user attention burdens. A PR should report total cost impact and projected attention burden alongside cash savings, security, privacy, resilience, and accessibility.

## Intellectual background and caution

The US Department of Transportation uses context-sensitive monetary valuations of travel-time savings for benefit/cost analysis; this shows that time valuation is an established analytical practice, **not** that there is a universal number for human attention. [USDOT guidance](https://www.transportation.gov/office-policy/transportation-policy/revised-departmental-guidance-valuation-travel-time-economic). FOCUS 1.4 standardizes provider *billed* and *effective* costs; Quartermaster's human-attention imputation must remain separately labeled rather than masquerading as FOCUS-reported bills. [FOCUS cost definitions](https://focus.finops.org/docs/specification/v1-4/columns/cost-and-usage/effective-cost/).

## Unresolved questions

Who has authority to publish reference rate versions? Should the charter give equal standing to conflicting valuation scenarios? How should involuntary interruption and cognitive load be measured without invasive tracking? Can usability improvements be verified without imposing additional burdens on participants? How do we avoid extracting unpaid work from volunteers by making it look merely like a public cost number? When should attention-reduction projects be prioritized over cloud-bill savings?
