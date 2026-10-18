# Launch Status

**Current state (2026-10-18 04:22 UTC):** the site is live at https://jollyrogercharter.org, served by Cloudflare Pages from `main` (built from merge commit `bef3c90`). The repository is public at https://github.com/jollyrogercharter/charter. No timestamp proof has been requested, no founding transcript published, and nothing posted to social channels. This is a public draft, not a finished standard.

Code deployed: **yes**, `main` @ `bef3c90`, auto-deploys on every push to `main`. Content applied: n/a (static site, no data store).

| Task | Status | Actual URL | Who has access | Cost | Evidence | Next action |
|---|---|---|---|---:|---|---|
| Founding documents preserved | **Complete (local)** | — | Local repo | $0 | `e59cf86` on `main`; 36 files byte-identical to ZIP | Push with the repo |
| Provenance digests | **Live** | https://jollyrogercharter.org/provenance/ | Public | $0 | Manifest served byte-identical to repo | Decide on OpenTimestamps |
| Eleventy site build and tests | **Complete** | — | Public repo | $0 | `npm test` 11/11 locally (Node 20, 22) and in CI | — |
| CI workflow | **Running** | https://github.com/jollyrogercharter/charter/actions | Public | $0 | `build-and-test` passed on PR #1 | Make it a required check |
| GitHub organization | **Complete** | https://github.com/jollyrogercharter | One admin (human initiator) | $0 (free plan) | Created by the human in the GitHub UI; `GET /orgs/jollyrogercharter` → `plan: free`. 2FA requirement **not enabled** | Enable required 2FA; invite a second owner |
| Repository push and launch PR | **Complete** | https://github.com/jollyrogercharter/charter/pull/1 | Org admins | $0 | PR #1 merged by the human 2026-10-18T04:01Z; CI passed | Protect `main` |
| Domain registration | **Complete** | https://jollyrogercharter.org | Human initiator's Cloudflare account | not yet recorded | PIR RDAP: registrar Cloudflare, Inc., registered 2026-10-18T03:54Z, expires 2027-10-18 | Record price + auto-renew; connect Pages |
| Hosting / HTTPS | **Complete** | https://jollyrogercharter.org · https://jollyrogercharter.pages.dev | Human initiator's Cloudflare account | $0 (free plan) | All 18 routes 200, unknown path 404, no cookies set; `/provenance/launch-manifest.json` served bytes match `main` (SHA-256 prefix `14d76a6f`) on both hostnames. Cloudflare GitHub app installed on the org, limited to `charter` | Add a second account member; set up a mirror host |
| Founding transcript | **Blocked: source** | — | — | $0 | Site shows "Transcript pending human review"; archive labelled as a summary | Human exports the ChatGPT conversation |
| OpenTimestamps proof (founding package) | **Not requested** | — | — | $0 | `timestamp_state: "not-requested"` | Human approves sending digests to public calendar servers |
| OpenTimestamps proof (transcript) | **Not requested** | — | — | $0 | No transcript yet | After transcript approval |
| Cost page | **Live** | https://jollyrogercharter.org/costs/ | Public | $0 | From `launch/costs.json`; unknowns shown as unknown | Human adds domain price and AI usage |
| Challenge and debate pages | **Live** | https://jollyrogercharter.org/challenge/ · /debate/ | Public | $0 | Issue templates in repo | Enable GitHub Discussions |
| GitHub Discussions + seed RFCs | **Drafted** | — | — | $0 | `launch/RFC-SEEDS.md` | Human enables Discussions and posts them |
| Content drafts / 30-day calendar | **Drafted, unreviewed** | — | — | $0 | `launch/CONTENT-DRAFTS.md` | Human reviews; posts from own accounts |
| Licence for original content | **Blocked: legal decision** | — | — | — | None applied, so all rights are reserved by default | Human decision after review (`legal/LICENSE-AND-RISK.md`) |
| Founder-absence test | **Run 1 done (not independent)** | — | — | $0 | `launch/FOUNDER-ABSENCE-TEST.md` | An unrelated person repeats it |
| Open dependencies list | **Complete (local)** | — | Local repo | $0 | `OPEN-DEPENDENCIES.md` (10 items) | Work them down |

## Needs the human

In order of what unblocks the most:

1. **Secure the org.** Settings → Authentication security → require 2FA; invite a second trusted owner; protect `main` (require a PR review and passing CI).
3. **Record the domain cost.** Add the price paid, renewal price and auto-renew state to `launch/costs.json` (no account IDs).
5. **Decide on OpenTimestamps for the founding package.** It sends only SHA-256 digests to public calendar servers. Once you approve, the agent installs the official client in an isolated environment, stamps, and records the state as `pending`.
6. **Export the founding ChatGPT conversation** (Settings → Data controls → Export). Keep the ZIP private. The agent will extract this one conversation locally and draft a redacted edition for your review.
7. **Make the licence decision.** Until one is made, the "truly free" repository is legally all-rights-reserved.
8. **Review and post** `launch/CONTENT-DRAFTS.md` and `launch/RFC-SEEDS.md` from your own accounts.

Update this file with true state at each milestone. Do not use checkbox theater.
