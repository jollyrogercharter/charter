# The Charter

The [manifesto](MANIFESTO.md) says what we believe. This charter says what it means in practice: a short list of voluntary commitments that a project, or a steward who looks after one, can make and back up with evidence. Nobody needs permission or has to pay anyone to adopt them. They are the founder's proposal, not yet community consensus.

## Our commitments

**Free code**

1. **Release the code under genuinely free terms**, so anyone may use, copy, change, share, sell and build on it.
2. **Write down how to build and run it**, so the software can continue without its original creator.

**Rewarded stewardship**

3. **Charge for stewardship, never for permission.** Get paid for service, reliability, security, support and accountability, not for access to the code.
4. **Make leaving easy.** People can export their data in an open format and move to another steward, or run the software themselves, without a penalty.
5. **Keep honest books.** Say what customers pay for, what it costs to run, and how prices are set. Profit is fine. Personal finances stay private.

**Respected attention**

6. **Give people their time back.** Design software to save attention, not capture it: no surveillance, no selling people's focus, no engagement traps.
7. **Welcome criticism and forks.** Credit contributors honestly.

The founding line behind commitments 2 and 5:

> If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.

These commitments are the founder's proposed plain-language summary, offered for debate in [an RFC](launch/RFC-STEWARDSHIP-ECONOMY.md). They are not yet community consensus.

## Money, in plain terms

- **Stewards can earn a meaningful, even substantial, income.** Profit isn't prohibited, and nothing limits a steward to recovering costs.
- **Open books don't mean personal finances.** A steward explains prices and spending in categories. Their own pay can be a single line.
- **Customers can always move** to another steward, or run the software themselves.
- **The detailed standard hasn't caught up yet.** Parts of the JRCv1 draft below still favor cost recovery and passing efficiencies on as lower prices. Those provisions await community review through the RFC and stay as published until it's decided.

## The detailed standard: JRCv1 (draft)

For anyone who wants to check a project closely, the commitments map onto the six JRCv1 pillars below, with evidence definitions in the [conformance standard](standard/CONFORMANCE.md) and an offline checking tool, [`jrc`](spec/JRC-MANIFEST.md). Most people never need this layer.

| Commitment | JRCv1 pillars |
|---|---|
| 1. Free terms | 1. Creation freedom |
| 2. Build and run instructions | 2. Development freedom, 4. Stewardship freedom |
| 3. Charge for stewardship | 4. Stewardship freedom, 5. Economic freedom |
| 4. Easy leaving | 3. Data freedom, 4. Stewardship freedom |
| 5. Honest books | 5. Economic freedom |
| 6. Time back | 5. Economic freedom (human attention extension) |
| 7. Criticism and forks | 6. Governance freedom |

Where the commitments and JRCv1 differ (on cost recovery, how much financial detail to publish, and whether AT Protocol is a default or a recommendation), JRCv1 below still applies until [the RFC](launch/RFC-STEWARDSHIP-ECONOMY.md) is decided. The text below is unchanged from the founding draft apart from its title ("The Charter: Design Principles and Promises") and heading levels.

### Purpose

Define an adoptable standard for **independently maintainable, user-sovereign software**, rather than creating another software copyright license. The manifesto describes values; this charter provides a bridge to independently assessable practice.

### Six pillars

| Pillar | Normative aspiration | Evidence to request |
|---|---|---|
| 1. Creation freedom | Permissionless reuse and resale of eligible project code | Actual license and provenance, source, dependency inventory |
| 2. Development freedom | Complete, portable, agent-neutral project knowledge | Specs, decisions, sanitized agent traces, tests, build instructions |
| 3. Data freedom | Users control their records and can leave | AT Protocol identity/data model, export/migration demo, rights policy |
| 4. Stewardship freedom | Other providers can operate and maintain the application | Reproducible deployment, incident handbook, release/key transfer plan |
| 5. Economic freedom | Honest, auditable operating costs and pricing | Public cost report, formulas, caveats, reconciliation and provenance |
| 6. Governance freedom | Independent contributors can improve and continue the work | Open proposals, documented decisions, multiple stewards, fork rights |

### Overarching test: The Freedom to Continue

**Proposed JRCv1 extension:** Economic freedom should include an openly discussed and versioned method for measuring human attention, beyond provider invoices. Distinguish paid labor, imputed volunteer/stewardship attention and user time burden. Avoid compulsory universal person-specific valuations and invasive tracking. See [Human Attention Accounting](standard/HUMAN-ATTENTION.md).


A project should be able to demonstrate at least one independent person or organization reproducing its stack, understanding its costs, operating it, upgrading it and performing a complete user-data migration without privileged help from the original creator.

### What this is and is not

- **Is:** philosophy, voluntary operational standard, reference implementations, independent reproducibility challenge, reusable templates, evidence-based conformity checks.
- **Is not:** new OSI-approved software license, mandated cost ceiling for resellers, guarantee of global public-domain status, universal claim to ownership of other people's data, exemption from law, compulsory trademark program or requirement that every adopter use an identical stack.

### Compatibility without capture

AT Protocol is a foundational default. Where not appropriate or not yet capable (especially private and organizational records), an application must transparently document a portable and user-controllable alternative or its current limitation; conformance levels should make the distinction visible. Avoid pretending all types of data are supported by AT Protocol today.

“100% agentic development” describes intentional embrace and full process disclosure, not an obligation to remove human accountability or hide human intellectual contribution. Publication must never expose secrets.

### Non-negotiable process safeguards

1. Public issues and transparent rationales for standards decisions.
2. Human-reviewed changes, threat modeling, CI security checks, and progressive releases for operational changes.
3. Fair attention to community participants, including right to disengage or fork.
4. Standards and badge claims must be verifiable; never pay-to-play for permission to use code or voluntarily assess a project.
5. Project-level financial stewardship commitments must be separable from the copyright license itself.
6. Adoption must never require endorsing one person's ideology, reputation or personal brand.
