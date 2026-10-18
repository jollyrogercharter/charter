# Launch Status

**Current state:** the repository is public at https://github.com/jollyrogercharter/charter. `main` holds only the preserved founding package; the site and launch work are on `feat/launch-site`, not merged yet. `jollyrogercharter.org` is registered (Cloudflare Registrar). Nothing has been deployed to a web host, timestamped or posted. This is a draft, not a production launch.

Code on GitHub: **yes** (`main` = `e59cf86`, `feat/launch-site` = pushed with this commit). Website deployed: **no**.

| Task | Status | Actual URL | Who has access | Cost | Evidence | Next action |
|---|---|---|---|---:|---|---|
| Founding documents preserved | **Complete (local)** | — | Local repo | $0 | `e59cf86` on `main`; 36 files byte-identical to ZIP | Push with the repo |
| Provenance digests | **Complete (local)** | — | Local repo | $0 | `provenance/launch-manifest.json`; test re-verifies against Git | Publish with the repo |
| Eleventy site build and tests | **Complete (local)** | — | Local repo | $0 | `npm test` 11/11 on Node 20 and 22, from a fresh clone | Deploy once a host is approved |
| CI workflow | **Pushed, not yet run** | — | — | $0 | Triggers on PRs and pushes to `main`; the branch push alone doesn't trigger it | Runs when the PR opens |
| GitHub organization | **Complete** | https://github.com/jollyrogercharter | One admin (human initiator) | $0 (free plan) | Created by the human in the GitHub UI; `GET /orgs/jollyrogercharter` → `plan: free`. 2FA requirement **not enabled** | Enable required 2FA; invite a second owner |
| Repository push | **Complete** | https://github.com/jollyrogercharter/charter | Org admins | $0 | Created with `gh repo create` on 2026-10-18 at the human's request (Claude in Chrome was not connected); local and remote SHAs matched after push | Open PR `feat/launch-site` → `main`; add branch protection |
| Domain registration | **Complete** | `jollyrogercharter.org` (no site yet) | Human initiator's Cloudflare account | not yet recorded | PIR RDAP: registrar Cloudflare, Inc., registered 2026-10-18T03:54Z, expires 2027-10-18 | Record price + auto-renew; connect Pages |
| Hosting / HTTPS | **Blocked: human** | — | — | $0 intended | `DEPLOYMENT.md` | Human connects Cloudflare Pages (or picks another host) |
| Founding transcript | **Blocked: source** | — | — | $0 | Site shows "Transcript pending human review"; archive labelled as a summary | Human exports the ChatGPT conversation |
| OpenTimestamps proof (founding package) | **Not requested** | — | — | $0 | `timestamp_state: "not-requested"` | Human approves sending digests to public calendar servers |
| OpenTimestamps proof (transcript) | **Not requested** | — | — | $0 | No transcript yet | After transcript approval |
| Cost page | **Complete (local)** | — | Local repo | $0 | `launch/costs.json` → `/costs/`; unknowns shown as unknown | Human adds real AI and domain costs when known |
| Challenge and debate pages | **Complete (local)** | — | Local repo | $0 | `/challenge/`, `/debate/`, issue templates | Go live with deploy |
| GitHub Discussions + seed RFCs | **Drafted** | — | — | $0 | `launch/RFC-SEEDS.md` | Human enables Discussions and posts them |
| Content drafts / 30-day calendar | **Drafted, unreviewed** | — | — | $0 | `launch/CONTENT-DRAFTS.md` | Human reviews; posts from own accounts |
| Licence for original content | **Blocked: legal decision** | — | — | — | None applied, so all rights are reserved by default | Human decision after review (`legal/LICENSE-AND-RISK.md`) |
| Founder-absence test | **Run 1 done (not independent)** | — | — | $0 | `launch/FOUNDER-ABSENCE-TEST.md` | An unrelated person repeats it |
| Open dependencies list | **Complete (local)** | — | Local repo | $0 | `OPEN-DEPENDENCIES.md` (10 items) | Work them down |

## Needs the human

In order of what unblocks the most:

1. **Secure the org.** Settings → Authentication security → require 2FA; invite a second trusted owner; protect `main` (require a PR review and passing CI).
2. **Open and merge the launch PR** (`feat/launch-site` → `main`) after review. CI runs on the PR.
3. **Record the domain cost.** Add the price paid, renewal price and auto-renew state to `launch/costs.json` (no account IDs).
4. **Pick a host and connect it.** Cloudflare Pages on the free plan is the candidate. The steps are in `DEPLOYMENT.md`.
5. **Decide on OpenTimestamps for the founding package.** It sends only SHA-256 digests to public calendar servers. Once you approve, the agent installs the official client in an isolated environment, stamps, and records the state as `pending`.
6. **Export the founding ChatGPT conversation** (Settings → Data controls → Export). Keep the ZIP private. The agent will extract this one conversation locally and draft a redacted edition for your review.
7. **Make the licence decision.** Until one is made, the "truly free" repository is legally all-rights-reserved.
8. **Review and post** `launch/CONTENT-DRAFTS.md` and `launch/RFC-SEEDS.md` from your own accounts.

Update this file with true state at each milestone. Do not use checkbox theater.
