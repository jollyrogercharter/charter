# Launch Operations Ledger

**Status (2026-10-18 03:50 UTC): no registrations, purchases or deployments have occurred.** Every row below reflects a verified check, not an assumption. The machine-readable cost data the site shows is in `launch/costs.json`.

| Resource | Desired | Actual | Status | Cost (USD) | Evidence and next action |
|---|---|---|---|---:|---|
| GitHub organization | `jollyrogercharter` | None | Not created | $0 intended | `GET /users/jollyrogercharter` → 404 on 2026-10-18 03:34 UTC (not proof it can be registered). Human creates the org in the UI |
| Main repo | `charter` | Local only, branches `main` + `feat/launch-site` | Not pushed | $0 | Local commits `e59cf86`…; push awaits human approval |
| Domain | `jollyrogercharter.org` | None | Not registered | unknown | PIR RDAP → 404 on 2026-10-18 03:34 UTC (control 200). Registrar price/renewal unchecked; needs checkout approval |
| Static hosting | Cloudflare Pages Free candidate | None | Not deployed | $0 intended | `DEPLOYMENT.md`; human connects the repo |
| OpenTimestamps | Founding package digests | None | Not requested | $0 | Awaits approval to submit digests to public calendars |
| Email/newsletter | None required at launch | Not configured | Deliberately deferred | $0 | RSS/Atom feed at `/feed.xml` |
| AI usage | User's existing agent tools | Claude Code session 2026-10-17 | Cost unknown to agent | unknown | Human may add real usage to `launch/costs.json` |
| Human attention | Proposed open methodology | No rate established | RFC required | Noncash | Reported separately; no universal rate |

Record on every change: date, initiator, verified link, expense category, provider, billing frequency/renewal, non-sensitive proof, owner/backup owner, and any blockers. **Never write payment card numbers, address, tokens, invoices with private details or private account IDs into this ledger.**
