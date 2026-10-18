# Founder's Absence Test

Can someone with no private knowledge carry this project forward? Each step below is meant to be run by an outsider using only this repository. Results are recorded honestly, including steps that can't be attempted yet.

## Run 1 — 2026-10-18, Claude (launch session)

Not a truly independent run: the same agent that built the site ran it. It checks the mechanics. An independent run by an unrelated person is still needed and is the real test.

| Step | Result | Evidence |
|---|---|---|
| 1. Build from a fresh clone using only public docs | **Pass** | `git clone` of `feat/launch-site` at `b3d9a58` into an empty directory; `npm ci && npm test` → 11/11 pass on Node 20.20.1 and on Node 22.22.3. No credentials or network after `npm ci`. |
| 1b. Build with no Git metadata (tarball download) | **Pass** | `.git` removed: build succeeds, 10 pass, 1 skipped (digest check needs Git history and says so). |
| 2. Deploy to an alternative static host | **Not attempted** | No host deploys are authorized yet. `DEPLOYMENT.md` documents three host-independent paths; the output is plain files in `_site/`. |
| 3. Locate conformance criteria, costs, discussion procedures, sources | **Pass** | `/charter/#conformance`, `/costs/` (from `launch/costs.json`), `/debate/` + `.github/ISSUE_TEMPLATE/`, `/history/` + `SOURCES.md`. All linked from site navigation. |
| 4. Identify what is still founder-owned | **Pass (10 found)** | `OPEN-DEPENDENCIES.md`. The biggest is the missing licence: without one, all rights are reserved by default. |
| 5. Export/migrate AT Protocol records | **Not applicable yet** | No reference app holds user data. Not claimed as supported. |
| 6. Publish an `OPEN-DEPENDENCIES.md` | **Pass** | Present at repo root. |

## How to run it yourself

1. Clone the repository without asking anyone for help.
2. Follow `DEPLOYMENT.md` to build and deploy to a host you control.
3. Try to answer from the repository alone: what does it cost, who decides changes, where did the ideas come from, what is the AI's role?
4. Open a [reproduction-challenge issue](../.github/ISSUE_TEMPLATE/reproduction-challenge.md) with what worked, what failed and what you had to guess.
