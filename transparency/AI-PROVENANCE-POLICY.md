# AI Provenance and Process Transparency Policy (proposed)

## The pledge

**No impostor authorship. No fake independence. No concealed AI contributions.**

This project began as a human-led ideation conversation with OpenAI's ChatGPT, and subsequent development may be carried out with Anthropic's Claude and other agents. We will describe contributions accurately, not claim that either a human or AI independently completed work actually done collaboratively. AI providers do not automatically endorse the project.

This pledge is not a demand that every AI thought or internal token be public. Only logs and artifacts lawfully accessible to project contributors can be published, subject to privacy and security safeguards. Do not invent hidden reasoning, tool execution, sources or authorship.

## Publication standard

For substantive changes, publish, where safely available:

1. Task request/goal and the authorizing human or community decision.
2. Agent model/tool names, versions and dates **when known**.
3. Human instructions and material agent prompts, including exact originals when safe and permitted.
4. Relevant output, diff, tests, limitations, review findings and corrective changes.
5. Human approvals for sensitive external acts, without exposing authentication details.
6. Out-of-pocket cost and imputed attention cost when credible to estimate.
7. Links to source code, build instructions, dependency manifests and deploy evidence.

A useful initial structure:

```text
transparency/
  AI-PROVENANCE-POLICY.md
  AI-CONTRIBUTIONS.md
  agent-runs/
    2026-10-17-launch.md
  prompts/
    initial-claude-handoff.md
  publication-log.md
```

A practical run record might contain: date; purpose; initiator; model and tools; sanitized original request; decisions; commits; tests; approval checkpoints; known limitations; cost estimate and sources. Avoid exposing sensitive, high-volume tool chatter that adds no reproducibility value.

## Redaction rules

Use documented redaction categories: personal data, secrets/tokens, private third-party communications, financial account metadata, vulnerabilities and third-party rights. Replace with `[REDACTED: category]` in public texts when feasible; keep precise private information out of Git history entirely. Explain omitted portions but not the secret itself.

Keep a reviewable redaction log describing what category was removed, why, reviewer and date. Never write private material then delete it in a later commit; public Git history retains objects.

## Authenticity and source integrity

For released transcripts and process logs, publish a SHA-256 checksum of the public edition and reference the exact Git commit/tag. Label any editorial changes. A paraphrased founding summary is not a verbatim transcript. Public agents and humans should be credited in release notes and commit trailers if reliable attribution can be recorded.

## Public statement for the website

> This project was conceived through a conversation between a human initiator and ChatGPT, and its initial implementation was directed to Claude. We embrace AI-assisted creation and openly credit it. We publish the decisions, prompts, code, build process and costs that can responsibly be shared. We don't present AI work as secretly human-made, and we don't claim access to hidden model reasoning or private information.

## Debate is part of honesty

Encourage contributors to question whether AI dramatically decreases total lifecycle costs, whether publication is truly sufficient for reproduction, and how authorship/license claims apply to generated material. Document unresolved disagreements rather than branding them as consensus.

## Independent origin and development proofs (proposed addition)

The standard should preserve **publicly verifiable file integrity** and, when possible, independent timestamp attestations in addition to ordinary editorial notes. Follow [`../provenance/README.md`](../provenance/README.md) for the distinct roles of SHA-256, Git history, source metadata, hosted ChatGPT snapshots, optional build attestations, and independently verifiable OpenTimestamps proofs. Make the proof state explicit: `not-requested`, `pending`, or `verified` with actual evidence. Never imply that timestamping certifies authorship, global novelty, the historical time of every message, or endorsement by OpenAI or Anthropic.

For agent sessions, include a release digest plus human/AI contribution evidence where safe. Signatures or build attestations should be verified, not merely generated. Maintain transparency without claiming access to hidden reasoning or shipping an unfiltered user account export.
