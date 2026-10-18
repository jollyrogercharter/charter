# Launch Status

**Current state (2026-10-18 03:50 UTC):** the website and repository are built and tested **locally**, on branch `feat/launch-site`. Nothing has been pushed, deployed, registered, purchased, timestamped or posted. This is a draft, not a production launch.

Code deployed: **no**. Content applied anywhere public: **no**.

| Task | Status | Actual URL | Who has access | Cost | Evidence | Next action |
|---|---|---|---|---:|---|---|
| Founding documents preserved | **Complete (local)** | — | Local repo | $0 | `e59cf86` on `main`; 36 files byte-identical to ZIP | Push with the repo |
| Provenance digests | **Complete (local)** | — | Local repo | $0 | `provenance/launch-manifest.json`; test re-verifies against Git | Publish with the repo |
| Eleventy site build and tests | **Complete (local)** | — | Local repo | $0 | `npm test` 11/11 on Node 20 and 22, from a fresh clone | Deploy once a host is approved |
| CI workflow | **Written, never run** | — | — | $0 | `.github/workflows/ci.yml` | Runs on first push |
| GitHub name availability | **Partly checked** | — | — | — | `GET /users/{name}` returned 404 for all five candidates on 2026-10-18 03:34 UTC. A 404 doesn't prove a name can be registered | Human tries `jollyrogercharter` in the org-creation UI |
| GitHub organization | **Blocked: human** | — | — | $0 intended | Can't be created through the API from a personal account | Human creates a free org with 2FA ([steps](#needs-the-human)) |
| Repository push | **Blocked: human** | — | — | $0 | — | Human approves; agent can then add the remote and push |
| Domain availability | **Partly checked** | — | — | — | PIR RDAP returned 404 for all five `.org` candidates (the control `wikipedia.org` returned 200). Registrar availability and price **not checked** | Human checks at a registrar; brings price + renewal back for approval |
| Domain purchase | **Blocked: approval** | — | — | unknown | — | Checkout approval gate |
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

1. **Create the GitHub org.** Go to github.com → your avatar → Your organizations → New organization → Free. Try `jollyrogercharter`; the fallbacks in order are `thepiratecharter`, `jollyrogerstandard`, `jollyrogercommons`, `trulyfreeproject`. Turn on 2FA enforcement. Create an empty public repo named `charter` with no README. If a fallback name is used, the build needs `REPO_URL` set (see `DEPLOYMENT.md`).
2. **Approve the push.** Say so explicitly, and the agent will add the remote, push `main` and `feat/launch-site`, and open a PR. Review the branch before that. In particular, the commits carry your name with your GitHub noreply email.
3. **Check the domain at a registrar** you control. Bring back the first-year price, the renewal price, any privacy fee, the DNS provider and the auto-renew setting for checkout approval.
4. **Pick a host and connect it.** Cloudflare Pages on the free plan is the candidate. The steps are in `DEPLOYMENT.md`.
5. **Decide on OpenTimestamps for the founding package.** It sends only SHA-256 digests to public calendar servers. Once you approve, the agent installs the official client in an isolated environment, stamps, and records the state as `pending`.
6. **Export the founding ChatGPT conversation** (Settings → Data controls → Export). Keep the ZIP private. The agent will extract this one conversation locally and draft a redacted edition for your review.
7. **Make the licence decision.** Until one is made, the "truly free" repository is legally all-rights-reserved.
8. **Review and post** `launch/CONTENT-DRAFTS.md` and `launch/RFC-SEEDS.md` from your own accounts.

Update this file with true state at each milestone. Do not use checkbox theater.
