# Changelog

Factual record of changes. Dates are UTC. Nothing here has been deployed unless the entry says so.

## Unreleased — status truthfulness (PR A)

- `launch/status.json` is now the single source for status claims. `launch/LAUNCH-STATUS.md` is generated from it (`npm run status`), and the new `/status/` page and the home page read it. A test fails if any of them drift.
- Fixed stale public claims: Discussions are enabled; the timestamp proof is pending, not unissued; the AI contributions log now matches what was actually done. Founding status lines are kept and marked *historical* rather than rewritten.
- `OPEN-DEPENDENCIES.md` rows 1–3, 6 and 10 updated to the verified state.

## 2026-10-18 — CC0 dedication

- Added `LICENSE` (official CC0 1.0 Universal legal code) and `NOTICE.md` (scope and exclusions), by the human initiator's decision. Footer, `package.json`, `OPEN-DEPENDENCIES.md`, `DECISIONS-AND-QUESTIONS.md` and `legal/LICENSE-AND-RISK.md` updated. No legal review yet.

## 2026-10-18 — OpenTimestamps proof and domain cost

- Added `provenance/launch-digests.sha256` (frozen SHA-256 list of the received ZIP and the 36 founding files) and its OpenTimestamps proof `provenance/launch-digests.sha256.ots`, submitted 2026-10-18T04:36Z to four public calendars. State: **pending**, no Bitcoin attestation yet.
- Recorded the domain cost: $8.50 first year, renews $11.20/yr with auto-renew on.
- Branch protection: ruleset `protect-main` requires a PR and a passing `build-and-test` check.

## 2026-10-18 — First public deployment

- Repository published at https://github.com/jollyrogercharter/charter; launch PR #1 merged (`bef3c90`).
- Site deployed by Cloudflare Pages (free plan) from `main` to https://jollyrogercharter.org and https://jollyrogercharter.pages.dev. Served provenance manifest verified byte-identical to the repository.
- `jollyrogercharter.org` registered through Cloudflare Registrar (expires 2027-10-18).

## 2026-10-18 — Launch branch (merged in PR #1)

### 2026-10-18 — Launch session (Claude Opus 5.5, directed by the human initiator)

- Preserved the founding launch package verbatim on `main` (`e59cf86`). All 36 files were byte-compared to the received ZIP.
- Added `provenance/launch-manifest.json`, with SHA-256 digests of every founding file and of the ZIP, and `scripts/hash-manifest.mjs` to regenerate it. Timestamp state: `not-requested`.
- Added an Eleventy 3.1.6 static site in `site/` covering every route in `website/SITE-SPEC.md`, plus an Atom feed, sitemap, robots.txt and 404 page. It renders the canonical Markdown directly.
- Added `launch/costs.json` as a manual cost ledger. Unknown amounts are `null`, never guessed.
- Added an 11-check test suite (`npm test`) covering routes, links, verbatim founding lines, quote sources, AI attribution, accessibility smoke checks, provenance and cost consistency, digest verification, and a secret/PII scan.
- Added a CI workflow with SHA-pinned actions. It doesn't run until the repository is pushed.
- Added `DEPLOYMENT.md`, `OPEN-DEPENDENCIES.md`, `launch/FOUNDER-ABSENCE-TEST.md`, `launch/RFC-SEEDS.md`, `launch/CONTENT-DRAFTS.md`, `transparency/agent-runs/2026-10-17-launch.md` and `plan.md`.
- Updated `launch/LAUNCH-STATUS.md`, `launch/OPERATIONS-LEDGER.md` and `transparency/AI-CONTRIBUTIONS.md` with the verified state.
