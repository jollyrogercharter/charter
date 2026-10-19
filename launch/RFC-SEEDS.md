# RFC Seeds and Discussion Categories

**Status:** Drafts prepared by Claude (Sonnet subagent), October 17, 2026, for the human initiator to open as GitHub Discussions and issues once the GitHub organization and repository exist. **Nothing has been posted.** Replace `<REPO_URL>` and `<SITE_URL>` when they are real. Each RFC below is deliberately unresolved: the options are real options, and the maintainers have not chosen among them. Sources are limited to those already listed in [`../SOURCES.md`](../SOURCES.md) or in this repository's documents.

---

## Section A: GitHub Discussions categories

Create these six categories, with exactly these names.

| Category | Description |
|---|---|
| What Would Make This Fail? | Good-faith attempts to break the charter, the standard or the plan, with the evidence and what would change your mind. |
| Charter and Legal Questions | Questions and critiques about JRCv1, public-domain dedication, patents, contributions, trademarks and jurisdiction; not legal advice. |
| AI/Agent Reproducibility | How to publish an agent-assisted development process so that a stranger can reproduce it, swap agents and continue without us. |
| Open Economics | Cost transparency, stewardship pricing, human attention accounting and proposals to make infrastructure cheaper without moving the burden onto people. |
| AT Protocol and Data Rights | User control, portability, permissioned data and the real limits of what a protocol can promise. |
| Projects Raising the Flag | Honest reports from projects that tried the "Could your software survive without you?" challenge, including partial results and failures. |

---

## Section B: Seed RFCs

Each RFC follows [`.github/ISSUE_TEMPLATE/charter-rfc.md`](../.github/ISSUE_TEMPLATE/charter-rfc.md). Suggested labels: `discussion`, `rfc`.

---

### RFC 1

**Title:** RFC: Should JRCv1 be a conformance standard, a licence, or something else?

#### What should change?

The repository currently calls JRCv1 a draft standard and says it is not an operative software licence. The operational recommendation in `DECISIONS-AND-QUESTIONS.md` is to make it a conformance standard, but the founder's original proposal used "JRCv1" as the name of the Jolly Roger Charter itself, and legal interpretation is open. This RFC asks what JRCv1 should be, and where its boundary lies. The options below are not exhaustive:

1. **Conformance standard only.** JRCv1 defines claims a project can evidence (the six categories in `standard/CONFORMANCE.md`). Rights are granted by separate, existing licences or a CC0 dedication. A project says "evidenced against JRCv1", never "licensed under JRCv1".
2. **Standard plus a recommended licence menu.** The standard lists which licences satisfy its "code and rights" category (for example CC0, MIT, Apache 2.0), so that a conforming project is not forced into one instrument.
3. **A bespoke licence text.** JRCv1 becomes an operative legal instrument. This would need counsel, and the repository's own notes say not to assert OSI approval; a custom text would not be OSI-approved unless the Open Source Initiative reviewed it.
4. **Manifesto and pledge only.** No conformance levels at all; the charter stays a statement of values and each project makes its own promises.

Sub-questions: should the pirate-themed identity be separated from a neutral standard name (the register floats "Open Stewardship Standard")? Should conformance levels be "Exploring / Implemented (self-reported) / Independently reproduced", or something simpler? What does a reviewer test, and who may be a reviewer?

#### Why does this matter for independence, freedom or user sovereignty?

If the standard is mistaken for a licence, people may believe rights exist that do not. If it is too easy to claim, it becomes marketing; if it is too hard, small projects will ignore it. The answer also decides whether anyone needs the project's permission to say they conform, which is the opposite of the "freedom to continue" the charter argues for.

#### Evidence and precedents

- `standard/CONFORMANCE.md` describes six evaluation categories and three progress levels and warns that self-attestation is not verification.
- `legal/LICENSE-AND-RISK.md` separates software licence or CC0 dedication, manifesto, stewardship pledge, service terms, conformance standard, trademark policy and contribution policy as distinct layers.
- The Open Source Definition (https://opensource.org/osd) is an existing definition against which licences are reviewed; the project has not been reviewed against it.
- The GNU/FSF explanation of free software (https://www.gnu.org/philosophy/free-sw.html) is a precedent for a freedom definition that is separate from any single licence text.
- Creative Commons public-domain tools (https://creativecommons.org/public-domain/) are a precedent for a legal tool and a norm statement existing side by side.

#### Strongest argument against this proposal

Whichever option is chosen, someone will argue the opposite with force. Against option 1: a standard with no legal teeth cannot stop false claims, and "evidence" is easy to stage. Against option 3: a new licence text fragments the ecosystem, creates compatibility problems for adopters and cannot reasonably be drafted without paid legal work the project does not have. Against options 1 and 2 together: the movement's name is a flag, and a flag without a binding text may look like decoration.

#### Impact on legal/technical compatibility, privacy, security and costs

Legal compatibility is the main issue: option 3 carries the highest drafting, review and downstream-compatibility cost; options 1 and 2 reuse licences that tools and lawyers already understand. Technically, a machine-readable conformance report (`standard_version`, `claim`, `evidence_uri`, `evidence_hash`, `reviewed_at`, `verified`, `limitations`) is cheap to publish under any option. Privacy and security are unaffected, except that evidence links must never expose secrets. Cost: counsel review is a real expense and should appear in the open ledger when incurred.

#### Suggested validation or experiment

Have two or three outsiders, preferably not code contributors, try to assess one real project against the draft categories and publish where the text was ambiguous. Ask at least one open-source licensing practitioner to critique the "licence versus standard" wording publicly. Record how many reviewers read "conforms to JRCv1" as "is licensed under JRCv1".

#### Decision status

Open. (Maintainers fill in.)

---

### RFC 2

**Title:** RFC: Public domain, CC0 and patents: what can we honestly dedicate?

#### What should change?

The founder prefers to place rights-controlled original works as fully into the public domain as the law allows. No licence or CC0 dedication has been applied yet, which means that by default all rights are reserved; `OPEN-DEPENDENCIES.md` lists this as the largest current gap. This RFC asks what instrument should apply to which material. Options:

1. **CC0 for everything the project controls** (code, docs, specification, media), with its fallback licence, plus a patent statement.
2. **CC0 for text, specification and media; a permissive code licence with an express patent grant (for example Apache 2.0) for code.**
3. **MIT or Apache 2.0 throughout**, accepting that contributors keep attribution.
4. **A tiered scheme** in which contributors choose from a short list and a conformant project may use any item on it.

Sub-questions: how are patents handled, given that CC0 states it does not license patent rights? What contributor terms are needed (a CLA, a DCO, or nothing), and how do we treat AI-assisted contributions where the human creative contribution may be thin? Who owns the "Jolly Roger" and "Truly Free" names and marks, and does a trademark policy contradict the public-domain intent?

#### Why does this matter for independence, freedom or user sovereignty?

"Anyone can copy, sell and fork this" is the central promise. If the legal files do not say so, or say so for material the project cannot dedicate, the promise is hollow or misleading. A patent ambush from a contributor or a contributor's employer would defeat a fork. Conversely, an over-aggressive trademark policy could turn the flag into a gate.

#### Evidence and precedents

- `legal/LICENSE-AND-RISK.md` notes that CC0 cannot dedicate works you do not own or control, that international waiver limits and patent concerns need review, and that purely machine-generated elements may not carry enforceable copyright in the US.
- Creative Commons public-domain tools and FAQs: https://creativecommons.org/public-domain/ and https://creativecommons.org/faq/.
- SQLite's copyright page (https://www.sqlite.org/copyright.html) explains how one project handles public-domain dedication in practice and its fallback for jurisdictions that do not recognise it.
- The US Copyright Office AI materials (https://www.copyright.gov/ai/), cited in the legal note, address the copyrightability of AI-generated material.
- The Open Source Definition (https://opensource.org/osd) for the permissive alternatives.

#### Strongest argument against this proposal

CC0 may be the wrong tool for code. It does not grant patent rights, some jurisdictions treat moral rights as non-waivable, and an explicit patent grant is exactly what many companies require before adopting software. A permissive licence is more boring and more adoptable. In the other direction, any attribution-bearing licence contradicts the founder's stated wish for no ownership claims at all.

#### Impact on legal/technical compatibility, privacy, security and costs

Legal: some dependencies will carry their own licences, and the project must inventory them. Technical: licence headers and a machine-readable licence file (for example SPDX identifiers) are cheap; changing the licence after external contributions arrive is expensive, so the decision is time-sensitive. Privacy and security: none directly, but contributor terms should not require collecting personal data beyond what is needed. Costs: a review by open-source and patent counsel, which is not free; record the cost in the ledger.

#### Suggested validation or experiment

Publish a short inventory of what the repository contains and who has contributed to it, then ask counsel (volunteer or paid) to mark each item as "can be dedicated", "cannot" or "unclear". Run a public poll of would-be adopters on which options would block adoption in their organisation, and publish the dissent as well as the tally. Treat all outputs as inputs to a decision, not legal advice.

#### Decision status

Open. (Maintainers fill in.) Blocked on legal review.

---

### RFC 3

**Title:** RFC: AT Protocol data portability, private records and the limits of Spaces (alpha)

#### What should change?

`standard/DATA-SOVEREIGNTY.md` makes AT Protocol a core pillar, but no application holding user data exists yet, so nothing can be exported or migrated today. This RFC asks what the standard should require now, given what the protocol can and cannot do. Open choices:

1. **Public-records-first.** Require portability only for public, repository-based records; treat anything private as out of scope until permissioned data matures.
2. **Spaces-as-experiment.** Allow a reference application to try permissioned Spaces behind an explicit "alpha, no production privacy claim" label, and test export from it.
3. **Application-layer private storage.** Keep private data outside the protocol (encrypted, exportable in an open format) and use atproto only for identity and public records.
4. **Capability-based conformance.** Do not mandate any mechanism; require a published, tested export and migration path, plus honest disclosure of what is and is not portable.

Sub-questions: who owns a shared or jointly authored record when participants disagree on export? What happens when a user loses keys? Can public records be selectively forgotten, given replication? What must an app do when its atproto support is partial? How should Lexicon NSIDs and their versioning be governed?

#### Why does this matter for independence, freedom or user sovereignty?

"The data is yours" is a headline promise of the charter, and the legal drafting note says it means enforceable control rather than a universal factual claim. If the standard over-promises on privacy or deletion, it will mislead the people it claims to serve.

#### Evidence and precedents

- AT Protocol overview and Lexicon specification: https://atproto.com/guides/overview and https://atproto.com/specs/lexicon.
- The Spaces alpha announcement of August 20, 2026 (https://atproto.com/blog/atproto-spaces-alpha) and the Spaces developer-goals post of October 14, 2026 (https://atproto.com/blog/devex-goals-for-spaces). `standard/DATA-SOVEREIGNTY.md` records that Spaces was alpha as of August 20, 2026 and still under development in October, and says not to claim production-grade private-data security because it exists.
- `standard/DATA-SOVEREIGNTY.md` also notes that default public repositories are public and replicable, so removal from a primary server cannot promise removal from all copies.
- `standard/CONFORMANCE.md` proposes an acceptance test: export a test user's records and migrate them to another provider.

#### Strongest argument against this proposal

Requiring atproto at the core ties the standard to one protocol whose private-data story is unfinished and whose governance the project does not control. A standard that depends on an alpha feature may become obsolete or force adopters to ship something unsafe. On the other hand, a standard that merely says "portable data" with no protocol is too vague to test.

#### Impact on legal/technical compatibility, privacy, security and costs

Privacy and security carry the weight here: encryption, key management, access control, recovery policy and legal data-subject requests need engineering beyond the protocol. Legal: deletion promises must not exceed what replication allows. Technical: derived indexes and app views must be rebuildable from user-held records. Costs: key-recovery and backup services have ongoing costs that should appear in the ledger.

#### Suggested validation or experiment

Build a throwaway test application with dummy users, export their records, import them into a second provider, and publish every step that failed. Separately, run a threat-model review of a shared record with two participants who disagree. No real personal data is used in either test.

#### Decision status

Open. (Maintainers fill in.)

---

### RFC 4 (withdrawn)

A policy for publishing the founding conversation. Withdrawn on 2026-10-19, when the project stopped pursuing founding provenance. The numbering of the other RFCs is unchanged.

---

### RFC 5

**Title:** RFC: Human Attention Accounting without a compulsory universal dollar rate

#### What should change?

`standard/HUMAN-ATTENTION.md` proposes a dollar-denominated, openly debated representation of human attention in Quartermaster, in three separately labelled ledgers: cash operating cost, imputed unpaid stewardship attention, and user attention burden. **No universal hourly price has been agreed, and this RFC does not propose one.** It asks how rates, if any, should be chosen and shown. Options:

1. **No default rate.** Report attention in hours only, and let each reader multiply by their own rate.
2. **Declared per-project reference rates**, each with source, geography, year, currency and uncertainty, and a visible local override.
3. **Community-maintained reference table** with versioned scenarios (living-wage baseline, actual compensation, cost-of-living-sensitive, opportunity-cost band, user-selected), named stewards and recorded dissent.
4. **Dual display**: hours always, dollars optional and clearly marked as imputed.

Sub-questions: who may publish a reference table version, and do conflicting scenarios get equal standing? How is user-attention burden measured without telemetry, surveillance or engagement targets (opt-in studies and public task benchmarks are the draft's suggestion)? How do we stop imputed numbers from being used to pressure volunteers into unpaid work? When should attention-reduction work outrank cloud-bill savings?

#### Why does this matter for independence, freedom or user sovereignty?

The charter says human attention is a real cost even when no money changes hands, and that a cheaper infrastructure bill is not progress if it makes people spend more of their lives fighting the product. A single rate would also imply that some people's time is worth less. The question is whether a number helps or harms.

#### Evidence and precedents

- `standard/HUMAN-ATTENTION.md` sets the principles (no mandatory global rate, no covert tracking, no double counting) and a v0 calculation, and gives a clearly hypothetical worked example.
- The US Department of Transportation guidance on valuing travel time (https://www.transportation.gov/office-policy/transportation-policy/revised-departmental-guidance-valuation-travel-time-economic) shows that monetising time is an established practice in economic analysis; it is context-sensitive and is not evidence that a universal number for human attention exists.
- FOCUS 1.4 distinguishes billed from effective cost (https://focus.finops.org/docs/specification/v1-4/columns/cost-and-usage/effective-cost/); imputed attention must stay separately labelled and must not masquerade as a billed expense.

#### Strongest argument against this proposal

Putting a price on attention may do harm even when well intended: it can commodify volunteer time, invite gaming (inflate hours, inflate "savings"), or hand organisations a tidy justification for ignoring people who cannot be measured. Any rate table will be contested and will take real governance effort that a small project may not sustain. Hours-only reporting avoids all of this at the cost of being harder to compare with cash.

#### Impact on legal/technical compatibility, privacy, security and costs

Privacy is central: user-attention data must be aggregate, consented, and suppressed at low counts. Technically, the draft's `attention_cost` record (activity, perspective, quantity, unit, rate with basis and geography, `is_cash_expense`, measurement, confidence, disclosure) is small, but whether `rate` is required or optional is exactly the open question. Tax or employment-law consequences of recording donated labour in dollar terms have not been examined. Costs: running a public rate-setting process is itself a use of attention and should be counted.

#### Suggested validation or experiment

Take one real, small pull request and have several reviewers estimate its stewardship attention in hours, then apply two or three candidate rate scenarios and publish the spread. Run an opt-in usability study on a reference workflow and compare it to a cloud-cost change that shifts effort onto users. Invite economists, accessibility specialists and maintainers to explain what the numbers hid.

#### Decision status

Open. (Maintainers fill in.)

---

### RFC 6

**Title:** RFC: Quartermaster interface: cost schema, FOCUS normalisation and provider connectors

#### What should change?

`product/QUARTERMASTER.md` describes a candidate reference application for public cost accountability. Its name is a working name, unverified. It sketches provider adapters, a private ledger, FOCUS-style normalisation, manual entries, a redaction boundary and a public snapshot, with an OpenAPI definition and generated clients. This RFC asks what the first interface contract should be. Open choices:

1. **Cost schema.** (a) Adopt FOCUS 1.4 columns as the canonical schema, extended with project-specific fields; (b) define a smaller JRC schema and provide a FOCUS export; (c) store provider-native records and normalise only at publication.
2. **Where imputed attention lives.** Inside the same schema with an `is_cash_expense` flag, or in a separate schema so that nothing imputed can be mistaken for a bill.
3. **First provider connectors.** Which two providers, chosen how (developer demand, openness of the billing API, cost of testing), and whether read-only credentials are acceptable at all versus manual CSV import first.
4. **Interface style.** OpenAPI-first with generated SDKs (OpenAPI Generator), a CLI and file-based formats only, or an atproto Lexicon for published records.
5. **Publication granularity.** What is aggregated or suppressed so that small-scale unit costs do not reveal customers.

#### Why does this matter for independence, freedom or user sovereignty?

The movement's test is "if we can explain how to run it, we should explain what it costs." An interface locked to a few providers or a private schema would let one team control the numbers. The interface also decides whether a stranger can verify a published cost against a provider bill.

#### Evidence and precedents

- FOCUS 1.4 specification: https://focus.finops.org/docs/specification/v1-4/ and its billed versus effective cost definitions.
- OpenCost (https://opencost.io/) for allocation, Infracost (https://www.infracost.io/) for pull-request cost estimates, OpenTofu (https://opentofu.org/) for infrastructure as code, and OpenAPI Generator (https://openapi-generator.tech/) for clients.
- `product/QUARTERMASTER.md` itself warns that billing APIs are delayed and provider-specific, that credentials need secure storage, that refunds, credits and currencies need handling, and that public estimates are not audited financial statements. It also says the niche versus existing tools is unvalidated.
- `standard/CONFORMANCE.md` lists "Economic transparency" as one of six evaluation categories.

#### Strongest argument against this proposal

Existing FinOps tooling already normalises and optimises spending, and a new reference application may duplicate it. A public cost dashboard also creates risk: it can leak customer information, invite abuse, and give false precision to estimates. A project of this size may be better served by a documented spreadsheet and a script than by an API with eight language clients.

#### Impact on legal/technical compatibility, privacy, security and costs

Security: read-only provider credentials still need secret storage, scoping and rotation; no billing secrets may reach a public repository. Privacy: aggregation thresholds and suppression. Compatibility: FOCUS alignment makes exports useful to existing tools; the cost is complexity. Costs: the application's own running cost must appear in its own ledger.

#### Suggested validation or experiment

Take one month of the project's real bills (or honest zero values if there are none), enter them by hand into a draft schema, and have an outsider reproduce the published totals from the sources. Then try the same exercise with a second provider and record every field that did not fit.

#### Decision status

Open. (Maintainers fill in.)
