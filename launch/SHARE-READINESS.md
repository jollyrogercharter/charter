# Share Readiness

Prepared 2026-10-20 for the founder, ahead of a first public announcement. It covers branch `fix/prelaunch-polish`, which is **not merged and not deployed**. The live site is `main` @ `972f495` (verified from the live footer on 2026-10-20). Until this branch merges, visitors see the previous navigation and wording.

## Where to send people

- Manifesto: https://jollyrogercharter.org/manifesto/
- Stewardship economy: https://jollyrogercharter.org/stewardship/
- Pilot plan: https://jollyrogercharter.org/pilot/
- Ways to take part (steward, customer, critic): https://jollyrogercharter.org/get-involved/ (live only after merge)
- Discussions: https://github.com/jollyrogercharter/charter/discussions (enabled, no posts yet)

## What's ready

- **The three principles and the central message** open the home page. Five plain statements follow on the first screen: unpaid developers aren't required, stewards can earn well, AI helps, customers can leave, and the model is unproven.
- **Navigation:** Manifesto · Stewardship · Get Involved. Charter, Pilot, Projects, Challenge, Debate, Status and the technical pages sit in the footer, and no URL changed.
- **A participation page** offers three paths: become a steward, consider paying one, or challenge the idea. Each path explains what's involved and what's uncertain, and links to a GitHub form that works today.
- **A practical pilot plan** includes participant descriptions and a decision checklist.
- **An independent-review invitation:** a checklist on `/get-involved/#test-this-repository`, the existing Challenge and a reproduction-report template.

## What was corrected

| Issue | Evidence before | Now |
|---|---|---|
| CC0 contradiction | `README.md` said not to publish a CC0 `LICENSE`, although `LICENSE` is CC0 1.0. RFC seed 2 said no dedication was applied. `legal/LICENSE-AND-RISK.md` was titled "Decision Pending". | Applied to eligible original material; no independent legal review (#11); third-party licences and exclusions stand; future software may need a patent grant. Licence unchanged. |
| Profit vs cost recovery | `standard/OPEN-ECONOMICS.md` favors passing efficiencies on as lower prices | The charter's "Money, in plain terms" section says that profit is allowed, books are kept by category, and the detailed standard awaits review. JRCv1 text is unchanged; RFC discussion drafted. |
| Hourly absolutes | "No hourly billing" (home), "Hourly billing punishes…" (`STEWARDSHIP-ECONOMY.md`) | A livelihood shouldn't *have to* depend on billable hours; hourly consulting is fine |
| Stale technical claims | `DEPLOYMENT.md` "not deployed anywhere"; README "draft branches"; WebMCP "thirteen read-only tools", "2 KiB" cap, "block header"; status "29 tools" | They match the code: 24 tools (15 read-only, 9 prepare-only), an 8 KiB default cap, and the live Cloudflare Pages host |
| Retired provenance | OpenTimestamps "pending" in paste-ready drafts (`LAUNCH-BRIEFING.md`, `RFC-DRAFTS-OVERNIGHT.md`) | Marked superseded or historical; nothing revived |
| Security channel | `SECURITY.md` links GitHub's private advisory form, but private vulnerability reporting is **disabled** on the repository | A fallback is documented, a status item was added, and the founder is asked to enable reporting (below) |

## Test results (2026-10-20, this branch)

- `npm test`: **131/131 pass** (build plus every suite).
- New guards cover the primary nav, footer reachability, CC0 wording and hourly absolutes. All four **fail** when run against `main`'s text in a scratch copy, so they detect the regressions.
- Headless Chrome 155, driven through the DevTools protocol (no visible window), against a local build: 10 pages × 4 viewports (1280, 768, 390, 360 wide) × light/dark = **80 combinations, 0 problems**. No horizontal overflow, console errors or broken images. Body background follows the theme. Screenshots were checked by eye for home, Get Involved, pilot and stewardship.
- Every GitHub link on the participation pages resolves: 200, or a 302 to sign-in for forms. `community/GET-INVOLVED.md` on GitHub 404s until this branch merges.
- The diff contains no credentials, contact details, financial records or conversation exports (pattern scan plus the suite's secret scan).

**Not tested:** real phones, Safari and Firefox, screen readers, keyboard-only navigation beyond the automated accessibility smoke test, and the live site after deployment.

## Manual actions before sharing

1. **Review and merge** the draft PR, then confirm the live footer shows the new commit.
2. **Enable private vulnerability reporting** (Settings → Code security, or `gh api -X PUT repos/jollyrogercharter/charter/private-vulnerability-reporting`).
3. **Publish the discussion posts** in [`DISCUSSION-DRAFTS.md`](DISCUSSION-DRAFTS.md), at least posts 1–3. Then replace the three "start a discussion" links in `community/GET-INVOLVED.md` with the thread URLs.
4. Decide who will answer replies, and how quickly. Interest posts with no response would hurt more than not inviting them.
5. Spot-check `/`, `/get-involved/` and `/pilot/` on your own phone, in light and dark mode.

## Outstanding work

**Blocker**

- The branch isn't deployed. The live site still carries the CC0 contradiction and the old navigation.
- There's no working private security channel until reporting is enabled.

**Soon**

- Publish the participation discussions and link them in place of the form links.
- Open the stewardship-economy RFC discussion (draft 4) and record the outcome in `DECISIONS-AND-QUESTIONS.md`.
- Make the seven pilot decisions in `STEWARDSHIP-PILOT.md`.
- Add a second organization owner (an invitation is pending).
- Create charter Discussions categories (#8).
- JRCv1 pillar 2 still asks for "sanitized agent traces", in tension with the optional-transcript stance; it needs an RFC, not a silent edit.
- `AGENTS.md` still calls the repository "not a deployed product".

**Later**

- Native WebMCP verification in a flagged browser, and trying the MCP server with third-party clients.
- Eleventy 3.1.7 (#10, on or after 2026-10-29), a second static host, AT Protocol publishing and billing integrations.
- Regenerate the `docs/demo/` adoption snapshots, which predate the provenance removal, and document the `W-*` warning codes in `spec/JRC-MANIFEST.md`.

## Risks that would justify delaying

- Announcing before the merge. Visitors would meet the old contradictions, and `/get-involved/` would 404.
- Inviting stewards and customers without anyone ready to reply within a few days.
- Any wording, in the post or in replies, that implies the pilot has started, customers have committed, income is likely, or independent review has happened.

## LinkedIn checklist

- [ ] The PR is merged, and the live footer shows its commit.
- [ ] `/get-involved/` loads and its links work while you're signed out.
- [ ] Private vulnerability reporting is on.
- [ ] Discussion posts 1–3 are published and linked.
- [ ] The post says "proposal" and "pilot not started", and promises no income, savings or security.
- [ ] The post links the manifesto and Get Involved, not the technical pages.
- [ ] Someone can reply to responses this week.
