# Jolly Roger Charter

> **Free. Libre. Truly Free.**
> **Free the code. Reward the stewards. Give people their time back.**

> **Current status lives in [`launch/status.json`](launch/status.json)** (rendered at https://jollyrogercharter.org/status/). Status lines below marked *as of 2026-10-17* are historical: they were true when the founding package was written and are kept unchanged as a record.

Jolly Roger is a movement to change how people earn a living from software, now that AI makes software easier and easier to create. It rests on three ideas:

- **Software should be free.** Anyone may use, copy, modify, share, sell and build on it, and its future shouldn't depend on whoever wrote it first. You can't pirate what belongs to everyone.
- **Stewardship should be rewarded.** People should earn a good, potentially substantial living by keeping software reliable, secure and supported and by taking responsibility for it. Not by billing hours, locking up code or trapping customers. We're not against profit. We're against manufacturing dependence to extract it.
- **Human attention is precious.** Software should give people their time back, not track them, sell their focus or keep them hooked.

## Start here

- **[The Manifesto](MANIFESTO.md):** what we believe, on one page.
- **[The Charter](CHARTER.md):** what it means in practice. Seven voluntary commitments, with the detailed JRCv1 standard underneath for anyone who wants to check a project closely.
- **[The Projects](PROJECTS.md):** how we experiment with the ideas. Every tool is optional.
- **[The Open Stewardship Economy](STEWARDSHIP-ECONOMY.md):** how someone could earn a living from free software, and how to measure the attention it saves.
- **[The Stewardship Pilot](STEWARDSHIP-PILOT.md):** a small real-world test of whether that works.

## What's real and what isn't

**Built and working in this repository:** this website, a CC0 public-domain dedication, an offline conformance tool (`jrc`), a cost-ledger format with a validator, and read-only interfaces for AI agents. The [status file](launch/status.json) says which of these are live at https://jollyrogercharter.org and which are still on draft branches.

**Not yet:** any evidence that the economic model works (the pilot hasn't started), anyone outside the project reproducing it, or legal review of the CC0 dedication. The 2026-10-19 reorientation is the founder's proposal, open for debate in [an RFC](launch/RFC-STEWARDSHIP-ECONOMY.md), not community consensus.

## Take part

Read the manifesto and tell us where it's wrong. Propose changes through a [Charter RFC](https://github.com/jollyrogercharter/charter/issues/new?template=charter-rfc.md) or [GitHub Discussions](https://github.com/jollyrogercharter/charter/discussions). If you'd like to be a pilot steward or a pilot customer, say so in Discussions. To test whether a project can survive without its creator, take [the Challenge](community/THE-CHALLENGE.md): *Could your software survive without you?*

## Important limits

- This is not legal advice. Do **not** publish a final `LICENSE` claiming CC0 until rights in all included material are reviewed.
- User control of data cannot be created by a copyright waiver. It needs product architecture, consent, service terms and applicable legal safeguards.
- Public AT Protocol repositories can be replicated; private records need separate protections. Spaces was alpha as of October 17, 2026.
- Publicly documenting development does not mean publishing secrets, user information, third-party licensed material or actionable vulnerabilities.
- A cost-based stewardship pledge is voluntary for adopters, not a restriction attached to free code.
- *As of 2026-10-17 (historical):* merely drafting documents here had **not** created a public Git repository, registered an organization or deployed any service. All three have since happened; see `launch/status.json`.

## The projects

Details for each tool. [PROJECTS.md](PROJECTS.md) explains how they serve the three ideas.

### Check a project against JRCv1 (`jrc`, 0.1 draft)

`jrc` is an offline command-line tool in this repository, with no dependencies and CC0. It checks a project's `jrc.json` self-assessment against the six pillars and writes a reproducible report. It never fetches URLs, runs manifest commands, or says "certified".

```bash
npx --yes --package=github:jollyrogercharter/charter jrc init     # starter jrc.json, never overwrites
npx --yes --package=github:jollyrogercharter/charter jrc check    # exit 0 valid · 1 invalid · 2 usage
npx --yes --package=github:jollyrogercharter/charter jrc report --out jrc-report
```

Spec: [`spec/JRC-MANIFEST.md`](spec/JRC-MANIFEST.md) · Schema: [`spec/jrc-0.1.schema.json`](spec/jrc-0.1.schema.json) · This repository's own assessment: [`jrc.json`](jrc.json), rendered at https://jollyrogercharter.org/check/.

### Adopt JRCv1: assess a repository

At https://jollyrogercharter.org/adopt/ (or `jrc assess`), point the tool at a public GitHub repository. Each pillar comes back as evidenced, partially evidenced, missing, not applicable or unknown, with the reason and evidence links at the exact commit. You also get an ordered roadmap and files to review: a candidate `jrc.json`, a checklist, a new-files patch, a PR description and a challenge log. Nothing is published for you. Every assessment can be reproduced offline from its saved snapshot.

```bash
npx --yes --package=github:jollyrogercharter/charter jrc assess https://github.com/OWNER/REPO --out jrc-adopt
npx --yes --package=github:jollyrogercharter/charter jrc assess --snapshot jrc-adopt/jrc-snapshot.json   # reproduce
```

How it works, its limits and how to reproduce the demo: [`docs/ADOPT.md`](docs/ADOPT.md).

### For AI agents (WebMCP)

Twenty-four read-only and prepare-only capabilities are available to any agent through a local MCP server (`node bin/jrc-mcp.mjs`), the CLI (`jrc tool NAME`), WebMCP in the browser, and static JSON under `/api/v1/`. Nothing posts, publishes or signs in. See [`docs/AGENT-INTEROP.md`](docs/AGENT-INTEROP.md), [`docs/WEBMCP.md`](docs/WEBMCP.md) and https://jollyrogercharter.org/agents/.

### Website and launch state

The static website in `site/` is generated from these Markdown files: `npm ci && npm test` builds it into `_site/` and checks it. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for hosting anywhere, [`launch/LAUNCH-STATUS.md`](launch/LAUNCH-STATUS.md) for what is and isn't live, [`OPEN-DEPENDENCIES.md`](OPEN-DEPENDENCIES.md) for what still depends on the founder, and [`CHANGELOG.md`](CHANGELOG.md) for history.

## Founding archive (October 17, 2026)

What follows was written when the project was founded and is kept as a record. The six commitments and working identities below are now organized as the manifesto, charter and projects described above.

**Status:** working founding archive, not a published standard, adopted license, launched product, or verified organization.  
**Captured:** October 17, 2026; launch-handoff materials added afterward.  
**Working identities:** Jolly Roger (movement / emblem), The Pirate Charter (manifesto), Truly Free (philosophy), Open Stewardship Standard (possible neutral specification), Quartermaster (possible reference application). Names are **not cleared** for use.

> **Free. Libre. Truly Free.**  
> **You can't pirate what belongs to everyone.**  
> **Could your software survive without you?**

### Essential premise

As agents make software cheaper to build, a software provider's durable value shifts from controlling the code toward **stewardship**: maintaining, securing, deploying, hosting, improving and supporting it. A genuinely independent application lets another person reproduce the product, understand its development, see its operating economics, migrate user-controlled data and continue service without the original creator.

**Founding line (retain verbatim):**

> If we can explain how to build it, we should explain how to run it. If we can explain how to run it, we should explain what it costs. And if someone can make it better or cheaper, they should be free to try.

**Six proposed commitments:**

1. Free creation and reproduction, including commercial copying and resale.
2. Open, reproducible, agent-native development and deployment.
3. User-controlled, portable data and identity with AT Protocol at the core.
4. Replaceable, competitively supplied stewardship.
5. Quantifiable, transparent, privacy-safe operating economics.
6. Open improvement, governance, debate and infrastructure optimization.

The **freedom to continue** unifies them: the project must remain useful when the creator, host, maintainer, AI vendor or financial sponsor disappears.

### Documents

- [standard/HUMAN-ATTENTION.md](standard/HUMAN-ATTENTION.md) — new proposal: openly governed valuation of paid, donated and user attention costs, separately from provider bills.

- [MANIFESTO.md](MANIFESTO.md) — the one-page manifesto (v0.2, proposed 2026-10-19). Until then this entry read "long-form philosophical draft"; that draft is preserved at [history/MANIFESTO-v0.1-2026-10-17.md](history/MANIFESTO-v0.1-2026-10-17.md).
- [CHARTER.md](CHARTER.md) — charter principles and boundaries.
- [standard/CONFORMANCE.md](standard/CONFORMANCE.md) — evidence-based adoption and conformity.
- [standard/DATA-SOVEREIGNTY.md](standard/DATA-SOVEREIGNTY.md) — AT Protocol, portability, permissions, privacy.
- [standard/AGENTIC-REPRODUCIBILITY.md](standard/AGENTIC-REPRODUCIBILITY.md) — transparency of agentic work and release process.
- [standard/OPEN-ECONOMICS.md](standard/OPEN-ECONOMICS.md) — live billing, accounting, infrastructure proposals.
- [community/GOVERNANCE-AND-DEBATE.md](community/GOVERNANCE-AND-DEBATE.md) — open criticism, distributed maintenance, succession.
- [community/THE-CHALLENGE.md](community/THE-CHALLENGE.md) — **Could your software survive without you?**
- [strategy/ORGANIC-LAUNCH.md](strategy/ORGANIC-LAUNCH.md) — zero-paid-media distribution and early roadmap.
- [strategy/MESSAGING-AND-HISTORY.md](strategy/MESSAGING-AND-HISTORY.md) — narrative, historical sources, verified quotes.
- [product/QUARTERMASTER.md](product/QUARTERMASTER.md) — proposed first cost-transparency product.
- [research/PRECEDENTS.md](research/PRECEDENTS.md) — earlier movements and originality limits.
- [legal/LICENSE-AND-RISK.md](legal/LICENSE-AND-RISK.md) — public-domain, ownership, privacy and patent constraints.
- [DECISIONS-AND-QUESTIONS.md](DECISIONS-AND-QUESTIONS.md) — agreed preferences vs. open design choices.
- [AGENTS.md](AGENTS.md) — how agents and humans should continue working on the charter.
- [templates/open-infrastructure.example.yaml](templates/open-infrastructure.example.yaml) — **illustrative** cost and infra record, not a working integration.
- [SOURCES.md](SOURCES.md) — verified links and context.

### Intellectual humility

No claim of inventing free software, public-domain dedication, paid support, agentic development, or cost management. The potentially distinctive contribution is the **combination**, made independently verifiable. No exhaustive worldwide novelty search has established firstness.
