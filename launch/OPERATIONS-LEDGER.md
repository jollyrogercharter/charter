# Launch Operations Ledger

**Status (2026-10-18): GitHub org and public repo exist (free). Domain `jollyrogercharter.org` registered via Cloudflare Registrar. Site live on Cloudflare Pages at https://jollyrogercharter.org since 2026-10-18.** Every row below reflects a verified check, not an assumption. The machine-readable cost data the site shows is in `launch/costs.json`.

| Resource | Desired | Actual | Status | Cost (USD) | Evidence and next action |
|---|---|---|---|---:|---|
| GitHub organization | `jollyrogercharter` | https://github.com/jollyrogercharter | Created by human, free plan; 2FA not yet required | $0 | Verified via `GET /orgs/jollyrogercharter` 2026-10-18. Owner: human initiator (sole admin) — add a backup owner |
| Main repo | `charter` | https://github.com/jollyrogercharter/charter (public) | Pushed `main` + `feat/launch-site` | $0 | Created 2026-10-18 via `gh repo create` at the human's request; SHAs verified against remote |
| Domain | `jollyrogercharter.org` | `jollyrogercharter.org` | Registered 2026-10-18T03:54Z; expires 2027-10-18; status `client transfer prohibited`; NS `jay`/`tiffany.ns.cloudflare.com` | $8.50 (renews $11.20/yr, auto-renew on) | Purchased by the human initiator in their Cloudflare account. Verified via PIR RDAP 2026-10-18. Next: record price and auto-renew state; add a backup account member |
| Static hosting | Cloudflare Pages Free | Project `jollyrogercharter` → https://jollyrogercharter.org (CNAME `@` → `jollyrogercharter.pages.dev`) | Live, auto-deploys from `main` | $0 | Deployed 2026-10-18 at the human's request via the dashboard; build `npm ci && npm run build`, output `_site`, `NODE_VERSION=22`, `SITE_URL=https://jollyrogercharter.org`, Web Analytics not enabled. Owner: human initiator — add a backup member |
| OpenTimestamps | Founding package digests | `provenance/launch-digests.sha256.ots` | Pending (submitted 2026-10-18T04:36Z) | $0 | Approved by the human initiator; client opentimestamps-client 0.7.2 via pipx |
| Email/newsletter | None required at launch | Not configured | Deliberately deferred | $0 | RSS/Atom feed at `/feed.xml` |
| AI usage | User's existing agent tools | Claude Code session 2026-10-17 | Cost unknown to agent | unknown | Human may add real usage to `launch/costs.json` |
| Human attention | Proposed open methodology | No rate established | RFC required | Noncash | Reported separately; no universal rate |

Record on every change: date, initiator, verified link, expense category, provider, billing frequency/renewal, non-sensitive proof, owner/backup owner, and any blockers. **Never write payment card numbers, address, tokens, invoices with private details or private account IDs into this ledger.**
