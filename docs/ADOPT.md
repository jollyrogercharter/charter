# Adopting JRCv1: repository assessment

`/adopt/` on the website, the six repository tools for AI agents (WebMCP) and `jrc assess` on the command line all answer one question for a developer who hasn't read the charter: *where does my repository stand against JRCv1, and what should I do next?* They share one pipeline, so a person, an agent and a script get the same answer from the same evidence.

The output is an automated scan of public files at one commit. It is not a review, a verification or a certification. Finding a file shows that it exists, not that it is correct or followed. Not finding one shows only that it isn't in that repository.

## Pipeline

```text
collect   lib/assess/github.mjs   public GitHub repo → snapshot   (network, injected fetch; browser and CLI)
          lib/assess/local.mjs    local checkout     → snapshot   (Node only; never follows symlinks)
evaluate  lib/assess/evaluate.mjs snapshot → report                (pure and deterministic)
prepare   lib/assess/artifacts.mjs report + snapshot → files       (pure; nothing is published)
          lib/assess/session.mjs  cache + the three steps above; used by /adopt/, the tools and the CLI
```

The browser loads byte-identical copies of these modules from `/js/lib/assess/` (a test checks this). `/adopt/` and the WebMCP tools share a single page session (`site/assets/webmcp.js`), so an agent and the person at the keyboard reuse the same snapshot.

### What is fetched

All requests are `GET`, sent with `credentials: "omit"` and `referrerPolicy: "no-referrer"`. They go only to `api.github.com` and `raw.githubusercontent.com`. A response that redirects to any other host is discarded.

| # | Request | Why | Cap |
|---|---|---|---|
| 1 | `api.github.com/repos/{owner}/{repo}` | Default branch, GitHub's licence detection, archived, issues and discussions on | 256 KiB |
| 2 | `api.github.com/repos/{owner}/{repo}/commits/{ref}` (`Accept: application/vnd.github.sha`) | Pin one commit | 1 KiB |
| 3 | `api.github.com/repos/{owner}/{repo}/git/trees/{commit}?recursive=1` | Every path and size at that commit | 8 MiB, 50,000 entries |
| 4… | `raw.githubusercontent.com/{owner}/{repo}/{commit}/{path}` | Up to 24 key files: README, licences, package manifests, `jrc.json`, CONTRIBUTING, GOVERNANCE, CODEOWNERS, deployment docs, cost files, and files `jrc.json` pins by SHA-256 | 256 KiB each; 64 KiB kept as text |

Only three requests count against GitHub's anonymous API limit, which is 60 per hour per IP address. Raw file reads are separate. Each response is read through a byte-capped stream, and each request times out after 15 seconds. When something can't be read (rate limit, truncated tree, oversized file, network error), it is recorded in `snapshot.unavailable` and evaluates as **unknown**, never as missing.

### Snapshot

`jrc-snapshot.json` holds:

- the source: repository, ref, commit and retrieval time;
- the repository settings above;
- the file list as `[path, type, size]`;
- the files that were read, each with its byte count, SHA-256 and a bounded text prefix;
- a count of paths dropped because they contained control, zero-width or bidirectional characters;
- what was unavailable.

The report's `snapshot.sha256` is the SHA-256 of the snapshot's canonical JSON (sorted keys), so reformatting the file doesn't change it. Snapshots supplied by users or agents are fully validated (`validateSnapshot`) before evaluation.

## Statuses and outcomes

Each **check** has one of five outcomes:

| Outcome | Meaning |
|---|---|
| `found` | A matching public file exists at this commit (or a fixed field says so) |
| `not-found` | The whole file list was read and nothing matched |
| `contradicted` | The repository shows the opposite, e.g. a source-available licence or a single code owner |
| `not-checked` | The evidence wasn't available to the scan |
| `not-applicable` | Doesn't apply, e.g. no package manifest means there's nothing to lock |

Each **pillar** is then:

| Status | Rule |
|---|---|
| `not-applicable` | Only when the repository's own `jrc.json` declares it with a reason (basis: self-reported) |
| `unknown` | Nothing found, and some core check couldn't be checked. Also the data pillar whenever there's no `jrc.json`, because a file list can't show whether a project holds user data |
| `evidenced` | Every core check found, nothing contradicted |
| `partially-evidenced` | Some evidence found, or anything contradicted |
| `missing` | Everything looked at, nothing found. The explanation says this isn't proof of noncompliance |

**Concerns** are listed separately from absences. They cover contradicted checks; `jrc.json` problems (the full `jrc check` engine runs over the snapshot, so a cited file that isn't in the tree is `E-MISSING` and a wrong pin is `E-HASH`); a pillar the manifest calls `evidenced` that the scan doesn't support (`C-OVERCLAIM`); and archived repositories.

### Checks

| Pillar | Check | Core | Looks for |
|---|---|---|---|
| Code and rights | `licence-declared` | yes | LICENSE/COPYING at the root, a package `license` field, or GitHub's detection |
| | `licence-permits-reuse` | yes | A recognised free licence. BSL, SSPL, Elastic, PolyForm, Commons Clause, FSL, non-commercial terms or all-rights-reserved are `contradicted` |
| | `dependency-lock` | yes | A lockfile for each package manifest (`not-applicable` with no manifest) |
| | `dependency-inventory` | | SBOM, NOTICE, third-party licence list |
| Development | `readme` | yes | README at the root |
| | `build-instructions` | yes | A build/install/getting-started heading in the README or a deployment doc, or BUILD/INSTALL/development docs |
| | `tests` | yes | Test directories or test file names |
| | `ci` | yes | GitHub Actions, GitLab CI, CircleCI, Travis, Jenkins, Buildkite, Woodpecker, Forgejo, Drone, sourcehut, Bitbucket |
| | `decision-records` | | ADRs, decisions/, RFCs, ARCHITECTURE |
| | `agent-records` | | AGENTS.md, CLAUDE.md, Cursor/Copilot/Gemini/Aider instructions |
| Data | `data-policy` | yes | Privacy or data-handling documents |
| | `data-export` | yes | Export, migration or portability docs; AT Protocol lexicons |
| Operations | `deploy-docs` | yes | DEPLOYMENT, operations, runbook, self-hosting docs, or a README deployment heading |
| | `deploy-automation` | | Dockerfile, compose, Terraform, Helm, Fly, Netlify, Wrangler and similar |
| | `security-policy` | yes | SECURITY.md at the root, `.github/` or `docs/` |
| | `backup-restore` | | Backup, restore or rollback docs, or a deployment doc that mentions them |
| | `release-process` | | CHANGELOG, RELEASING, changesets, release tooling config |
| Economics | `cost-records` | yes | Cost, budget, ledger or expense files. A file declaring the Quartermaster format is validated with `qm` |
| | `funding-disclosure` | | FUNDING.yml, sponsors and backers files |
| Governance | `contributing` | yes | CONTRIBUTING anywhere outside vendored code |
| | `governance-doc` | yes | GOVERNANCE, MAINTAINERS or stewardship docs anywhere outside vendored code |
| | `multiple-stewards` | | CODEOWNERS with two or more owners. One owner is `contradicted` |
| | `open-proposals` | | Issues or discussions on, or issue/PR templates |

Paths under `node_modules/`, `vendor/`, `third_party/`, `fixtures/` and `testdata/` are ignored: copies of other projects aren't this project's evidence. Checks look at file names and a few fixed fields, plus README, licence and CODEOWNERS text matched against fixed patterns. Repository file *contents* are never copied into a result. File *paths* are, because they are the evidence. Paths are untrusted, and before they are cited:

- names containing hidden characters (control, format, bidirectional, zero-width, tag, variation-selector or filler) are dropped;
- sentence-like path segments (more than 64 characters, or more than three spaces) are never cited;
- in Markdown, brackets and parentheses are escaped so a name can't retarget a link.

Symlinks and submodules are never followed. A check whose only match is one comes back `not-checked`.

## Roadmap

Each step that isn't satisfied becomes a roadmap step with `effort` (small, medium or large), `impact` (high, medium or low) and `after` (dependencies). The order is a topological sort: contradictions first; then creating or fixing `jrc.json`; then everything else by impact, then effort; then publishing the report and asking someone unaffiliated to take the challenge. Steps for not-applicable pillars are dropped. Choosing a licence is never automated: the step links to a comparison and leaves the decision to the owner.

## What you can download

| File | What it is |
|---|---|
| `JRC-ASSESSMENT.md`, `jrc-assessment.json` | The report, with every check's outcome, reasoning and evidence links pinned to the commit |
| `jrc.candidate.json` | A starting manifest. Claims are tied only to files that exist (pinned by SHA-256 where read). No pillar is `evidenced`, and the assessor is a `REPLACE:` placeholder. It passes `jrc check` with zero errors in the real repository (tested on every fixture) |
| `ADOPTION-CHECKLIST.md` | The roadmap as a task list |
| `jrc-suggested-files.patch` | Starter files as a `git apply` patch: `jrc.json`, `SECURITY.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`, `DEPLOYMENT.md`, `COSTS.md`, `DATA.md`, `RELEASING.md`, `AGENTS.md`. **New files only**, never one whose name exists in any case, and none at all if the file list was incomplete. Every file has `REPLACE:` markers |
| `PR-DESCRIPTION.md` | A pull-request description saying the files are unreviewed |
| `CHALLENGE-LOG.md` | A Jolly Roger Challenge log with the automated results filled in |
| `jrc-snapshot.json` | The evidence, so anyone can reproduce the report |

The page also offers GitHub links: create a file with its content prefilled, open the checklist as an issue, or submit the challenge log to the charter repository. GitHub then asks the developer to sign in and confirm. **Nothing is created, opened or published by the page, the tools or the CLI.**

## Jolly Roger Challenge: what runs automatically

Only **discover** (find the licence, its terms and build instructions) is checked automatically, as `passed`, `failed` or `blocked`.

**costs**, **restore** and **founder-absence** get pre-checks but stay `not-attempted`, because a file's existence doesn't complete them.

**clean-build**, **agent-workflow**, **alternate-deploy** and **improve** need the code built or run on an isolated machine. Nothing here ever executes repository code, so they are `not-attempted`, with that reason.

**data-export** is `not-applicable` only when `jrc.json` says so.

The log names its author as an automated tool, "not an independent reviewer".

## Trust boundaries

| Threat | Handling | Test |
|---|---|---|
| Prompt injection in README, file names or `jrc.json` | File contents are never echoed; sentence-like path segments aren't cited; outcomes depend only on fixed patterns; tools set `untrustedContentHint` | Injected text changes no outcome and appears in no output |
| Truncated or unread files | A file that's in the tree but wasn't read in full makes the checks that depend on it `not-checked`, never `not-found` | Unread README, CODEOWNERS, package.json and deployment docs |
| Hidden or bidirectional characters, look-alikes | Such paths are dropped and counted; the manifest goes through E-CONTROL, E-CONFUSABLE | `skipped_paths` and output scans |
| Private data (emails, tokens) in manifests or file names | E-PRIVACY concern without echoing; such paths are left out of the candidate | The address appears in no output |
| Hostile JSON keys | JSON paths with unusual keys are rewritten as `.<unusual key>` | Concern paths are checked |
| SSRF, open fetch | Fixed URL templates, owner/repo/ref validation, host allowlist, redirect host check | Allowlist, credentials and redirect tests |
| Resource exhaustion | Byte-capped streams, request budget, timeouts, entry caps, tool output caps, snapshot size cap | A 64 MiB tree stream is cut off after 8 MiB |
| Path escape, symlinks | Snapshot-only lookups; the local collector never follows symlinks or reads outside the tree | A symlink to an outside secret is never read |
| HTML injection on the page | All rendering escapes; links only to `github.com` / this site | `<script>`, `<img onerror>`, `javascript:` tests |
| Overclaiming | Candidate never `evidenced`; scan `evidenced` needs every core check; wording comes from fixed text | Mutation-checked |

Every adversarial test above was checked by mutation: disabling the defence makes the test fail.

## Reproduce the demo

`docs/demo/` holds two real assessments of this repository, taken from the live GitHub API on 2026-10-18:

- `main` at commit `37365e1`, which has no `jrc.json`;
- `feat/webmcp` at `08d9d29`, which has one.

Snapshots are committed only for this CC0 repository, because they contain file text.

Anyone can check them without help:

```bash
git clone https://github.com/jollyrogercharter/charter.git && cd charter
npm ci && npm test                         # includes: docs/demo regenerates byte-for-byte

# 1. Offline: the committed snapshot reproduces the committed report exactly
node bin/jrc.mjs assess --snapshot docs/demo/main/jrc-snapshot.json --format json | diff - docs/demo/main/jrc-assessment.json

# 2. Live: the same commit gives the same evidence today
C=$(jq -r .source.commit docs/demo/main/jrc-snapshot.json)
node bin/jrc.mjs assess https://github.com/jollyrogercharter/charter --ref "$C" --save-snapshot /tmp/live.json --format json > /tmp/live-report.json
for k in tree files skipped_paths unavailable; do diff <(jq -cS ".$k" /tmp/live.json) <(jq -cS ".$k" docs/demo/main/jrc-snapshot.json) && echo "$k identical"; done
diff <(jq -S 'del(.snapshot.sha256,.snapshot.retrieved_at,.snapshot.ref)' /tmp/live-report.json) \
     <(jq -S 'del(.snapshot.sha256,.snapshot.retrieved_at,.snapshot.ref)' docs/demo/main/jrc-assessment.json)

# 3. Any repository
node bin/jrc.mjs assess https://github.com/OWNER/REPO --out /tmp/adopt
```

In step 2, `repo_meta` is current repository settings, not part of the commit: it can legitimately change if, for example, discussions are turned on. The snapshot digest also covers the retrieval time, so it differs between runs while the evidence stays identical. Step 2 was run on 2026-10-18 and matched.

In a browser: open `/adopt/`, enter `https://github.com/jollyrogercharter/charter`, choose **Assess**, then download `jrc-snapshot.json` and re-run step 1 on it.

## Minimum backend, if these are ever wanted (none is built)

| Capability | Minimum backend | Why it isn't static |
|---|---|---|
| Higher rate limits, private repositories | A GitHub App with a token-exchange endpoint (for example one Cloudflare Worker) | Needs a server-held secret, and makes an operator a dependency |
| One-click PRs and issues | The same app with user-to-server tokens (`contents:write`, `pull_requests:write`), plus confirmation for each action | Writing to someone's repository needs their authenticated consent |
| Publishing to AT Protocol | OAuth to the user's own PDS | Needs the user's session |

Each of these would add a secret, an operator and possibly a cost, so each needs an RFC and the owner's decision first.

## Known limits

- **Repositories:** GitHub only, and checks look at conventional file names, so a project that documents things elsewhere (a wiki, a website) will show **missing** until `jrc.json` links that evidence. Monorepos are scanned as one project. README heading patterns are English.
- **Licences:** detection covers common licence texts and SPDX ids. Anything else is `not-checked` and needs a person.
- **Rate limit:** GitHub's anonymous limit of 60 API requests per hour per IP is shared with anything else on that network.
- **Browser verification:** `/adopt/` is tested through its view and pipeline modules in Node. It hasn't yet been driven in a real browser for this change, and native WebMCP registration is still unverified (see [WEBMCP.md](WEBMCP.md#verify-natively)).
