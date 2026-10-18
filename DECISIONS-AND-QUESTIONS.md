# Decision Register and Open Questions

Captured October 17, 2026. **Confirmed** means the user explicitly favored the concept in conversation; it does not imply publication or legal implementation.

## Explicitly favored or firmly expressed

- This is intended as a **movement**, not merely a software product, and should eventually thrive without founder dependence.
- Central framing: **Free. Libre. Truly Free.** Freedom should encompass more than source code.
- Reuse verbatim: **“If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.”**
- Reuse the **Jefferson** and **Wozniak** quotations, accurately sourced.
- Favor historical/revolutionary narratives with credited intellectual predecessors.
- Strong philosophical skepticism of copyright exclusivity; art is creative and derivative; even the manifesto should be freely reusable.
- Permit other companies to copy, improve and **sell** software without being forced into the originating organization's pricing pledge.
- Support AI agents **fully** in software development; publish the reproducible process, not just the final artifact.
- **AT Protocol at the core** and strong user control, privacy and portability of data.
- Radical **cost transparency**, provider billing API connectors, measured and manual costs, near-live dashboard, clear pricing formula.
- Infrastructure improvement proposals made by open PRs to a documented, machine-readable infrastructure model.
- Favor a pirate-themed identity and salute to authorized copying; candidate brand **Jolly Roger** / **Pirate Charter**.
- First candidate implementation: multilingual/SDK-friendly **billing integration and public cost transparency tool** (working name Quartermaster).
- Favor an **open debate** forum and public red-team criticism.
- Favor **Could your software survive without you?** as a signature challenge.
- Seek wide awareness through **organic, zero-paid-media** distribution across compatible communities and independent adopters.

## Additional explicit launch intentions

- **JRCv1** is the user's proposed initial name for the **Jolly Roger Charter**, with legal interpretation still open. Operational recommendation: make it a conformance standard, not a purported custom OSI-approved software license.
- Hand initial execution to **Anthropic Claude**: register a **free** GitHub organization and initial repository, publish the existing archive, create a movement website using Eleventy or React, verify/register a suitable domain with user-controlled ownership, and organize **AI-led, organic, zero-paid-media** outreach.
- Preserve **the entire founding conversation** on the website and/or repository when an accurate source is available and the human approves the exact public edition. Do not silently replace a raw transcript with a reconstruction or leak private content.
- Openly disclose agent participation and AI authorship throughout the project. Oppose misleading "human-only" credit for AI-assisted work, without erasing genuine human direction or accountability.
- Intended GitHub organization candidate: `jollyrogercharter`; intended domain: `jollyrogercharter.org`. Neither is verified as acquired or registrable; fallback naming and trademark clearance remain open.
- Prefer **Eleventy** and a portable static host, to keep the site simple and operationally reproducible. This is an implementation recommendation, not yet a user-ratified framework decision.

## Candidate recommendations, not yet final

- **New user proposal (October 17, 2026):** Human attention should carry a dollar-denominated value within Quartermaster, and the valuation method/rate should be openly debated and community-governed. Specific rate/method remains **unsettled**; consult [Human Attention Accounting](standard/HUMAN-ATTENTION.md). Separate paid labor, volunteered work and user attention, with no double counting or covert tracking.


- Separate pirate-themed movement identity from a neutral technical standard name (for example, Open Stewardship Standard).
- Public-domain dedication via CC0 for works with controlled rights; have a lawyer review patent, licensing and jurisdiction risks.
- OpenTofu for example IaC; FOCUS 1.4 normalization; OpenCost allocation; Infracost PR estimates; generated multilingual clients using OpenAPI.
- Multiple evidence levels for adoption; optional emblem, not mandatory approval by central authority.
- Public documentation repository with separate charter, legal, technical and governance files.
- Public independent challenge and a reference application before seeking a formal organization.
- Adopt existing nonprofit or fiscal sponsor only when helpful.

## Open decisions requiring debate

1. **Naming and clearance:** Jolly Roger, Pirate Charter, Truly Free, Quartermaster and neutral standard name; trademark/domain search.
2. **Licensing:** CC0 for original eligible work? How to address patents and non-waivable rights? What alternatives can an adopter use and still conform?
3. **Brand governance:** public-domain graphics vs controlled compliance mark; guard against fake compliance without centralizing control.
4. **Atproto data model:** proposed Lexicon names and schema governance; shared/private organizational records; Spaces readiness.
5. **Cost methodology:** what counts as stewardship cost, opportunity cost, salaries, volunteer labor, reserves, reimbursements and taxes; transparency granularity.
6. **Economic pledge:** how to determine a reasonable reserve and who approves use of excess revenue.
7. **Disclosure policy:** precisely which agent logs, credentials, security findings, datasets, employee/customer details cannot be published.
8. **Conformance:** how to prevent unverifiable badges or standards capture; target role of independent reviewers.
9. **Governance:** initial maintainer selection, voting mechanism, amendment rules, conflict resolution and emergency succession.
10. **Reference app scope:** which two cost providers first; which programming languages to prioritize; self-hosted billing credential storage model.
11. **Distribution:** order of outreach and launch timing; first independent reviewers and maintainers.
12. **Novelty framing:** describe a new synthesis rather than claiming global priority.

## Don't lose these exact lines

> The code is everyone's. The data is yours. The responsibility is ours, for as long as you choose us.

> You can't pirate what belongs to everyone.

> Free to use. Free to reproduce. Free to improve. Free to compete. Free to leave.

> Our books are open. Our infrastructure is open. Our future is open to contribution.

> Could your software survive without you?

> The first software movement that hopes you'll copy everything.

> The freedom to continue.

## Confirmed new direction: proof of origin and ongoing transparent development (October 17, 2026)

- The human enthusiastically proposed preserving ChatGPT conversations as a verifiable **artifact** evidencing the documented formation of the idea, and explicitly asked that the latest discussion be incorporated in Claude's launch instructions.
- Adopt **independent provenance of creation history** as a candidate core JRCv1 commitment: exact reviewed public transcript, SHA-256, OpenTimestamps proof, versioned Git reference, reproducible verification, and ongoing agent-run/release evidence. Technical format and conformance level remain open for RFC.
- Continue to distinguish philosophical freedom from exclusive IP claims. Timestamps establish existence no later than the attested time, **not** authorship, undisputed priority, OpenAI certification, or the original dates claimed inside the conversation.
- Human-controlled ChatGPT export is still needed to prepare a true transcript. The existing edited founding archive must not be relabeled as a verbatim ChatGPT export. Sensitive raw account exports remain private; publication requires explicit human approval of the exact public edition.
- New specification and status: [`provenance/README.md`](provenance/README.md), [`provenance/VERIFY.md`](provenance/VERIFY.md) and illustrative [`provenance/proof-manifest.example.json`](provenance/proof-manifest.example.json). **No completed origin proof or ChatGPT-hosted certificate is included.**

## Decision: CC0 for this repository (October 18, 2026)

- The human initiator chose CC0 1.0 Universal for all original content in the charter repository (`LICENSE`, scope and exclusions in `NOTICE.md`), ahead of the legal review this register recommended. Review is still wanted.
- CC0 section 4(a) does not waive patent rights. Acceptable for this documents-and-website repository; the licence for future software such as Quartermaster stays open (CC0 plus a patent pledge, or Apache-2.0), as seed RFC 2 proposes.
