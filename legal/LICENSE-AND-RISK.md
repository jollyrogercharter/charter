# Rights, Licensing, Trust and Risk

**This is general planning, not legal advice.** On 2026-10-18 the initiator applied CC0 1.0 to the repository's eligible original material (`../LICENSE`, scope and exclusions in `../NOTICE.md`). No independent legal review has happened yet; the review below is still wanted ([#11](https://github.com/jollyrogercharter/charter/issues/11)).

## What is being proposed

The founder's philosophical preference is to place rights-controlled original works as fully into the public domain as legally possible. CC0 is a candidate because it aims to waive copyright and related rights to the extent local law permits, with a fallback license. A proper review must consider non-waivable author/moral rights, jurisdiction, patents, source provenance, imported dependencies and permission from all rights holders.

The standard should **not** confuse a public-domain dedication with a guarantee that the original creator continues to own all code or that no downstream derivative can acquire separate rights. Copyright in original eligible material and rights to subsequent original modifications are distinct questions.

## Important separation of documents

| Layer | Purpose |
|---|---|
| Software license / CC0 dedication | Legally grants rights over owned eligible source and docs |
| Manifesto | Moral and cultural philosophy; no contract by itself |
| Open stewardship pledge | Provider's voluntary pricing/transparency commitment |
| Service terms and privacy notice | Binding data control and processing obligations of operator |
| Conformance standard | Technical/economic/governance requirements for honest public claims |
| Trademark/compliance-mark policy | Avoid confusing impersonation; separate from code freedom |
| Contribution policy | Provenance, third-party rights, patent review, AI-generated material |

## Data cannot simply be declared “owned” by a license

Personal records can contain multiple people's information, public data, contractual rights, business records and legally mandated retention. The service's objective is to avoid taking ownership/control unnecessarily, preserve user permissions and provide technically real portability and accountability. Public AT Protocol records are replicable; don't offer a false universal deletion guarantee.

## Real constraints

- **CC0:** cannot dedicate works you don't own or control; international waiver limitations and patent concerns require review.
- **Original AI-generated material:** in the US purely machine-generated elements without sufficient human creative contribution may not carry enforceable copyright; provenance and human authorship matter.
- **Permissive alternatives:** MIT or Apache 2.0 might suit contributors preferring retained attribution or explicit patent grants; whether mixed alternatives meet a formal charter is open.
- **Commercial freedom:** open source should not restrict competitors to cost recovery. The founder's cost-sharing pledge is an operational choice, not a restriction on others.
- **Secrets and security:** never publish operational secrets, personal content, sensitive customer billing data, unpatched actionable vulnerabilities or confidential third-party materials.
- **Trademarks:** unrestricted code copying and protected project-origin identifiers can coexist, but any flag/certification rules should not become a gatekeeper to access or adoption.
- **Operational liability:** publishing code is not a substitute for supply-chain security, privacy engineering, appropriate insurance, signed releases or incident response.

## Review still owed on the applied dedication

Get input from open-source and patent counsel on the CC0 dedication already applied; clarify ownership of all contributed work; decide whether future software needs a different licence or a patent grant; verify dependencies; clarify volunteer contributor terms; then amend the legally operative files if review requires it. Do not assert OSI approval for a chosen tool without checking.

Sources: https://creativecommons.org/public-domain/ ; https://creativecommons.org/faq/ ; https://opensource.org/osd ; https://www.copyright.gov/ai/
