# Open Dependencies: What Still Needs the Founder

The charter's own test, applied to itself: could this project continue if the human initiator disappeared tomorrow? Not yet. Each row is something only one person can currently do, with a proposal to remove it. Last reviewed 2026-10-18T05:00Z by Claude; corrections welcome by PR.

| # | Dependency | Why it's founder-bound today | Proposal to remove it |
|---|---|---|---|
| 1 | GitHub organization ownership | One active admin; a second owner has been invited but has not accepted. | Second owner accepts; publish the owner list and recovery procedure in `community/`. |
| 2 | Domain registration | Registered in one person's Cloudflare account (auto-renew on, renews 2027). | Add a second account member; document the transfer procedure; consider a fiscal sponsor later. |
| 3 | Hosting account | Cloudflare Pages runs in the same personal account. | The site stays host-agnostic (`DEPLOYMENT.md`); deploy a mirror on a second host; any maintainer can redeploy from a fork. |
| 4 | Founding conversation source | Only the initiator can export the ChatGPT conversation. | One-time: export, review and publish per `transparency/CONVERSATION-PUBLICATION.md`. After that the public edition and its digest are self-contained. |
| 5 | Licence decision | **Resolved 2026-10-18:** CC0 1.0 applied by the initiator's decision (`LICENSE`, `NOTICE.md`). Not yet reviewed by counsel. | Independent legal review; an RFC on patent policy for future software. |
| 6 | Merge rights | `main` is protected (PR plus CI required), but only one person can merge. | At least two maintainers with merge rights, then require one approving review. |
| 7 | Decisions on open questions | `DECISIONS-AND-QUESTIONS.md` items are settled by the initiator's preference. | Adopt the RFC process from `community/GOVERNANCE-AND-DEBATE.md` with a published decision rule (e.g. lazy consensus with a review period). |
| 8 | Public voice | Launch posts would come from the initiator's personal accounts. | Project-owned accounts with shared access via an org password manager; posts go through PRs to `launch/CONTENT-DRAFTS.md` first. |
| 9 | AI tooling | The launch work ran on the initiator's Claude account; costs are invisible to the project. | Record usage in `launch/costs.json` when known; keep all work reproducible without any specific AI vendor (it currently is: the build needs only Node). |
| 10 | Timestamp proofs | The client was run on the initiator's machine. | Anyone can upgrade or verify with the open-source client (`provenance/VERIFY.md`); add a scheduled CI job that upgrades pending proofs. |

## Things that are already founder-independent

- Building the site: `npm ci && npm test` from a fresh clone, no credentials (checked 2026-10-18; see `launch/FOUNDER-ABSENCE-TEST.md`).
- Verifying founding-file digests: `node scripts/hash-manifest.mjs e59cf86` regenerates them from Git alone.
- Reading everything: the Markdown in this repository is the canonical source; the website is a rendering of it.

## Not applicable yet

AT Protocol data export and migration: no application holding user data exists yet, so there's nothing to migrate. When Quartermaster or another reference app ships, this file must gain a row for every user-data path that isn't independently exportable.
