# Website Specification: Jolly Roger Charter (working title)

## Purpose and positioning

A public-facing home for the **Truly Free** software-freedom philosophy, the draft **JRCv1** charter, open community debate and reproducible development record. The site must be useful even if its original human initiator and AI vendors disappear.

**Editorial voice:** revolutionary about principles, precise about claims, humble about history. No invented novelty, members, prices, success stories or third-party endorsements. The pirate motif evokes freely licensed copying, not unauthorized infringement.

**Hero proposed copy:**

> Free. Libre. Truly Free.
>
> You can't pirate what belongs to everyone.
>
> The software is free. The process is open. The costs are visible. Your data remains under your control. Anyone can carry the work forward.

Three calls-to-action: **Read the Charter**, **Take the Challenge**, **Challenge Our Ideas**. Display conspicuous honest attribution to both human and AI collaborators above the footer, not buried in legal fine print.

## Pages and content hierarchy

| Route | Primary content | Main action |
|---|---|---|
| `/` | Manifesto summary, six freedoms, historical hook, pilot status, AI provenance | Read charter |
| `/manifesto/` | Full `MANIFESTO.md` rendered faithfully; downloadable plain Markdown | Fork or share |
| `/charter/` | Draft JRCv1 requirements, version, adoption limits, open questions | Submit RFC |
| `/challenge/` | Reproduction/independence checklist and reporting template | Run challenge |
| `/debate/` | Contradictions, devil's advocate questions, public discussions, participation norms | Open discussion |
| `/how-it-was-made/` | Agent involvement, prompts, tools, changelog, reproducible build, contributions | Audit the process |
| `/conversation/` | Human-reviewed public transcript if provided; otherwise explicit pending/curated summary | Read sources |
| `/provenance/` | Proof-of-origin history: published digest, ChatGPT snapshot (if reviewed), actual OpenTimestamps status/proofs, human-reviewed redactions and verification procedure | Independently verify |
| `/costs/` | Expense ledger, provenance, billed/estimated/noncash separation, timestamp | Propose savings |
| `/history/` | Jefferson and Wozniak sources, GNU/FSF, SQLite and other related projects, properly credited | Explore sources |
| `/quartermaster/` | Planned billing normalization/reference product, architecture, unresolved RFCs | Contribute design |
| `/adopt/` | Honest self-assessment, adoption checklist and template, not a purchased mark | Raise the Flag |
| `/governance/` | Public RFC process, challenge channel, maintainer/succession rules | Participate |

## Design/engineering requirements

- Eleventy static site (modern stable version; pin and lock) and semantic templates. Generate from committed Markdown so repo and web do not diverge.
- Static public output (`_site/`) with reproducible `npm ci && npm run build`; no server or build dependence on private integrations.
- Cloudflare Pages Free candidate, with no-cost temporary subdomain if domain pending; document GitHub Pages/self-host deploy alternative.
- Mobile-first, readable line lengths, high contrast, focus states, keyboard navigation, semantic landmarks, light first (optional dark), reduced motion, SVG artwork with documented rights.
- Source links and historical attribution must be accurate. Quotes should be limited to brief excerpts and linked to originals.
- RSS/Atom feed, sitemap.xml, robots.txt, social metadata, Git commit/link provenance; no cookie banner unless cookies actually require consent. Do not add invasive trackers.
- No fake dynamic dashboards: costs either sourced/dated real entries or clearly labeled placeholders. Proposed live API features must say **not yet implemented**.
- Community discussion links may point to GitHub Discussions initially; users need not create a new account merely to *read* the charter.
- Version route or content marker for JRCv1 status, timestamps and changelog.
- Document how to regenerate pages and previews, broken-link and accessibility checks, rollback, security policy, source attribution and contributor entry point.

## Content safety and publication rules

- Only publish the founding session after exact public edition is human-approved, with redactions noted. `FOUNDING-ARCHIVE.md` is a curated consolidation, not the full unedited session.
- Disclose: original ideation involved a human user and OpenAI's ChatGPT; implementation involved Claude from Anthropic, with actual versions only when known. No endorsement implied.
- Secrets, user metadata, private chat history unrelated to this movement, financial account data and unpatched vulnerabilities stay out.
- Domain/brand status must reflect verified actual registration and clearance, not guesses.
- All operational costs must distinguish paid invoices, projected cost, donated labor and user attention burden.

## Quality gate

A nonauthor contributor should be able to clone the repository, build the site offline after dependency install, read everything in plain text, and publish an equivalent static site on a different provider without needing the founder.

## Provenance page requirements

Pull its content from actual `provenance/` artifacts and a checked release manifest. A `not requested`, `pending`, or `verified` state must be truthful and visible. The public site should present the precise file/version/hash, link to `provenance/VERIFY.md`, and explain that a Bitcoin timestamp verifies existence no later than that time, **not authorship, originality, dialogue chronology or OpenAI certification**. Do not display demo hashes, example manifests, or a fake blockchain timestamp as production evidence. The authentic transcript remains gated on an exact human-reviewed public edition, not just the presence of the exported ChatGPT account ZIP.
