# Overnight Plan — 2026-10-18 (UTC)

Spec: `JRCv1_Overnight_Claude_Handoff.md` (committed alongside this plan as the prompt record). Executor: Claude Opus 5.5 in Claude Code, with Sonnet sub-agents for independent review. Authorization from the human initiator: push feature branches and open **draft** PRs. No merges to `main`, purchases, social posts, private disclosures or account-security changes.

## Verified starting state (2026-10-18 04:51Z)

| Item | State | How verified |
|---|---|---|
| `main` | `37365e1`, PRs #1–#3 merged, CI green | `git log`, `gh pr list`, `gh run list` |
| Site | Live at https://jollyrogercharter.org, built from `37365e1` | Footer commit hash on live HTML |
| HTTP → HTTPS | 301 | `curl` |
| `www.` subdomain | **No DNS record** | `dig` empty; DNS change needs the human |
| Licence | CC0-1.0 detected by GitHub | REST `license.spdx_id` |
| Branch protection | Ruleset: PR + `build-and-test`, no force-push or deletion | `rules/branches/main` |
| Org 2FA | Required | REST |
| Discussions | Enabled; only GitHub's default categories; 0 posts | GraphQL |
| Tests | 12/12 after clean `npm ci` | local |
| `npm audit` | 9 transitive advisories (5 high, 4 moderate), all build-time, fixed by Eleventy 3.1.7 (released 2026-10-15) | `npm audit --json` |
| OpenTimestamps | **Pending.** Calendar reports Bitcoin tx `26632584…`, waiting for 6 confirmations | `ots upgrade` |
| Founding transcript | Not supplied | — |

Stale public claims found: `site/debate.njk` (Discussions "not yet enabled"); `site/index.njk` (no timestamp proof issued); `transparency/AI-CONTRIBUTIONS.md` (launch steps "not executed"); `README.md` founding status lines; `OPEN-DEPENDENCIES.md` rows 1–3, 6, 10; `provenance/README.md` header.

## Work breakdown (stacked draft PRs)

**PR A, `fix/status-truth`** (base `main`)
- `launch/status.json` as the single machine-readable status source, with each claim marked `implemented` / `pending` / `blocked` / `historical` plus evidence and a verification date.
- Generate `launch/LAUNCH-STATUS.md` from it with `scripts/render-status.mjs`; a test fails if the two drift.
- New `/status/` page, and a home-page summary built from the same source.
- Fix the stale claims above. Founding docs keep their text and gain a dated "historical snapshot" banner.
- OpenTimestamps: record the tx-observed pending state honestly.
- Hardening findings: www DNS, Discussions categories, audit decision.

**PR B, `feat/jrc-cli`** (base A)
- `spec/jrc-0.1.schema.json` (JSON Schema 2020-12) and `spec/JRC-MANIFEST.md`.
- Zero-runtime-dependency CLI at `bin/jrc.mjs` + `lib/jrc/`, with `init`, `check`, `report` (JSON, Markdown, self-reported SVG badge) and `challenge`.
- Fixtures: valid, partial, malformed, misleading, privacy-leaking, path-traversal, hash-mismatch, fake-independent.
- Tests: CLI tests, plus schema/validator agreement checked against Ajv as a dev-only dependency.
- Self-assessment `jrc.json` for this repo, with its report generated in CI.
- Site: `/check/` quickstart with the live self-assessment, Raise-the-Flag rewrite of `/adopt/`, and an improved challenge page with a downloadable log template.
- Draft debate RFCs (attention valuation, data sovereignty proof, What Would Make This Fail?) in `launch/`.
- Independent code review and adversarial review by sub-agents; findings fixed or recorded.

**PR C, `feat/quartermaster-schema`** (base B, only if A and B are done)
- Expense schema with cash / forecast / reserve / donated labour / user-attention separation.
- `qm validate` for JSON or CSV; migrate `launch/costs.json` so `/costs/` consumes the validated snapshot.
- "Propose a saving" PR template.

**Docs, inside B or C:** launch briefing drafts (article, LinkedIn, Bluesky, HN description), plus `launch/OVERNIGHT-REPORT.md`.

## Acceptance tests

- `npm ci && npm test` green on Node 20, 22 and 26 from a fresh clone of each branch.
- Clean-clone CLI demo: `jrc init` → edit → `jrc check` → `jrc report` against (a) this repo and (b) a scratch repo, recording exact commands and exit codes.
- `jrc check` exits non-zero on every malformed, misleading, privacy-leaking, traversal and hash-mismatch fixture, and exits 0 on incomplete-but-honest ones.
- Site builds with zero credentials; link, a11y and secret tests pass; new routes appear in the sitemap.
- No secrets or personal data in the diff or the run log (test-enforced).

## Constraints and deviations

- Eleventy stays on 3.1.6 until 2026-10-29 as documented. The audit findings are recorded, not force-fixed.
- Discussions categories can't be created through the API, so the human does it. RFC drafts are not posted.
- `www` DNS: recommendation only.

## Progress log

Entries are added as work proceeds.
