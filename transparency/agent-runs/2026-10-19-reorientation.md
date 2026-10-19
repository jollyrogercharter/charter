# Agent Run: Reorientation and Simplification, 2026-10-19

| Field | Value |
|---|---|
| Initiator | Human founder, via the brief in [`2026-10-19-reorientation-brief.md`](2026-10-19-reorientation-brief.md) (verbatim) |
| Authorization | Edit documents, site and tests on a feature branch and prepare a draft PR. No merge to main, no deployment. Pushing needs the founder's explicit yes. |
| Main agent | Claude Opus 5.5 (`claude-opus-5-5`) in Claude Code |
| Sub-agents | Two Claude Sonnet reviewers: editorial (the brief's seven acceptance tests) and engineering (URLs, APIs, links, tests, accessibility) |
| Plan | [`plan-reorient.md`](../../plan-reorient.md) |
| Branch | `feat/reorient`, stacked on `feat/treasury` (#16) |

## Repository state found

`main` holds #1–#4 only. #5 and #6 show as merged on GitHub, but they were merged into their stacked base branches, not into `main`. Their content reaches `main` only through #13. #13–#16 are open drafts, each containing the one below it. The branch is stacked on #16 because the home page and navigation on `main` predate the pages this change must keep reachable.

## What changed

- **Manifesto v0.2:** one page, built on three principles. The v0.1 draft is preserved byte-for-byte in `history/` and served at `/manifesto/v0-1/`.
- **Charter:** seven plain-language commitments, mapped to the six JRCv1 pillars. The JRCv1 text is unchanged apart from its title and heading levels.
- **New documents:** `STEWARDSHIP-ECONOMY.md`, `STEWARDSHIP-PILOT.md`, `PROJECTS.md`, and `launch/RFC-STEWARDSHIP-ECONOMY.md`, which records six conflicts with JRCv1 and proposes resolutions rather than applying them.
- **Website:** new home page and six-item primary navigation. Former primary pages moved to the footer at the same URLs.
- **README and status:** a new README introduction, a `stewardship-pilot` status item (blocked on human decisions), open decision 13, and a changelog entry.

## Verification

| What | How | Result |
|---|---|---|
| Baseline | `npm test` on `feat/treasury` before any change | 164/164 |
| Full suite | `npm test` (builds the site first), Node 26 | 168/168 |
| New tests fail when they should | Five mutations: an unlabelled dollar figure on the home page, an em dash in the manifesto, a tool name in the manifesto, an altered v0.1 copy, a dropped footer link | Each mutation failed its test; files restored |
| v0.1 preservation | SHA-256 of `history/MANIFESTO-v0.1-2026-10-17.md` against the `MANIFESTO.md` entry in `provenance/launch-manifest.json` | Match (`1e8e6676…a502a`) |
| Built URLs and machine-readable outputs | Engineering reviewer built `feat/treasury` in a separate worktree and diffed every output | No path removed. Differences are expected: the new status item, `decision-13` in the debates, the `provenance_changed` list, the edited downloads, the feed subtitle, and new sitemap entries. `check/report.json`, schemas, `api/v1/charter.json`, `capabilities.json` and the provenance files are identical. |
| Links | Engineering reviewer checked every built `href`, including GitHub blob targets | No new broken links. One broken link predates this change: `/conversation/archive/` → `HUMAN-ATTENTION.md`. |
| Screenshots | Headless Chrome with no visible window. Mobile was captured through a 390 px iframe, because headless Chrome won't size a window that narrow. | [before, desktop](2026-10-19-reorientation/before-home-desktop.jpg) · [after, desktop](2026-10-19-reorientation/after-home-desktop.jpg) · [before, mobile](2026-10-19-reorientation/before-home-mobile.jpg) · [after, mobile](2026-10-19-reorientation/after-home-mobile.jpg) |

Not done: a real-browser check with assistive technology, and any reader testing with people who haven't seen the project. The 30-second test was judged only by the editorial reviewer, an AI agent.

## Review findings and what happened

**Editorial** (14 findings):
- **Applied:**
  - The home page now states the model as an aim, not a fact.
  - "Steward" is defined in the manifesto and at its first use on the home page.
  - A flat monthly fee is named as the alternative to billing by the hour.
  - The distinction between a steward's paid attention and a user's spared attention now appears on the home page.
  - The charter commitments are marked as the founder's proposal.
  - The charter table now matches the commitment titles, and the founding line moved below the commitment list.
  - The pilot's duration and size now agree across documents.
  - The RFC no longer refers to a pull request that doesn't exist yet.
  - The README's tone now matches the other documents.
- **Not applied:**
  - "Manufacturing dependence" stays, because it is the founder's own wording.
  - "AI is changing that" stays as a stated belief.
  - The drafter attribution (Claude Opus 5.5) is correct and is unchanged.

**Engineering** (no blocking defects):
- Deep links to section anchors in the old manifesto now land on `/manifesto/`. That page now points to `/manifesto/v0-1/`, which carries the same anchors.
- The manifesto tool-name check now matches whole words only.

These reviewers are agents working for the project, not independent auditors.

## Open decisions for the founder

- **Manifesto name:** "The Pirate Charter" becomes "The Jolly Roger Manifesto".
- **The founding line marked "retain verbatim":** it moves from the manifesto to the charter.
- **The six pilot decisions:** steward, application, price, thresholds, upstream share and reviewer.
- **Whether the RFC's JRCv1 resolutions are debated before or after the editorial change merges.**
- **An `og:image`:** the site has none. The SVG flag doesn't work as a social preview.
