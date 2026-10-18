# Adoption Journey Plan — 2026-10-18

Brief: a developer tells a browser agent, or uses the page directly, "Evaluate my repository against JRCv1, show where it falls short, and help me make it Truly Free". They get an honest, reproducible assessment and a reviewable path forward without reading the whole charter. Branch `feat/adopt`, stacked on `feat/webmcp` (#13). Draft PR only.

## Goals

1. `/adopt/`. Input: a public GitHub URL, a pasted or uploaded `jrc.json`, or a saved evidence snapshot.
2. Constrained, credential-free reads of public GitHub evidence, pinned to one commit.
3. Each pillar comes back as `evidenced`, `partially-evidenced`, `missing`, `not-applicable` or `unknown`, with a per-check explanation and evidence links at that commit.
4. A roadmap ordered by dependencies, then impact, then effort.
5. Downloads: report JSON and Markdown, a candidate `jrc.json`, an adoption checklist, a patch of suggested files, a PR description, a challenge log and the evidence snapshot.
6. Six new WebMCP tools backed by the same modules as the page and the CLI (`jrc assess`).

## Non-goals

- No backend, OAuth, private repositories, PR or issue creation, AT Protocol publishing, or writes to any third-party repository.
- Never running repository code. Challenge steps that need execution are reported as `not-attempted`, with the reason.
- No claim that a scan verifies anything. Finding a file says it exists at that commit, not that it is correct.

## Architecture

The design splits **collect** (network, non-deterministic) from **evaluate** (pure, deterministic).

- `lib/assess/snapshot.mjs` (pure): the snapshot format, canonical JSON, path safety, file selection (`filesToRead`) and limits.
- `lib/assess/github.mjs` (platform-neutral, injected `fetch` and `sha256`): about 3 API GETs (repo, branch→commit, recursive tree at that commit) plus ≤ 20 raw GETs at that commit.
  - Hosts allowlisted: `api.github.com` and `raw.githubusercontent.com`.
  - Requests use `credentials: "omit"`, a final-URL host check, per-response byte caps and timeouts.
  - Rate limits and truncated trees are recorded as `unavailable`, never as absent.
- `lib/assess/local.mjs` (Node only): builds the same snapshot from a checkout. It doesn't follow symlinks, skips `.git` and `node_modules`, and uses the same `filesToRead`.
- `lib/assess/evaluate.mjs` (pure): `evaluateSnapshot(snapshot)` covers the pillar checks, the merge with the repository's own `jrc.json` (via the existing `assessManifest` and a snapshot probe), contradictions and the roadmap.
- `lib/assess/artifacts.mjs` (pure): the report JSON and Markdown, candidate manifest, checklist, git-apply-able new-file patch, PR description, challenge log and GitHub prefill links.
- `lib/capabilities/tools.mjs`: six tools.
  - `assess_repository`, `prepare_adoption_roadmap`, `generate_jrc_manifest`, `prepare_contribution`, `run_challenge_checks`, `generate_assessment_report`.
  - Input is `{ repository, ref? }` or `{ snapshot }`. Each page session caches snapshots by repository and ref.
- The page (`site/assets/adopt.js`) uses the same `collect → evaluate → artifacts` calls. Rendering lives in `adopt-view.mjs` (pure, escaped strings) so it can be tested in Node.
- CLI: `jrc assess <dir|github-url> [--snapshot FILE] [--save-snapshot FILE] [--out DIR] [--format md|json]`.

### Check outcomes and pillar status

Each check is `found`, `not-found` (we looked and it isn't there), `contradicted` (evidence of the opposite, e.g. a source-available licence or manifest evidence missing from the tree), `not-checked` (we couldn't look) or `not-applicable`.

Pillar status:

- `not-applicable`: only when the repository's own manifest declares it, with a reason.
- `unknown`: nothing found and some core check was not-checked. Data with no manifest is always `unknown`, because a file list can't show whether a project holds user data.
- `evidenced`: every core check found and nothing contradicted.
- `partially-evidenced`: some evidence found, or anything contradicted.
- `missing`: everything was looked at and nothing found. The explanation always says absence in the repository isn't proof of noncompliance.

Demonstrated problems are listed separately as `concerns`.

## Rights and data boundaries

- Requests go from the user's browser straight to GitHub; nothing touches our origin. No tokens or cookies, nothing is stored.
- Repository text is untrusted: it is never echoed into tool output, only paths and derived booleans.
- Paths containing control, bidirectional or zero-width characters are dropped and counted.
- Snapshots contain repository file text, so the demo commits a snapshot only of this CC0 repository.

## Threat model and tests

| Threat | Mitigation |
|---|---|
| Prompt injection in README, file names or manifest | Text is never echoed; `untrustedContentHint` is set; injected text can't change any outcome |
| Hidden characters, look-alike names | Path filter; manifest goes through `assessManifest` (E-CONTROL, E-CONFUSABLE, E-PRIVACY, E-MISLEADING) |
| SSRF or open fetch | Fixed URL templates, owner and repo regex, host allowlist, redirect host check |
| Resource exhaustion | Byte caps, request-count cap, timeouts, tree size cap, output caps |
| Path traversal | `lexicalPathProblem` plus snapshot-only lookup; the local collector never follows symlinks |
| Overclaiming | Wording scan of generated artifacts; the candidate manifest is never `evidenced` and its assessor is `REPLACE:` |

Fixture repositories:

- `complete`, `partial`, `contradictory`, `missing` and `minimal-na` are static.
- `hostile` is built at runtime, because the secret scanner covers tracked files.

Tests:

- A fake GitHub server is served from the fixture directories. The GitHub snapshot must equal the local snapshot.
- The CLI's output on a saved snapshot must be byte-identical to the tool and page outputs.
- Each patch must pass `git apply --check` on a copy of its fixture.
- Each candidate manifest must pass `jrc check` with 0 errors.
- The view module must escape hostile content.

## Costs and provenance

$0. Static files on the existing Cloudflare Pages free plan. Anonymous GitHub API limit is 60 requests per hour per IP, about 3 per assessment.

## Deployment and rollback

The work deploys with the stack (#4 → #5 → #6 → #13 → this). Rollback is a revert commit. Nothing on this branch needs a migration.

## Reproducibility test

1. `jrc assess --snapshot docs/demo/charter-main.snapshot.json --format json` must equal the committed report.
2. A live re-run of the commit pinned in that snapshot must reproduce the same snapshot digest.

## Minimum backend, documented and not built

- Higher rate limits or private repositories need a GitHub App or OAuth with token exchange, which needs a server-side secret.
- One-click PRs need the same, plus the user's consent per action.
- AT Protocol publishing needs the user's PDS session.

## Unresolved, for the human

- Whether `/adopt/` replaces the Raise the Flag landing page. Proposal: the tool goes on top and the existing text moves below it, unchanged.
- Native WebMCP and real-browser checks of the page are still pending. Driving a browser from here breaks the no-browser rule, so this needs the human.
