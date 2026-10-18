# Changelog

Factual record of changes. Dates are UTC. Nothing here has been deployed unless the entry says so.

## Unreleased — branch `feat/launch-site`

### 2026-10-18 — Launch session (Claude Opus 5.5, directed by the human initiator)

- Preserved the founding launch package verbatim on `main` (`e59cf86`). All 36 files were byte-compared to the received ZIP.
- Added `provenance/launch-manifest.json`, with SHA-256 digests of every founding file and of the ZIP, and `scripts/hash-manifest.mjs` to regenerate it. Timestamp state: `not-requested`.
- Added an Eleventy 3.1.6 static site in `site/` covering every route in `website/SITE-SPEC.md`, plus an Atom feed, sitemap, robots.txt and 404 page. It renders the canonical Markdown directly.
- Added `launch/costs.json` as a manual cost ledger. Unknown amounts are `null`, never guessed.
- Added an 11-check test suite (`npm test`) covering routes, links, verbatim founding lines, quote sources, AI attribution, accessibility smoke checks, provenance and cost consistency, digest verification, and a secret/PII scan.
- Added a CI workflow with SHA-pinned actions. It doesn't run until the repository is pushed.
- Added `DEPLOYMENT.md`, `OPEN-DEPENDENCIES.md`, `launch/FOUNDER-ABSENCE-TEST.md`, `launch/RFC-SEEDS.md`, `launch/CONTENT-DRAFTS.md`, `transparency/agent-runs/2026-10-17-launch.md` and `plan.md`.
- Updated `launch/LAUNCH-STATUS.md`, `launch/OPERATIONS-LEDGER.md` and `transparency/AI-CONTRIBUTIONS.md` with the verified state.
