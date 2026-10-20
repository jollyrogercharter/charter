# RFC: Reorient JRC Around Rewarded Stewardship

| | |
|---|---|
| Status | **Draft RFC, open for criticism.** The editorial changes in section 3 were merged to `main` in #17 and are live. The JRCv1 changes in section 4 are proposals only: no JRCv1 requirement, schema or tool changes until this RFC is reviewed. |
| Proposed by | The human founder, 2026-10-19. Drafted by Claude Opus 5.5 (AI agent) at the founder's request. |
| Decision needed from | The community, through the process in [`community/GOVERNANCE-AND-DEBATE.md`](../community/GOVERNANCE-AND-DEBATE.md). A founder's proposal is not consensus. |

## 1. Motivation

The founding drafts grew into six pillars, a conformance tool, a cost ledger, origin proofs and agent interfaces. A newcomer meeting all of that at once can't tell what the movement is for.

The founder's restatement: Jolly Roger is a movement to change **how people earn a living from software** once AI makes software abundant. It rests on three principles:

1. **Software should be free.** Anyone may use, copy, modify, distribute and build on it, and continuing it must not depend on its creator.
2. **Stewardship should be rewarded.** People should earn meaningful, sustainable and potentially substantial income by keeping software reliable, secure and supported and by taking responsibility for it. Not by hours worked, and not by manufacturing dependence.
3. **Human attention is precious.** Software should give people time back, not capture it.

The founding drafts framed money narrowly: cost recovery, open operating expenses and passing efficiencies back as lower prices. That reads as a nonprofit pledge, and it makes the movement unattractive to the people it most needs: stewards who want to make a good living.

## 2. Principle changed

**From:** "Our aspiration is sustainable cost recovery and accountable reserves" (Manifesto v0.1) and "the pledge favors passing efficiencies to the community through lower prices" ([`standard/OPEN-ECONOMICS.md`](../standard/OPEN-ECONOMICS.md)).

**To:** "We are not trying to eliminate software profits. We are trying to separate them from artificial scarcity and dependency." Stewards may profit, including from AI-driven efficiency. Open books remain an accountability principle, not a cap on income and not a requirement to disclose personal finances.

## 3. Editorial changes already made (merged in #17)

- A one-page [manifesto](../MANIFESTO.md) (v0.2). The v0.1 founding draft is kept in [`history/`](../history/MANIFESTO-v0.1-2026-10-17.md).
- A plain-language commitments section at the top of [`CHARTER.md`](../CHARTER.md). The JRCv1 text beneath it is unchanged.
- New explanatory documents: [`STEWARDSHIP-ECONOMY.md`](../STEWARDSHIP-ECONOMY.md), [`STEWARDSHIP-PILOT.md`](../STEWARDSHIP-PILOT.md), [`PROJECTS.md`](../PROJECTS.md).
- The website leads with the three principles; technical pages move to secondary navigation at unchanged URLs.
- Clarified 2026-10-20: the movement doesn't oppose hourly work. Its position is that a software livelihood shouldn't *have to* depend on billable hours, restricted code or captive customers.

None of this changes `jrc`, the manifest schema, the Quartermaster formats, the API, the WebMCP or MCP tools, or any conformance result.

## 4. Conflicts between the new framing and JRCv1, with proposed resolutions

| # | Where | Conflict | Proposed resolution |
|---|---|---|---|
| 1 | `standard/OPEN-ECONOMICS.md`, "Sustainable pricing"; Manifesto v0.1 | The pledge favors passing efficiencies to the community. The new framing says efficiency may become steward income. | Replace the efficiency pledge with a **price-honesty pledge**: publish what is included, how prices are set and where money goes by category. Keep "Competing providers may price differently; the license must not restrict them." |
| 2 | `standard/OPEN-ECONOMICS.md`, cost categories ("paid human development"); pillar 5 evidence ("public cost report") | Itemized labor costs can expose an individual's pay. | Allow steward compensation as one aggregate line. State that transparency never requires personal or household finances. |
| 3 | Pillar 3 and "Compatibility without capture" (AT Protocol "foundational default") | The new framing treats protocols as optional tools, not part of the movement. | Keep the **outcome** normative (users can export their data in an open format and leave without penalty). Keep AT Protocol as JRCv1's *recommended reference* rather than its default. Conformance evidence accepts any documented, user-controllable export path. |
| 4 | `standard/HUMAN-ATTENTION.md` (dollar-valued attention in Quartermaster) | The new framing measures attention saved in time first and declines a universal hourly value. | No conflict in substance: HAA already rejects a mandatory global rate. Add guidance that reports lead with time, and that any monetary conversion names its rate and source. |
| 5 | `DECISIONS-AND-QUESTIONS.md`: founding line "retain verbatim" | A one-page manifesto can't carry every founding line. | Keep the line verbatim in the Charter, under the honest-books commitment, and in the preserved v0.1 manifesto. Founder to confirm. |
| 6 | Charter purpose: "independently maintainable, user-sovereign software" | Economics was one pillar of six. Now it's the movement's reason for existing. | Add a stewardship-economics section to the JRCv1 purpose in the next draft. No new conformance requirement until the pilot produces evidence. |

## 5. Alternatives considered

- **Keep cost recovery as the norm.** Rejected by the founder: it limits stewards' income and confuses openness with charity.
- **Drop financial transparency entirely.** Rejected: open books are how stewards without lock-in earn trust.
- **Rewrite JRCv1 now.** Rejected: that would turn a founder's proposal into a standard without review, and before the pilot has produced any evidence.
- **Move technical documents into a `projects/` directory.** Rejected: it breaks links and digests for no reader benefit. Navigation does the job.

## 6. Privacy, security and legal implications

- Resolution 2 reduces privacy exposure for individual stewards.
- The pilot handles real customer data. It needs a privacy notice, access controls and incident handling, and no customer data in this repository (see [`STEWARDSHIP-PILOT.md`](../STEWARDSHIP-PILOT.md)).
- Encouraging for-profit stewardship of others' free software raises trademark and endorsement questions. Stewards must not imply upstream endorsement.
- Not legal or tax advice. CC0 review (issue #11) is unaffected.

## 7. Migration and conformance effects

None until resolutions 1–3 and 6 are accepted. If accepted: JRCv1 draft 0.2, with an updated [`standard/OPEN-ECONOMICS.md`](../standard/OPEN-ECONOMICS.md), pillar 3 and 5 evidence text in `lib/jrc/constants.mjs`, and a changelog entry. Existing `jrc.json` manifests stay valid: the proposals relax requirements rather than adding them.

## 8. Public criticism to invite

- Doesn't "profit is fine" invite the same extractive behavior the movement objects to, just with better branding?
- If stewards compete freely, won't prices fall to the cost of AI compute and squeeze out human stewards?
- Is "you can always leave" real for nontechnical customers who can't evaluate an export?
- Does dropping the efficiency pledge abandon users who were promised lower prices?

## 9. Review result

Not yet reviewed. Open decision 13 in [`DECISIONS-AND-QUESTIONS.md`](../DECISIONS-AND-QUESTIONS.md) tracks it on the debate page.

## 10. Versioning recommendation

The editorial layer (Manifesto v0.2, charter introduction, website) needs no JRCv1 version change. Resolutions 1–3 and 6, if accepted, become **JRCv1 draft 0.2**.
