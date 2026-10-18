# Agent Run: Overnight Build, 2026-10-18

| Field | Value |
|---|---|
| Date | 2026-10-18, about 04:50Z to 17:40Z (wall clock, including idle time) |
| Initiator | Human initiator, via a written prompt that pointed to `JRCv1_Overnight_Claude_Handoff.md` (both are committed in this repository) |
| Authorization | Push feature branches and open **draft** PRs. No merges to `main`, purchases, social posts, private disclosures or account-security changes. |
| Main agent | Claude Opus 5.5 (`claude-opus-5-5`), Anthropic, in Claude Code on the initiator's machine |
| Sub-agents | Three Claude Sonnet runs: an independent code review, an adversarial security review, and drafts of `launch/RFC-DRAFTS-OVERNIGHT.md` and `launch/LAUNCH-BRIEFING.md` |
| Plan | `plan-overnight.md`, written before any code |

## What was done

1. Verified the live state before changing anything: PRs, CI, rulesets, 2FA, Discussions, DNS, `npm audit` and the timestamp state. Wrote down the stale public claims that turned up.
2. **PR #4.** `launch/status.json` became the single source for status claims. The status Markdown, `/status/` and the home page are generated from it, a test keeps them in sync, and the stale claims are fixed.
3. **PR #5.** The `jrc` CLI, its JSON Schema and spec, a self-assessment, the `/check/`, `/spec/`, Raise the Flag and challenge-log pages, and CI additions.
4. Sent commit 12c5ec9 to two independent reviewers. They found real defects, including a Markdown injection that hid errors and forged a "valid" result, and a 6/6 badge earned with no real evidence. All were fixed in e623d39, each with a regression test written from the attacker's side.
5. **PR #6.** The Quartermaster qm 0.1 ledger format, validator, CSV import and summary. The cost page is now built from the validated ledger, and a propose-a-saving PR template was added.
6. Upgraded the OpenTimestamps proof. It was verified against Bitcoin block headers from two public explorers, and `provenance/check-ots.py` was added so anyone can repeat the check without a node.
7. Ran a clean-clone end-to-end demo on Node 22 from GitHub (`launch/OVERNIGHT-REPORT.md`). The suite passed on Node 20, 24 and 26.
8. Filed issues #7–#12 for items only a human can do.

## Mistakes made and corrected during the run

- **Committed while a test was failing.** A chained shell command committed even though the secret-scan test failed. The commit was amended before it was pushed.
- **Dropped check in a rewrite.** Rewriting `check.mjs` removed the `REPLACE:` placeholder warning. A GitHub-based `npx` run caught it, and it was restored with a test.
- **Escapes became literal characters.** The editing tool turned ` `-style escapes into literal characters, which broke the module. All JS sources were re-escaped to ASCII.
- **Real invoice number in a fixture.** A real invoice number seen in the billing dashboard was typed into a test fixture. It was replaced before any commit, and `git log --all -p` confirms it never entered history.
- **Bad demo harness.** The first end-to-end demo run was invalid because of a harness bug, not the CLI. It was re-run correctly, and both runs are disclosed.
- **Overstated self-assessment.** The first version said "governance: partly evidenced" for a pillar declared `exploring`. A distinct `exploring` level was added.

## Conflicts noticed

- **Attribution trailers.** The session asked for commit trailers and a 🤖 PR footer. The initiator's standing rules forbid trailers, and those rules take precedence. Commits are single-line, and PR descriptions carry a plain "Authorship" section instead, which the charter requires.

## Not published

- The full tool-call transcript isn't published. It holds local paths and machine details, and its reproducible content is captured in the commits, tests and this record.
- Internal model reasoning isn't available.

## Cost

Unknown. The agent can't see the account's AI billing. It is recorded as `null` in `launch/costs.json` (`ai-overnight-session`).
