# AI and Human Contributions

This file is a provenance record, not a claim that a model or vendor endorses the movement.

## Founding phase (October 2026)

- **Human initiator:** proposed the philosophy, anti-copyright stance, AT Protocol/user sovereignty, agentic reproducibility, radical operating-cost transparency, infrastructure-cost PRs, Human Attention Accounting, pirate identity, public conversation, AI-led launch and zero-paid-media adoption.
- **OpenAI ChatGPT:** conversational ideation, research assistance, edited manifesto/charter, founding repository docs, early conformance model, Quartermaster concept and initial Claude launch instructions. Specific model/process details should be filled in only from reliably captured information.
- **Anthropic Claude:** launch operator from 2026-10-17. The human initiator created the GitHub organization and bought the domain; Claude built and pushed the repository, opened the PRs (the human merged them) and configured Cloudflare Pages at the human's direction. No social posts have been made. Current state: [`launch/status.json`](../launch/status.json).

## Launch implementation (2026-10-17/18)

- **Claude Opus 5.5 (`claude-opus-5-5`) in Claude Code**, directed by the human initiator: preserved the founding package in Git, generated the SHA-256 provenance manifest, and built the Eleventy site, test suite, CI workflow, `DEPLOYMENT.md`, `OPEN-DEPENDENCIES.md`, founder-absence test and launch records. Run record: [`agent-runs/2026-10-17-launch.md`](agent-runs/2026-10-17-launch.md).
- **Claude Sonnet sub-agent** (dispatched by the above): first drafts of `launch/RFC-SEEDS.md` and `launch/CONTENT-DRAFTS.md`, reviewed by the main agent. The human hasn't reviewed them yet.
- **Human initiator:** issued the instruction and owns every decision listed under "Needs the human" in `launch/LAUNCH-STATUS.md`. Commits are authored under the initiator's GitHub identity because they ran on the initiator's machine. The AI authorship of that work is recorded here.

## Overnight build (2026-10-18)

- **Claude Opus 5.5 in Claude Code**, under the initiator's written authorization (draft PRs only), built:
  - status single-sourcing (PR #4);
  - the `jrc` conformance CLI, its schema and the adoption pages (PR #5);
  - the Quartermaster qm 0.1 ledger (PR #6);
  - verification of the timestamp proof.
  Run record: [`agent-runs/2026-10-18-overnight.md`](agent-runs/2026-10-18-overnight.md).
- **Claude Sonnet sub-agents:** an independent code review and an adversarial review of `jrc` (their confirmed findings were fixed with regression tests), plus first drafts of `launch/RFC-DRAFTS-OVERNIGHT.md` and `launch/LAUNCH-BRIEFING.md`, which the main agent reviewed.
- **Human initiator:** wrote the brief and authorization; merges and every external decision remain theirs.

## WebMCP tools (2026-10-18)

- **Claude Opus 5.5 in Claude Code** designed and built the WebMCP layer, the shared capability layer, the static API and the tests, and split the `jrc` engine for browser use. Run record: [`agent-runs/2026-10-18-webmcp.md`](agent-runs/2026-10-18-webmcp.md).
- **Claude Sonnet sub-agent:** independent review of the WebMCP layer.
- **Human initiator:** wrote the brief; native verification and the origin-trial decision remain theirs.

## Adoption journey (2026-10-18)

- Recorded in [`agent-runs/2026-10-18-adopt.md`](agent-runs/2026-10-18-adopt.md) (Claude Opus 5.5 in Claude Code, a separate session).

## Agent interoperability (2026-10-19)

- **Claude Opus 5.5 in Claude Code**, under the human initiator's brief and with draft PRs only, designed and built the community, Quartermaster, provenance and AT Protocol capabilities, the capability manifest, the MCP server, the CLI access to every tool, and the pages. Run record: [`agent-runs/2026-10-19-interop.md`](agent-runs/2026-10-19-interop.md).
- **Four Claude Sonnet sub-agents** each audited commit 54d193f separately from the main agent: spec compliance and vendor neutrality; security and privacy; accessibility, fallback and reproducibility; claims, transparency and provenance. Their findings and the fixes are in the run record. They are agents working for the project, not independent auditors.
- **Human initiator:** wrote the brief; merges and every external decision remain theirs.

## Statement of honesty

No human-only-authorship or model-only-authorship claims. Publish accessible prompts, inputs, tests and changes where lawful and safe. Mark redactions and unknowns. Do not try to expose undisclosed private chain-of-thought or claim access to it.
