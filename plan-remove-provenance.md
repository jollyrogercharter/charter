# Plan: retire the founding provenance initiative

Branch `feat/remove-provenance`, stacked on `feat/reorient` (which touches the same files). The treasury (#16) was dropped, so the OpenTimestamps verifier goes too. Founder decision, 2026-10-19.

## Scope found

The initiative lives in: `provenance/` (digest list, OTS proof, manifest, verifier, docs), `transparency/` (AI-provenance policy, conversation-publication plan, AI-contributions ledger, verbatim prompt briefs), `lib/provenance/` and five agent tools built on it (`get_provenance`, `get_provenance_manifest`, `verify_hashes`, `get_timestamp_status`, `explain_evidence_limitations`) with their CLI (`jrc provenance`), MCP, WebMCP, static API (`/api/v1/provenance.json`, `/api/v1/timestamp.json`) and the in-browser hash checker; the `/provenance/`, `/conversation/`, `/conversation/archive/` and `/how-it-was-made/` pages; the sitewide "Who made this" block; `scripts/hash-manifest.mjs`; three status items; tests; and references across README, AGENTS, NOTICE, DEPLOYMENT, OPEN-DEPENDENCIES, PROJECTS, DECISIONS, the JRCv1 agentic-reproducibility standard and `jrc.json`.

`main` (live) serves `/provenance/`, `/conversation/`, `/conversation/archive/` and `/how-it-was-made/`. The API endpoints exist only on unmerged draft branches.

## Remove

All of the above, with consumers updated. Removed tools are a breaking change: tools 1.2.0 → 2.0.0, bundle 1 → 2, `provenance` dropped from the capability-group enum.

## Keep (and why)

- The cost ledger (including its unknown AI-cost lines, which are financial records).
- Dependency/legal provenance language in the charter, conformance standard and legal notes (licensing, not origin).
- NOTICE's statement of who contributed (a rights fact), without the link to the deleted ledger.
- Git history. Historical archives (`FOUNDING-ARCHIVE.md`, launch handoffs, `plan*.md`, dated agent-run records apart from the verbatim briefs) stay as dated records; nothing points to them as current work.
- `history/MANIFESTO-v0.1-2026-10-17.md` and `/manifesto/v0-1/` as the previous manifesto, without digest framing.

## Routes

`site/_redirects` (Cloudflare Pages format): the four retired pages and the founding-package update post → `/` (posts → `/updates/`), 301. Sitemap drops them automatically.

## Standards

Item 4 of `standard/AGENTIC-REPRODUCIBILITY.md` (publish prompts and transcripts) becomes optional decision records. Founder decision applied here, recorded in the RFC and the decision register as pending community review.

## Tests

Delete tests that enforce provenance publication; repoint adversarial tests that merely used a provenance tool (input injection, abort) to another tool; add tests that retired routes are absent from the build and sitemap, redirected, and that no page or API mentions them.
