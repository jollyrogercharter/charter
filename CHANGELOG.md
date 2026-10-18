# Changelog

Factual record of changes. Dates are UTC. Nothing here has been deployed unless the entry says so.

## Unreleased — Adoption journey (PR E)

- `/adopt/` assesses a public GitHub repository, a `jrc.json` or a saved snapshot in the browser. It reports each pillar as evidenced, partially-evidenced, missing, not-applicable or unknown, explains every check, and links evidence at the pinned commit. It shows progress and offers the report (JSON and Markdown), a candidate `jrc.json`, a checklist, a new-files patch, a PR description, a challenge log and the snapshot to download. *Raise the Flag* moves below it, unchanged.
- `lib/assess/`: a collector for constrained, credential-free GitHub reads (3 API requests plus key files, pinned to one commit, host allowlist, byte caps), a local collector, a pure deterministic evaluator (23 checks, contradictions kept apart from absences), artifact generators, and one shared session for the page, the tools and the CLI.
- Six read-only WebMCP tools: `assess_repository`, `prepare_adoption_roadmap`, `generate_jrc_manifest`, `prepare_contribution`, `run_challenge_checks`, `generate_assessment_report`. They prepare contributions and never submit them.
- `jrc assess [dir|github-url] [--ref] [--snapshot] [--save-snapshot] [--out] [--format]`.
- `docs/ADOPT.md`; `docs/demo/` holds two live assessments of this repository that regenerate byte-for-byte (`npm run demo`).
- 36 new tests (101 total): five fixture repositories (complete, partial, contradictory, missing, not-applicable); a runtime-built hostile repository (prompt injection, bidi and zero-width names, symlink escape, private data, HTML in file names, hostile JSON keys); invalid manifests and snapshots; constrained-fetch tests against a fake GitHub; CLI, tool and page byte-equality; patch `git apply --check`; candidate `jrc check`. The adversarial tests were mutation-checked. 12 more regression tests come from an independent review of the first commit; each failed before its fix.
- `assessManifest` takes an optional `now`, so evaluating a snapshot doesn't depend on the day it's run.

## Unreleased — WebMCP tools (PR D)

- Seven read-only WebMCP tools registered through `document.modelContext.registerTool()`: `get_charter`, `get_project_status`, `assess_jrc_manifest`, `generate_adoption_plan`, `get_project_costs`, `get_open_challenges` and `get_provenance`. They use strict JSON Schemas and honest annotations, and every fact carries a `basis` label.
- `lib/jrc/core.mjs`: the assessment engine split from its filesystem probe, so the browser runs the same engine as the CLI. Browser file evidence is `not-checked`, never `verified`.
- `lib/capabilities/`: a shared capability layer, a data bundle (`/webmcp/data.json`) and a static read-only API (`/api/v1/*.json`, including the tool catalog), all built from repository files.
- `site/assets/webmcp.js`: no framework. Feature detection, independent per-tool registration with AbortControllers, cancellation, legacy string input, and an inert fallback.
- `/agents/` page and `docs/WEBMCP.md` developer guide.
- 22 new tests (65 total): real-code catalog, schema, execution and consistency tests; `[simulated]` registration, failure, cancellation and fallback tests; and 10 regression tests from an independent review (including a ReDoS in the shared email pattern, which affected the CLI). Real Chrome 155 run of the tools; native registration not yet verified.
- `www.jollyrogercharter.org` added as a custom domain.

## Unreleased — Quartermaster ledger foundation (PR C)

- `spec/quartermaster/qm-0.1.schema.json` and `QM-LEDGER.md`. Five cost categories that are never summed together: cash, forecast, reserve, donated labour and user attention. Unknown amounts are `null`, never 0. Every entry references a dated source. Noncash time can only carry a price with a published valuation method.
- `qm validate | summary | csv2json` (`bin/qm.mjs`, `lib/qm/`). Local files only. Invoice and account numbers are rejected, and the same privacy scanner as `jrc` applies.
- `launch/costs.json` migrated to qm 0.1. The `/costs/` page is built from the validated ledger and the build fails if it's invalid. The ledger is also published at `/costs/ledger.json`.
- `.github/PULL_REQUEST_TEMPLATE/propose-a-saving.md`.
- 7 qm tests, including billing-identifier leaks and estimate-as-cash. Total suite: 43 tests.

## Unreleased — jrc conformance tool (PR B)

- `jrc` 0.1 draft (`bin/jrc.mjs`, `lib/jrc/`): `init`, `check`, `report` (JSON, Markdown, self-reported SVG badge) and `challenge`. Offline, no runtime dependencies, Node 20+.
- `spec/jrc-0.1.schema.json` (JSON Schema 2020-12) and `spec/JRC-MANIFEST.md`. A test checks that the schema and the built-in validator agree.
- 13 CLI tests with fixtures covering valid, partial, malformed, misleading, privacy-leaking, path-escaping (including via symlinks), hash-mismatched and fake-independent manifests, plus a test that manifest commands are never executed.
- This repository's own self-assessment, `jrc.json`, is published with its report and badge at `/check/`.
- New pages: `/check/` (5-minute quickstart) and `/spec/`. `/adopt/` is rewritten as *Raise the Flag*, covering what a report means and what it doesn't. `/challenge/` gains a downloadable log template and a no-founder reporting path.
- CI also runs `jrc check` on this repository, plus a Node 20/24 compatibility job.

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
