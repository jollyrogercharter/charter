# Proposed Conformance Standard: Prove Your Freedom

This is a **draft assessment framework**, not a certification or claim any product already qualifies. The project must publish clear, independent evidence; self-attestation alone is not verification.

## Evaluation categories

### 1. Code and rights

Source available; copyright and dependency provenance documented; redistribution, modification, commercial distribution and forks legally permitted for covered original code. Separate any proprietary or restricted components and document their effect.

### 2. Development and AI transparency

Durable specifications, design decisions, agent/tool versions and sanitized session context; deterministic tests and published release/build instructions; ability to swap AI agents without losing intent.

### 3. User data sovereignty

AT Protocol identity and portable data where applicable, documented data boundaries, real export and import, revocable grants where supported, deletion and retention disclosures, special rules for shared/private data.

### 4. Operations and resiliency

No secret proprietary deployment process; infrastructure descriptions, backup/restore and rollback procedures, reproducible release and self-hosting or independent-provider path. The ability to continue without one maintainer is demonstrated, not merely claimed.

### 5. Economic transparency

Privacy-safe provider costs, reconciled bills and fresh estimates, manual costs and reserves labeled, methodology, measurement window, per-user/unit costs with denominators and allocation assumptions; public suggestions for cost efficiency.

### 6. Open community and governance

Accessible issues and proposals; documented review rules, maintainer succession, dispute and appeal process, contribution credits, copy/fork freedoms and an opportunity for independent stewardship.

## Progress levels, not a purity contest

Projects should be able to publish evidence for each category independently. Proposed flags:

- **Exploring:** interest, documented gaps, no conformance claim.
- **Implemented (self-reported):** public evidence links for listed requirements.
- **Independently reproduced:** an external reviewer has verified the claim and published test methods/results.

Never call a self-reported badge an independent certification. Use dated, versioned standards. A project may report '4 of 6 pillars evidenced' and invite help with the remaining two.

## Machine-readable report concept

Use an open JSON/YAML manifest with `standard_version`, `project_id`, `pillar`, `claim`, `evidence_uri`, `evidence_hash`, `reviewer`, `reviewed_at`, `verified` and `limitations`. A public AT Protocol record can point to the report, but the repository must remain usable without a specific PDS or directory operator.

## Acceptance test

Ask an outsider to fork, configure a clean environment, build/release, deploy, export a test user's records, migrate them to another provider, calculate operating cost, submit a safe infrastructure-cost PR and test a maintainer handoff. Log blocked steps and use them to improve the standard.

## Risks

A standard that is impossible for smaller projects to adopt will not spread. A standard too easy to claim becomes marketing theater. Incremental transparent progress and public evidence should bridge the two.
