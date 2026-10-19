# Content Drafts

> **Historical record.** The founding-provenance parts of this document (transcript publication, founding timestamps, provenance pages, AI-authorship disclosure) were retired on 2026-10-19 and are not current instructions. See `DECISIONS-AND-QUESTIONS.md`.

**Drafts for human review and posting. Nothing here has been published. AI-drafted by Claude (Sonnet subagent) on 2026-10-17; each post must be reviewed and posted by a human from their own account.**

Paid media: **$0**. No bots, no scheduled auto-posting, no bulk direct messages, no purchased engagement. Placeholders: `<SITE_URL>` and `<REPO_URL>` are not real yet (neither the domain nor the GitHub organization is confirmed to exist); fill them in only after they do. Where a draft says "the human initiator", the reviewer should write in their own first person. Do not add metrics, adopters or endorsements that do not exist.

Sources are those in [`../SOURCES.md`](../SOURCES.md) and the repository documents. Plan reference: [`ORGANIC-MARKETING-PLAN.md`](ORGANIC-MARKETING-PLAN.md).

---

## (a) 30-day editorial calendar

One substantive update per week. The count of posts is not a target; skip a channel if there is nothing useful to say there. Dates are relative to the launch day the human chooses (Day 1).

| Week | Public artifact (the substantive weekly update) | Channels, only if useful | Community request | Evidence to link |
|---|---|---|---|---|
| Week 1 (Days 1-7) | Founding charter, source attribution, provenance status, initial website. Includes the AI-assistance disclosure and the list of open founder dependencies. | Repository README and Discussions first; then the LinkedIn essay (b); Bluesky thread (c); Mastodon post (d) | Find contradictions; open "What Would Make This Fail?" threads; debate the mission | `<REPO_URL>`, `<SITE_URL>`, `OPEN-DEPENDENCIES.md`, `provenance/README.md` |
| Week 2 (Days 8-14) | Full build and deploy guide, and the initial "Could your software survive without you?" challenge. | Repository release notes; short follow-up on Bluesky and Mastodon; DEV article (e) if the guide is tested | Try a clean third-party build and report blockers, partial results included | `community/THE-CHALLENGE.md`, `DEPLOYMENT.md`, build instructions |
| Week 3 (Days 15-21) | Quartermaster cost-schema architecture and the public RFC on its interface (RFC 6). | Repository Discussions; one post each on Bluesky and Mastodon pointing to the RFC | Suggest cost data sources and methodology; critique the schema | `product/QUARTERMASTER.md`, `launch/RFC-SEEDS.md` (RFC 5 and 6) |
| Week 4 (Days 22-30) | Documented results: criticism received, changes made, the cost ledger as it actually stands (honest zero or pending values where true), blockers. | Repository; a short wrap-up on LinkedIn; HN only if the checklist in (f) is met and the human decides to submit | Volunteer for a maintainable workstream; claim a nonprogrammer route (h) | `launch/costs.json`, `launch/OPERATIONS-LEDGER.md`, closed and open RFCs |

Notes for the human:

- Publish the editorial backlog and factual measurements in the open. Do not track follower counts as a success measure; track external pull requests, independent reproduction attempts, accepted and rejected RFCs, and real cost data. Report unknowns as unknown.
- Reddit and other forums: only if the specific community's rules allow it, with affiliation disclosed.
- Press, newsletters, podcasts: only after there is a verifiable story such as an outside reproduction. Ask for critique, never imply endorsement.

---

## (b) LinkedIn launch essay (draft, about 350 words)

> **Could your software survive without you?**
>
> A few weeks ago I started a long conversation with ChatGPT about a question that bothered me: why do we call software free when most of it can't actually be reproduced, run or afforded by anyone but its authors? Source code is the easy part. The build process, the infrastructure, the bills and the user's data are where independence usually ends.
>
> That conversation turned into a draft: the Jolly Roger Charter, which we are calling "Truly Free." The slogan is Free. Libre. Truly Free. The idea is simple to state and hard to do. If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.
>
> I want to be plain about how this was made. The idea came from a conversation between me and ChatGPT. The repository, website and launch plan were then built by Claude, an AI model, under my direction. I decided what to try and I'm accountable for what gets published, but much of the writing and engineering was done by AI, and the project says so everywhere.
>
> We did not invent software freedom. GNU and the FSF, SQLite, Creative Commons and others got there first, and the repository credits them. What we are asking is whether the freedoms can be extended to the whole lifecycle: process, operations, costs and data portability.
>
> It's a draft, and I would like you to break it. Specifically:
>
> - Tell us what would make this fail. There's a Discussions category for exactly that.
> - Try the challenge on your own project, and report what you couldn't reproduce, partial results included.
> - If you don't write code: translate, proofread, research real hosting costs, or critique the legal drafting.
>
> Nothing here is a licence, a certification or a finished product. JRCv1 is a proposed conformance standard, and the legal questions are open.
>
> Repository: <REPO_URL> · Site: <SITE_URL>
>
> *AI assistance disclosure: this post was drafted by Claude, an AI model, and reviewed and posted by a human.*

---

## (c) Bluesky thread (7 posts, each 300 characters or fewer)

Post as a thread from the human's own account. Character counts are listed so the reviewer can re-check after editing.

1. > Free. Libre. Truly Free. We're drafting a software-freedom charter and want people to try to break it. Code is the easy part: what about the build, the servers, the bills and your data? Draft only, no product yet. <REPO_URL>

2. > Here is the test: "Could your software survive without you?" Could a stranger build it, run it, pay for it and keep it going if the author vanished? We will publish the answer for our own project, including where it's "no."

3. > If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.

4. > We didn't invent this. GNU/FSF, SQLite, Creative Commons, Ghost, Spec Kit, OpenCost and FOCUS, and atproto all come first. The open question is whether process, operations, costs and data portability can be treated as part of freedom too.

5. > Disclosure: the idea came from a conversation between a human and ChatGPT. Claude, an AI model, built the repo and site and drafted this thread. A human reviewed and posted it. The project's history stays public, with sensitive details redacted by category.

6. > Your data matters here. We lean on AT Protocol for portability, but we won't claim private data is solved: Spaces was alpha as of the last time we checked. What a protocol can't promise, we'll say so.

7. > Ways to help: open a "What Would Make This Fail?" thread; try the challenge; or, without code, translate, proofread, research hosting costs, or critique the legal text. You can't pirate what belongs to everyone. <REPO_URL>

---

## (d) Mastodon post (500 characters or fewer)

> Free. Libre. Truly Free. We're drafting a charter that asks whether software freedom should cover the build process, operations, costs and data portability, not only source code. It's a draft, not a licence, and I'd like you to break it: "Could your software survive without you?" Idea from a human and ChatGPT; repo built by Claude, an AI model; reviewed and posted by me. <REPO_URL> #FreeSoftware #OpenSource

---

## (e) DEV article outline

**Working title:** What would it take for software to survive without its author?

1. **The problem.** Source availability is not the same as being able to build, deploy, fund and migrate. Name the gaps: build knowledge, production infrastructure, billing, user data.
2. **What exists already.** Credit GNU/FSF and the Open Source Definition, SQLite's public-domain dedication, Creative Commons, Ghost's open business model, GitHub Spec Kit, OpenCost and FOCUS, AT Protocol. State clearly that this is a proposed synthesis and make no claim of being first.
3. **The proposal, concretely.** JRCv1 as a draft conformance standard (not a licence): the six categories (code and rights; development and AI transparency; user data sovereignty; operations and resiliency; economic transparency; open community and governance) and the three progress levels.
4. **How it was made.** The human and ChatGPT conversation; the Claude-led build; what was published, what was redacted by category, and why. Link `provenance/README.md` and state what the timestamping can and cannot show.
5. **A worked example of the test.** The founder-absence exercise run against this repository: what passed, what is still founder-bound (`OPEN-DEPENDENCIES.md`). Use real outputs only.
6. **The hard parts, unresolved.** Licence versus standard; CC0 and patents; atproto private data; human attention accounting without a universal rate. Link each to its RFC.
7. **Quartermaster in one section.** Cost schema, FOCUS normalisation, provider connectors, and the caution that billing APIs are delayed and public cost estimates are not audited statements.
8. **Call to action.** Try the challenge on your own project; open a failure-mode thread; pick a non-code route.
9. **Disclosure footer.** AI-drafted by Claude, reviewed and published by a human.

Include code only if it runs: the clean-clone build commands from the repository, copied from a verified run.

---

## (f) Hacker News research brief (for the human; not a submission text)

**This is a brief for the human, not text to submit.** Hacker News expects submissions and comments to be written by the person posting them. Do not post this verbatim, do not have an agent post, and do not ask others to vote or comment. A "Show HN" requires something people can actually try, not only a manifesto.

**What should exist before considering a submission**

- A working, inspectable implementation. The charter and RFCs alone would suit a plain link submission at most, and even then only if there is substance to discuss. Show HN requires something usable; Quartermaster or an equivalent reference application is not built yet.
- A clean-clone build that works for a stranger, tested on a machine that has never seen the project.
- At least one real cost record (or honest zero values) published with its sources and dates.
- The founding conversation either published as an approved, hashed edition or clearly marked as pending, with `provenance/README.md` stating what is and is not proven.
- At least some real criticism received and a visible record of how it was handled.
- The licence question resolved or clearly stated as open on the first screen (RFC 2).
- Ideally an independent reproduction attempt by someone outside the project.
- No unverified "first ever" claims anywhere on the landing page.

**Things to prepare for the discussion**

- The strongest objections are likely to be: "this is just open source with extra steps", "CC0 and patents", "the AI-authored work may not be copyrightable", "cost transparency leaks competitive information", and "the pirate branding is confusing." Read the matching RFCs and answer in your own words.
- Expect questions about the Jefferson and Wozniak quotes. Know the context: the Jefferson letter is about ideas and inventions, and Wozniak's line is recounted by Levy in 2014, not a 1984 transcript.
- Be present for the hours after posting. Disclose that AI helped build the project, and answer in your own voice.

**Do not:** use scripted comments, coordinate votes, post from several accounts, or reuse marketing copy.

---

## (g) "What Would Make This Fail?" invitation text

Use as the pinned Discussion in that category and as the repository's issue-template introduction.

> **What would make this fail?**
>
> A charter that cannot survive criticism cannot call itself free. This one is a draft, built with the help of AI, and we expect it has mistakes: legal ones, technical ones, economic ones and plain wrong assumptions.
>
> Tell us where it breaks. A good failure report has a concrete scenario or evidence, names the principle it challenges, suggests how we could test or mitigate it, and says what would change your mind. Partial and uncertain reports are welcome.
>
> Some places to start: Could a stranger really reproduce this? Could a billing transparency page expose people it shouldn't? Does "your data is yours" survive shared records, key loss and replication? Does putting a dollar value on attention help the people it's meant to protect, or harm them? Is the pirate flag a barrier?
>
> We will publish the objections alongside our answers, including the ones we can't answer yet. Good-faith dissent is welcome. No harassment, no private data, no fabricated evidence.
>
> *Written by Claude, an AI model, and reviewed by a human maintainer.*

---

## (h) Nonprogrammer contribution routes

Each route should have a labelled issue or Discussions thread and a short "start here" paragraph on the participation page. None require code, permission or payment.

| Route | What you would do | Good first task | Output |
|---|---|---|---|
| Translation | Translate the one-page charter and participation page; flag phrases that don't carry across cultures ("pirate", "free as in beer"). | Translate the short explanation into your language, and note terms you had to change. | A pull request, or a Discussion comment if you prefer not to use Git. |
| Proofreading and plain language | Read the charter and standard for errors, overclaims, unclear sentences and accessibility problems. | Mark any sentence that reads as a promise the project cannot keep. | Suggested edits or a list of quotes with comments. |
| Cost research | Find real, current prices and billing-API behaviour for hosting and domain providers; check that published cost claims match provider documentation. | Verify one cost figure on the cost page against a provider's public pricing and report the date you checked. | A sourced note with links and dates. |
| Legal critique | Review the CC0, patent, trademark, contribution and data-rights questions (RFC 1 and 2). This is critique, not legal advice for the project. | Pick one claim in the charter's legal drafting note and explain how it fails in your jurisdiction. | A public comment on the relevant RFC. |
| Challenge testing | Follow the build or "Could your software survive without you?" steps as written and report where you got stuck. | Run the first step from the challenge and record the result. | An "I attempted the challenge" report with blockers. |
| Accessibility and usability | Test the website with assistive technology, and review wording for people who are not developers. | Navigate the site by keyboard and report problems. | An issue with steps to reproduce. |

---

## (i) Quote cards (text specs)

Two cards. Design direction: restrained, readable; old proclamation or woodcut styling is optional. Rights check: use only graphic assets the project can redistribute, and confirm the rights to any image before use. Keep the quotations as they appear here.

### Card 1: Thomas Jefferson

- **Quote (exact):** “He who receives an idea from me, receives instruction himself without lessening mine.”
- **Attribution (exact):** Thomas Jefferson to Isaac McPherson, August 13, 1813.
- **Source URL:** https://tjrs.monticello.org/letter/293
- **Footer line (small text):** Spelling and punctuation normalized; see the source for the original text.
- **Alt text:** Quote card with the words "He who receives an idea from me, receives instruction himself without lessening mine." attributed to Thomas Jefferson in a letter to Isaac McPherson, August 13, 1813.
- **Caption note (for the post, not the card):** The letter mainly concerns inventions and patents. Do not present it as Jefferson opposing every form of copyright or patent.

### Card 2: Steve Wozniak

- **Quote (exact):** “Information should be free but your time should not.”
- **Attribution (exact):** Wozniak replying to Stewart Brand at the 1984 Hackers Conference, as recounted by Steven Levy, WIRED, November 21, 2014.
- **Source URL:** https://www.wired.com/story/hackers-at-30-hackers-and-information-wants-to-be-free/
- **Footer line (small text):** As recounted by Steven Levy in 2014; not a transcript of the 1984 conference.
- **Alt text:** Quote card with the words "Information should be free but your time should not." attributed to Steve Wozniak, replying to Stewart Brand at the 1984 Hackers Conference, as recounted by Steven Levy in WIRED, November 21, 2014.
- **Caption note (for the post, not the card):** Never describe this as a 1984 transcript or a recorded speech.

Optional closing card (no attribution needed because it is the project's own line): "You can't pirate what belongs to everyone."

---

## (j) Media kit list

Everything in the media kit should be freely reusable where the project holds the rights, with editable source files, alt text and the text prompts used for any AI-generated image. Do not include images whose rights are not confirmed. Links to predecessors come from [`../SOURCES.md`](../SOURCES.md); listing them is credit, not a claim of affiliation or endorsement.

**Project items (create or verify before listing publicly)**

- One-page charter (Markdown is canonical)
- 30-second and 5-second explanations
- The two quote cards above, with alt text and source links
- Short "Could your software survive without you?" challenge explainer
- Editable 2-minute talk outline and slide deck
- Disclosure statement: human and ChatGPT origin conversation; Claude-led build; human accountable for publication
- Logo or flag graphics, only after naming and rights clearance (open decision)

**Predecessors and related work**

| Name | Link |
|---|---|
| GNU Manifesto (GNU/FSF) | https://www.gnu.org/gnu/manifesto.html |
| FSF explanation of free software | https://www.gnu.org/philosophy/free-sw.html |
| SQLite copyright and public domain | https://www.sqlite.org/copyright.html |
| Ghost | https://ghost.org/ |
| Creative Commons public-domain tools | https://creativecommons.org/public-domain/ |
| GitHub Spec Kit | https://github.github.com/spec-kit/ |
| OpenCost | https://opencost.io/ |
| FOCUS 1.4 specification | https://focus.finops.org/docs/specification/v1-4/ |
| AT Protocol overview | https://atproto.com/guides/overview |
| Open Source Definition | https://opensource.org/osd |
| Open Source Maintenance Fee | https://opensourcemaintenancefee.org/ |

**Standard wording for press or community readers:** "Free. Libre. Truly Free." is a draft charter and proposed conformance standard (JRCv1), not a licence, a certification or a finished product. The idea came from a conversation between a human and ChatGPT and the repository was built by Claude, an AI model, with a human accountable for publication.
