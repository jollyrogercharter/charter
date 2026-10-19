# Launch Status

<!-- Generated from launch/status.json by scripts/render-status.mjs. Edit the JSON, then run `npm run status`. -->

**As of 2026-10-18T17:30Z.** The site is live at https://jollyrogercharter.org and is rebuilt from the public repository on every merge to main. JRCv1 is a draft conformance standard, not a licence. Nothing has been independently reproduced, and the founding transcript is not published. The founding digest list has a verified Bitcoin timestamp.

States: **implemented**: Exists and was verified on the date shown. **pending**: Started or requested, but not complete. **blocked**: Cannot proceed without a named person or decision. **historical**: True when written; kept as a record, not a current claim.

| Area | Item | State | URL | Evidence | Verified (UTC) | Next |
|---|---|---|---|---|---|---|
| Infrastructure | Public repository | **implemented** | <https://github.com/jollyrogercharter/charter> | Public, CC0-1.0 detected by GitHub. | 2026-10-18T04:51Z | — |
| Infrastructure | Org 2FA and branch protection | **implemented** | <https://github.com/jollyrogercharter> | Org requires 2FA. Ruleset protect-main requires a pull request and the build-and-test check, and blocks force-push and deletion. | 2026-10-18T04:51Z | — |
| Infrastructure | Second organization owner | **pending** | — | One owner invitation outstanding; one active admin. | 2026-10-18T04:40Z | Invitee accepts; then raise required approvals on main to 1. |
| Infrastructure | Continuous integration | **implemented** | <https://github.com/jollyrogercharter/charter/actions> | build-and-test passes on main and pull requests. | 2026-10-18T04:51Z | — |
| Infrastructure | Domain jollyrogercharter.org | **implemented** | <https://jollyrogercharter.org> | Cloudflare Registrar; registered 2026-10-18; $8.50 first year, renews $11.20/yr, auto-renew on. | 2026-10-18T04:40Z | — |
| Infrastructure | Hosting and HTTPS | **implemented** | <https://jollyrogercharter.org> | Cloudflare Pages free plan, auto-deploys from main. HTTP redirects to HTTPS with a 301. Served provenance manifest matches the repository byte for byte. | 2026-10-18T04:51Z | — |
| Infrastructure | www.jollyrogercharter.org | **implemented** | <https://www.jollyrogercharter.org> | Added as a second Cloudflare Pages custom domain (CNAME www → jollyrogercharter.pages.dev) at the human's request. Serves the site over HTTPS; canonical links point to the apex domain. | 2026-10-18T17:55Z | — |
| Infrastructure | Second, independent host | **pending** | — | DEPLOYMENT.md documents alternatives; none deployed. | 2026-10-18T04:51Z | Anyone can deploy a mirror from a fork; the project has not done so yet. |
| Rights | CC0 1.0 dedication | **implemented** | <https://github.com/jollyrogercharter/charter/blob/main/NOTICE.md> | LICENSE holds the official CC0 1.0 text; NOTICE.md lists exclusions. Decided by the human initiator without counsel. | 2026-10-18T04:51Z | — |
| Rights | Legal review of the dedication | **pending** | — | No counsel has reviewed it. | 2026-10-18T04:51Z | Find a volunteer or paid open-source licensing reviewer. |
| Provenance | SHA-256 digests of the founding package | **implemented** | <https://jollyrogercharter.org/provenance/> | 36 files plus the received ZIP; a test re-verifies them against Git. | 2026-10-18T04:51Z | — |
| Provenance | OpenTimestamps proof of the digest list | **implemented** | <https://jollyrogercharter.org/provenance/> | Verified 2026-10-18T17:24Z: attested in Bitcoin block 971948 (block time 2026-10-18T04:45:37Z) and three later blocks. Commitments checked against block headers from blockstream.info and mempool.space, not a local node. Proves existence no later than that time, not authorship or priority. | 2026-10-18T17:24Z | — |
| Provenance | Founding conversation transcript | **blocked** | — | No ChatGPT export has been supplied. The site shows a curated archive labelled as a summary. | 2026-10-18T04:51Z | Human exports the conversation; the agent drafts a redacted edition for review. |
| Community | GitHub Discussions | **implemented** | <https://github.com/jollyrogercharter/charter/discussions> | Enabled with GitHub's default categories; no posts yet. | 2026-10-18T04:51Z | — |
| Community | Charter discussion categories and seed RFCs | **blocked** | — | Categories proposed in launch/RFC-SEEDS.md are not created; GitHub only allows that in the web UI. Seed RFCs are drafted, not posted. | 2026-10-18T04:51Z | Human creates the categories and approves the RFC text for posting. |
| Community | Jolly Roger Challenge | **implemented** | <https://jollyrogercharter.org/challenge/> | Published with issue template. | 2026-10-18T04:51Z | — |
| Community | Independent reproduction of this project | **pending** | — | Only the agent that built the site has reproduced it. No unrelated person has. | 2026-10-18T04:51Z | An unrelated person runs launch/FOUNDER-ABSENCE-TEST.md and files a report. |
| Community | Public announcements | **pending** | — | Drafts exist in launch/CONTENT-DRAFTS.md. Nothing has been posted. | 2026-10-18T04:51Z | Human reviews and posts from their own accounts. |
| Economics | Public cost ledger | **implemented** | <https://jollyrogercharter.org/costs/> | Manual entries; AI usage and human attention marked unknown. | 2026-10-18T04:51Z | — |
| Economics | Billing integrations (Quartermaster) | **pending** | — | Concept only; no code. | 2026-10-18T04:51Z | — |
| Standard | JRCv1 conformance tool (jrc 0.1 draft) | **implemented** | <https://jollyrogercharter.org/check/> | Offline CLI with init, check, report and challenge commands and a JSON Schema. 23 CLI tests, 10 of them regression tests from an independent code review and an adversarial review. This repository's own self-assessment is published at /check/. | 2026-10-18T06:30Z | — |

## Needs the human

1. **Second organization owner** (pending): Invitee accepts; then raise required approvals on main to 1.
2. **Legal review of the dedication** (pending): Find a volunteer or paid open-source licensing reviewer.
3. **Founding conversation transcript** (blocked): Human exports the conversation; the agent drafts a redacted edition for review.
4. **Charter discussion categories and seed RFCs** (blocked): Human creates the categories and approves the RFC text for posting.
5. **Public announcements** (pending): Human reviews and posts from their own accounts.

## Historical records

- **Founding package status notes**: Status lines in the founding documents (for example 'no public Git repository has been created') were true when written on 2026-10-17 and are kept unchanged as a record. <https://github.com/jollyrogercharter/charter/blob/e59cf86/README.md>
