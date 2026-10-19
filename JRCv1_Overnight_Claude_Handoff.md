# JRCv1: Overnight Build Handoff for Claude Code

> **Historical record.** The founding-provenance parts of this document (transcript publication, founding timestamps, provenance pages, AI-authorship disclosure) were retired on 2026-10-19 and are not current instructions. See `DECISIONS-AND-QUESTIONS.md`.

## Mission

Continue the existing, publicly launched Jolly Roger Charter project at **https://github.com/jollyrogercharter/charter** and **https://jollyrogercharter.org**. This is a build assignment, not a planning-only assignment. The live site already exists. Create the first practical tools that make the charter independently usable, honest, reproducible and open to debate.

**One-line goal:** By the end of this session, an unrelated developer should be able to run a local JRCv1 assessment against a repository, publish a truthful machine-readable report, and attempt the Jolly Roger Challenge without asking our permission.

This work is AI-led. Disclose Claude's substantive contribution in the repo and PRs. The movement's core promises are Free. Libre. Truly Free.; user-controlled data; AT Protocol as a core architectural direction; reproducible development; open economics and human attention accounting; open governance; and replaceable stewardship.

## Start by reading the actual live state

1. Clone or `git pull` `jollyrogercharter/charter`. Inspect all open and merged PRs, CI status, current domain, `README.md`, `AGENTS.md`, `MANIFESTO.md`, `CHARTER.md`, `DECISIONS-AND-QUESTIONS.md`, `standard/`, `community/THE-CHALLENGE.md`, `launch/LAUNCH-STATUS.md`, `OPEN-DEPENDENCIES.md`, `provenance/`, `website/`, `site/`, `product/QUARTERMASTER.md`, `test/`, and `launch/RFC-SEEDS.md`.
2. Confirm, rather than assume, the current statuses. The repository already records an Eleventy site deployed via Cloudflare Pages, CC0 dedication, domain purchase and three merged PRs. OpenTimestamps for launch digests has been submitted but was pending verification when last inspected. A reviewed founding-chat export has NOT been supplied. GitHub Discussions may be enabled, but verify before changing the site.
3. Run `npm ci && npm test`, verify the build works cleanly, check `npm audit` and assess dependencies without blindly upgrading or breaking builds.
4. Write `plan-overnight.md` with current state, work breakdown, acceptance tests, constraints, deviations and links to each PR. Update it as you execute.

## Priority A: Truthfulness and operational hardening

- Resolve contradictions between the live site's status claims and verified repo state. In particular, inspect the stale `README.md`, `launch/LAUNCH-STATUS.md`, `site/index.njk`, `site/debate.njk`, `provenance/README.md`, `transparency/AI-CONTRIBUTIONS.md`, and `OPEN-DEPENDENCIES.md`. Preserve founding historical documents, but mark historical snapshots rather than silently rewriting them.
- Make public status pages derive facts from one machine-readable source where practical. Separate `implemented`, `pending`, `blocked`, and `historical` claims. Never claim a transcript, proof, certificate, or independent reproduction that doesn't exist.
- Verify GitHub Discussions, branch protections, CI, favicon, canonical URL, HTTPS redirects, SEO basics, RSS, accessibility and mobile navigation. Report verified findings. Create issues or draft PRs for admin-only items that need human action; do not change org ownership/security policy or domain billing while the human sleeps.
- OpenTimestamps: if proof materials already exist, perform a safe attempt at `ots upgrade` and `ots verify`; record exact result and method. If still pending, retain that status. Do not backdate or misstate authorship.

## Priority B: Build the first usable JRCv1 tool

Build an **evidence-oriented, offline-first conformance CLI**, working name `jrc-check`, in this repository. No requirement for GitHub API authentication, paid infrastructure, AI provider, or network connectivity for its core local commands. Keep dependencies minimal and sources portable.

Deliverables:

1. Versioned draft machine-readable `jrc.json` specification and JSON Schema for the six pillars: code/rights, reproducible development, user data/AT Protocol, operations and resiliency, economics including human attention, and governance. Include the standard version, project identity, evidence files/URLs, status, evaluator and dates when known, and explicit gaps/limitations. Do not require AT Protocol on a plain static site with no user-data records; report applicability with reasons rather than invent implementation.
2. `jrc init`: create an editable starter manifest without overwriting existing work.
3. `jrc check`: validate schema and verifiable local evidence paths; distinguish missing evidence, self-attestation, and independent reproduction. Never call a project "certified" based on filenames or assertions. Exit nonzero on malformed inputs and materially invalid references, not merely because a project is incomplete.
4. `jrc report`: emit a reproducible JSON assessment and useful human-readable Markdown showing six pillar progress, gaps and evidence. Make a neutral, optional badge that explicitly reads **self-reported** and links to the actual report/version. No centralized authority, login or required branding.
5. `jrc challenge`: print/export the reproducible challenge steps and an editable evidence log, including blockers and procedures for clean builds, alternate deployment, cost calculation, data export when applicable, and founder absence. Incomplete attempts are valid reports.
6. Fixtures and automated tests for valid, partially complete, malformed, misleading and privacy-sensitive reports. Test a fresh clone on supported Node versions. Provide shell examples and verify commands from a clean environment.
7. Generate an honest self-assessment for the Charter repository. Mark truly independent reproduction as NOT YET VERIFIED. Do not fabricate adopters, measurements, reviewers or success.

Make the tool useful even before the entire future standard is settled. Mark schema and CLI `0.x draft`, keep extensibility, and publish an RFC for contentious details rather than declaring governance settled.

## Priority C: Make participation exceptionally easy

- Add a clear site route such as `/check/` or `/get-started/` with copyable CLI commands, a 5-minute quickstart, an example partial assessment, and links to a canonical source file. Keep Eleventy static. Do not introduce trackers, analytics cookies, opaque SaaS or a React app without demonstrated need.
- Add a minimal, accessible project-level "Raise the Flag" page describing what the report means and does **not** mean. Don't advertise independent certification or grant permissions not supported by existing licenses.
- Refine the challenge page so an unrelated developer can attempt it without contacting the founder. Include a downloadable or copyable report template, and a low-friction path for filing failures.
- Draft, but do not autonomously publish, substantive debate topics: `What Would Make This Fail?`, `RFC: What is an hour of human attention worth?`, and `RFC: When is data sovereignty meaningfully proven?`. Build on existing `launch/RFC-SEEDS.md` and link to the live discussion venue only after verifying it.

## Priority D: Quartermaster foundation only after A-C are working

Do **not** attempt an enormous multi-provider SaaS app overnight. Instead deliver a small testable component:

- `quartermaster` draft versioned expense schema that separates cash invoices, forecasts, reserves, donated labor, and user attention burdens. Document currency, period, freshness, attribution, source and privacy classification.
- A standalone importer/validator for sanitized JSON or CSV data with one *real* adapter only if documented public credentials-free sample data is available. Do not invent provider API outputs or accept production billing secrets.
- Update the existing public cost page to consume a validated, published, redacted cost snapshot. Avoid pushing sensitive invoices and secrets.
- A reproducible "propose a saving" PR template with cost assumptions, risks, performance/security tests and post-change reconciliation. Do not auto-deploy infrastructure changes.
- If scope/time becomes a problem, stop after a usable conformance CLI with tests and leave Quartermaster as a well-specified issue or draft PR. Working software beats scaffolding theater.

## Priority E: Marketing-ready artifacts, NOT auto-posting

Create a reviewable, source-linked human launch briefing: a concise technical article, a candid LinkedIn post, a Bluesky thread, and a Hacker News-friendly description suited for later manual submission. No paid ads, fake testimonials, bot engagement, mass posting, coordinated votes, or invented adoption statistics. Retain sourced Jefferson and Wozniak quotes with correct attribution. Prioritize the actual reproducible tool and challenge as the news, not claims that we invented freedom. Do not publish externally while the human is asleep.

## Mandatory constraints

- **Use draft PRs:** Develop on focused branches; push only reversible, reviewable code and open draft PRs, preferably one for status/hardening and one for the developer tool. Do not merge or push directly to `main`. The existing deployment auto-publishes after merges.
- **Do not wake or block on approvals:** No purchases, new external accounts, API credentials, DNS changes, billing activation, security-policy changes, publication of the ChatGPT source export, uploading private conversation text, social posts, or merging. Prepare work and mark approvals as pending.
- **Transparency:** Record agent and human roles, prompts or a faithfully summarized execution log with access to non-sensitive sources, models/versions only if known, decisions, tests, failures, corrective work, limitations and estimated/actual costs separately. Never pretend hidden/private chain-of-thought is available for publication.
- **Legal accuracy:** CC0 is the published dedication for eligible original code; JRCv1 is a draft conformance charter, not an OSI-approved new software license. Preserve third-party notices and document any new dependency licenses.
- **Privacy and security:** No raw account exports, private emails, personal names, token values, customer data, billing account identifiers or actionable vulnerabilities in commits, public logs or reports. Protect user privacy and rights. Published AT Protocol data is not inherently private.
- **Truthfulness:** Distinguish self-assessment from independent verification and pending OpenTimestamps evidence from completed Bitcoin attestation. Never claim new external deployment, adoption or conformance absent evidence.
- **No unbounded loops:** Make bounded test and review attempts, then record blockers. Don't invent successes. Reuse existing architecture.

## Acceptance tests and wake-up report

Before stopping, run CI-equivalent checks and at least one clean-clone end-to-end CLI demonstration. Show the exact commands, exit codes, generated artifacts and true status of all proof claims. The site should build with zero credentials. All new links should work, and accessibility smoke checks should pass. Ensure no secrets appear in diffs or agent logs.

End with a concise morning report (and save it as `launch/OVERNIGHT-REPORT.md` on your working branch):

1. What shipped as working code, with live branch and draft-PR URLs.
2. What tests passed and what still fails.
3. How to try the new CLI in five minutes.
4. Verified public state, exact timestamp proof state, what still depends on the founder.
5. Approvals needed from the human, clearly prioritized.
6. Ideas deliberately deferred, with issues or structured design notes.
7. Transparent AI contribution and cost summary, using unknown rather than guessing.

The launch was co-developed through a human + OpenAI ChatGPT conversation and then built with Claude. Credit this faithfully without claiming endorsement. Be ambitious, prioritize actual working code, and leave the movement more independently reproducible than you found it.
