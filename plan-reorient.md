# Plan: reorient around free code, rewarded stewardship and human attention

Branch `feat/reorient`, stacked on `feat/agents-interop` (#15); the treasury (#16) was dropped. Founder-proposed editorial and strategic change, 2026-10-19.

## Repository state found

- `main` contains only #1–#4. #5 and #6 show "merged" on GitHub but were merged into their stacked bases (`fix/status-truth`, `feat/jrc-cli`), not `main`. Their content reaches `main` only through #13.
- Open draft stack: #13 `feat/webmcp` → `main`, #14 `feat/adopt`, #15 `feat/agents-interop`, #16 `feat/treasury`. Each branch contains the one below it; `main`'s content equals the stack's merge base.
- `feat/founding-transcript` is local only (a worktree in a scratchpad), WIP, untouched here.
- Baseline on `feat/treasury`: 164/164 tests pass.

Stacking on #16 is deliberate: the home page, nav and README on `main` predate every page this change must keep reachable. Retarget when the stack lands.

## Goals

1. One-page manifesto (200–300 words) built on the three principles; v0.1 preserved byte-identical and dated.
2. Charter becomes a short list of voluntary commitments, with JRCv1 kept intact underneath.
3. A plain-language Open Stewardship Economy explanation.
4. A small, honest pilot proposal that tests the economics before more technology.
5. A projects page explaining how existing tools serve the principles, none mandatory.
6. Home page, nav, metadata, README and package description carry one message.

## Non-goals

No new dependencies, no directory moves, no deletion of specs/tools/provenance, no change to JRCv1 normative text, schemas, APIs or WebMCP tools, no claims of traction or consensus, no push/merge/deploy.

## Files

New: `history/MANIFESTO-v0.1-2026-10-17.md` (byte copy), `STEWARDSHIP-ECONOMY.md`, `STEWARDSHIP-PILOT.md`, `PROJECTS.md`, `launch/RFC-STEWARDSHIP-ECONOMY.md`, `site/{stewardship,pilot,projects,manifesto-v0-1}.njk`, `transparency/agent-runs/2026-10-19-reorientation.md`.

Edited: `MANIFESTO.md`, `CHARTER.md` (new intro, JRCv1 text kept below), `README.md` (new top, founding content kept under its own heading), `DECISIONS-AND-QUESTIONS.md` (dated proposal section + open decision 13, which surfaces on /debate/ through the existing parser), `AGENTS.md` (reading list), `site/index.njk`, `site/_data/site.json`, `site/_includes/base.njk` (og:site_name), `site/manifesto.njk`, `site/charter.njk` (under-review notice above open economics), `eleventy.config.js` (DOC_ROUTES, downloads), `launch/status.json` + regenerated `LAUNCH-STATUS.md`, `CHANGELOG.md`, `package.json` description, tests.

## Conflicts to document, not silently resolve (in the RFC)

- Cost-recovery pledge and "pass efficiencies to the community" (OPEN-ECONOMICS, MANIFESTO v0.1) vs. profit from stewardship being legitimate.
- Itemised human costs vs. not requiring disclosure of personal finances.
- AT Protocol "at the core" (pillar 3) vs. technologies as optional tools.
- Dollar-valued attention (HAA proposal) vs. measuring time first, no universal rate.
- Founding line "retain verbatim" vs. a 300-word manifesto: moved to the Charter and kept in v0.1, not dropped.

## Tests

- Update: founding-lines test (three principles + required phrases on home and manifesto; founding line on /charter/ and the v0.1 page), routes list, the interop test that uses MANIFESTO.md as its "unedited file" example (switch to another unedited founding file).
- Add: v0.1 copy matches the preservation digest byte-for-byte; manifesto word count 200–300 and no em dashes; pilot and economy pages state the model is unproven and the pilot has not started; every old primary-nav URL is still linked from the layout.
- Run `npm test` after each change set; build must pass.

## Review

Independent editorial pass (30-second, income, attention, freedom, complexity, authenticity tests) and engineering pass (links, URLs, APIs, tests), both on `sonnet`. Fix findings, re-run tests.

## Deployment / rollback

Code deployed 2026-10-20: merged to `main` in #17 (merge `4d5158a`, together with #13–#15 and the provenance retirement); Cloudflare Pages build finished 11:42Z, and `/`, `/stewardship/`, `/pilot/`, `/projects/` and `/manifesto/v0-1/` were checked live. No content scripts to apply. Rollback is reverting the merge on `main`.

## Open decisions for Albert

Manifesto name (Pirate Charter → Jolly Roger Manifesto), pilot steward/app/price/thresholds, whether the RFC should land before or with the editorial change, og:image.
