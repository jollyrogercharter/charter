# Open Dependencies: What Still Needs the Founder

The charter's own test, applied to itself: could this project continue if the human initiator disappeared tomorrow? Not yet. Each row is something only one person can currently do, with a proposal to remove it. Last reviewed 2026-10-18 by Claude during the launch session; corrections welcome by PR.

| # | Dependency | Why it's founder-bound today | Proposal to remove it |
|---|---|---|---|
| 1 | GitHub organization ownership | The org doesn't exist yet; when created it will have exactly one owner. | Invite a second trusted owner with 2FA; publish the owner list and the recovery procedure in `community/`. |
| 2 | Domain registration | Not yet registered; when it is, the registrar account belongs to one person. | Record registrar, renewal date and transfer procedure in `launch/OPERATIONS-LEDGER.md`; add a second account contact; set auto-renew; consider transfer to a fiscal sponsor later. |
| 3 | Hosting account | Cloudflare Pages would sit in one personal account. | Keep the site host-agnostic (it is: see `DEPLOYMENT.md`); document a mirror on a second host; any maintainer can redeploy from a fork. |
| 4 | Founding conversation source | Only the initiator can export the ChatGPT conversation. | One-time: export, review and publish per `transparency/CONVERSATION-PUBLICATION.md`. After that the public edition and its digest are self-contained. |
| 5 | Licence decision | **Resolved 2026-10-18:** CC0 1.0 applied by the initiator's decision (`LICENSE`, `NOTICE.md`). Not yet reviewed by counsel. | Independent legal review; an RFC on patent policy for future software. |
| 6 | Merge rights | Only the owner can merge to `main`. | Branch protection requiring one review, plus at least two maintainers with merge rights; document how maintainers are added and removed. |
| 7 | Decisions on open questions | `DECISIONS-AND-QUESTIONS.md` items are settled by the initiator's preference. | Adopt the RFC process from `community/GOVERNANCE-AND-DEBATE.md` with a published decision rule (e.g. lazy consensus with a review period). |
| 8 | Public voice | Launch posts would come from the initiator's personal accounts. | Project-owned accounts with shared access via an org password manager; posts go through PRs to `launch/CONTENT-DRAFTS.md` first. |
| 9 | AI tooling | The launch work ran on the initiator's Claude account; costs are invisible to the project. | Record usage in `launch/costs.json` when known; keep all work reproducible without any specific AI vendor (it currently is: the build needs only Node). |
| 10 | Timestamp proofs | Requesting and upgrading OpenTimestamps proofs needs someone to run the client. | The client is open source and anyone can stamp or verify; document the command sequence in CI once approved. |

## Things that are already founder-independent

- Building the site: `npm ci && npm test` from a fresh clone, no credentials (checked 2026-10-18; see `launch/FOUNDER-ABSENCE-TEST.md`).
- Verifying founding-file digests: `node scripts/hash-manifest.mjs e59cf86` regenerates them from Git alone.
- Reading everything: the Markdown in this repository is the canonical source; the website is a rendering of it.

## Not applicable yet

AT Protocol data export and migration: no application holding user data exists yet, so there's nothing to migrate. When Quartermaster or another reference app ships, this file must gain a row for every user-data path that isn't independently exportable.
