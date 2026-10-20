# Plan: pre-launch review and polish

Branch `fix/prelaunch-polish` from `main` @ `972f495`. A focused editorial pass before the first public introduction, at the founder's request (2026-10-20). No new frameworks, dependencies, principles or systems.

## State found (2026-10-20)

- `main` @ `972f495` (#18). The live site footer reports the same commit, so code deployed = `main`.
- Merged: #5, #6, #13, #17, #18. Closed without merge: #14 and #15 (their content reached `main` through #17) and #16 (treasury; absent). No open PRs.
- CI is green on `main`. Open issues: #8–#12.
- Discussions are enabled with GitHub's default categories and **zero posts**.
- **Private vulnerability reporting is disabled** (`GET /private-vulnerability-reporting` → `enabled:false`), but `SECURITY.md` sends reporters to the advisory form. Outsiders can't use that form.

## Goals

1. Remove the contradictions: CC0 applied vs "don't publish"; profit vs cost recovery; absolute anti-hourly wording; stale technical claims.
2. Make participation obvious: three paths (steward, customer, critic) on one Get Involved page. Each discussion link falls back to an existing destination until the founder publishes the drafted posts.
3. Primary nav becomes Manifesto · Stewardship · Get Involved. Every other page moves to the footer at an unchanged URL.
4. Pilot: a decision checklist of seven items, all undecided, plus descriptions for prospective participants.
5. Invite independent scrutiny without claiming that any has happened.
6. Add `launch/SHARE-READINESS.md`, with actual test results and Blocker/Soon/Later.

## Non-goals

No licence change, no change to normative JRCv1 text, no publishing discussions, no merge, no deploy, no setting changes. No CRM, form or signup service.

## Approach

- **Text corrections in place.** README, `legal/LICENSE-AND-RISK.md`, RFC seed 2, manifesto and stewardship wording, and the RFC status line, which still says the work is "on branch `feat/reorient`".
- **`standard/OPEN-ECONOMICS.md`** gets a one-line pointer saying the efficiency pledge is under review. Its normative text stays unchanged.
- **The RFC discussion**, the three participation posts and an outside-reviewer invitation are drafted in `launch/DISCUSSION-DRAFTS.md` for approval.
- **`community/GET-INVOLVED.md`** is rendered at `/get-involved/`, so the repository and the site carry one text.
- **Discussion URLs** live in `site/_data/site.json` (`participate.*`). While empty, links go to the Discussions index rather than to a nonexistent thread.
- **Tests** guard against stale CC0 wording, anti-hourly absolutes, the three-item primary nav, footer reachability, and links to discussion threads that aren't configured.

## Acceptance criteria

`npm test` passes. The guards are shown to fail against the old text. Every former nav page is linked from every page. No URL changes.

## Browser verification

The founder's global rule forbids opening a browser tab on his machine. Use headless Chrome (no window, throwaway profile) against a local static server for screenshots and console output. Anything that can't be checked headlessly goes into a manual checklist.

## Unresolved, for the founder

Publish the drafted discussions; enable private vulnerability reporting; make the seven pilot decisions; review the RFC.
