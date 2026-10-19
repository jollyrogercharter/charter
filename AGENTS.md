# Instructions for Human and AI Contributors

This repository is a founding **document collection**, not a deployed product or mature standard. Honor the goals of independent reproducibility and clear human decision-making.

## Before making changes

1. Read `README.md`, `MANIFESTO.md`, `CHARTER.md`, `STEWARDSHIP-ECONOMY.md` and `DECISIONS-AND-QUESTIONS.md`. Keep the three principles (free software, rewarded stewardship, precious human attention) at the center of public material, and put tools on the projects layer.
2. Distinguish confirmed founding preferences, draft implementation proposals, verified external facts and speculative naming.
3. Prefer substantive revisions with context, evidence, compatibility assessment and documented tradeoffs.
4. Do not claim legal adoption, technical certification, live integrations, external endorsement or community consensus that doesn't exist.
5. Never add credentials, personal or payment information, secret vulnerabilities or unlicensed text from a third party to public artifacts.

## For an agent creating an implementation plan

Produce: goals; non-goals; acceptance criteria; rights and data boundaries; architecture; open standards; threat model; infrastructure costs and provenance; deployment/rollback; end-user export/migration; reproducibility test; community review proposal; unresolved decisions.

## For a proposed standards change

Use an RFC or PR documenting: motivation, principle changed, alternatives, privacy/security/legal implications, migration and conformance effects, public criticism, review result and versioning recommendation.

## For a cost-optimization PR

Attach comparable before/after unit costs, one-time expenses, estimate method, performance/security benchmarks, operational risk and an after-deployment measurement plan. No agent may approve its own production changes.

## Overarching test

Could someone without this founding team reproduce the code, process, deployment, costs, data migration and maintenance decision without private help? If no, identify the missing dependency and invite a repair.

## Claude-led launch handoff

Start with [`CLAUDE-LAUNCH-HANDOFF.md`](CLAUDE-LAUNCH-HANDOFF.md) and its supporting `launch/`, `website/` and `transparency/` documents. Do not mistake prior snapshots for live operations or a verbatim transcript. Keep all external actions verifiable and human-controlled where purchase, privacy and irreversible publication are involved.

## Provenance and authenticity requirements

Read [`provenance/README.md`](provenance/README.md) before publishing or describing the founding conversation. Preserve independently auditable SHA-256 digests and OpenTimestamps proofs for human-approved public transcript revisions and substantial releases where feasible, explicitly distinguishing pending and verified attestation. Never backdate proofs, infer origin or copyright ownership from cryptographic hashes, or misrepresent OpenAI-hosted content as an immutable signed authenticity certificate. Require explicit human review of exact transcript bytes and redactions before publication. No raw ChatGPT account export or unrelated private chats belong in Git, agent chat logs, or the public website.
