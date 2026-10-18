# Launch Implementation Plan — Claude session, 2026-10-17 (America/New_York)

Executor: Claude Opus 5.5 (`claude-opus-5-5`) in Claude Code, directed by the human initiator.
Source of truth: the founding package `Jolly_Roger_Claude_Launch_Package.zip` (SHA-256 `f7272299…54eb`), committed verbatim on `main` as `e59cf86`. Work proceeds on `feat/launch-site`.

## What this session can and cannot do

Local, reversible work is in scope: repository, Eleventy site, tests, provenance digests, docs, commits.
Everything outward-facing is gated on the human: GitHub org creation (UI-only, MFA), any `git push`, domain purchase, Cloudflare Pages connection/deploy, OpenTimestamps submission, social posts, Discussions/RFC creation on GitHub, licence choice.

## Exploration findings (2026-10-18T03:34Z)

- GitHub `users/{name}` API returns 404 for all five candidate names. Not proof of registrability (reserved/suspended names also 404). Must be confirmed in the org-creation UI.
- PIR RDAP returns 404 for all five candidate `.org` domains (control `wikipedia.org` → 200). Suggests unregistered; registrar price/availability still unverified.
- Eleventy latest is 3.1.7 (published 2026-10-15, 2 days old); pin 3.1.6 (2026-06-02) to avoid an unsoaked release.
- No OpenTimestamps client installed; none will be installed or used without approval.
- Package scan: no emails, tokens, keys, phone numbers or local paths. The human initiator is never named in the package; the site keeps that. Repo-local git email set to the GitHub noreply address so a push won't expose the personal address.

## Architecture

- Repo root = the `charter` repository. Founding Markdown stays canonical and untouched at its existing paths.
- `site/` = Eleventy input. Pages render root Markdown through a `doc` shortcode so web and repo cannot diverge; relative `.md` links rewrite to the GitHub source URL.
- `site/_data/` reads `provenance/launch-manifest.json` and `launch/costs.json` — the only data the provenance and costs pages display.
- System font stack, no JS required, no trackers, no cookies. Original SVG flag art (CC0-intent pending licence decision).
- Outputs: all routes in `website/SITE-SPEC.md`, plus `feed.xml` (Atom), `sitemap.xml`, `robots.txt`, `404.html`.

## Steps

1. `scripts/hash-manifest.mjs` → `provenance/launch-manifest.json`: SHA-256 + byte length of the received zip and each founding file; `timestamp_state: "not-requested"`.
2. Eleventy scaffold (`package.json`, lockfile, `eleventy.config.js`), layouts, CSS, SVG.
3. Pages per route map; conversation page uses the CONVERSATION-PUBLICATION placeholder verbatim.
4. `npm test` (node:test against `_site/`): every route present; internal links resolve; founding lines verbatim; Jefferson/Wozniak quotes carry their source URLs; AI disclosure on every page; a11y smoke (lang, one h1, skip link, img alt, landmarks); no forbidden claims ("verified" timestamp, "OSI-approved", "registered"); secret/PII regex scan over repo + `_site`; manifest digests match files on disk.
5. CI workflow (`npm ci`, build, test) — runs only once the human pushes.
6. Docs: `DEPLOYMENT.md`, `OPEN-DEPENDENCIES.md`, `CHANGELOG.md`, `transparency/agent-runs/2026-10-17-launch.md`, update `transparency/AI-CONTRIBUTIONS.md`, `launch/LAUNCH-STATUS.md`, `launch/OPERATIONS-LEDGER.md`, `launch/RFC-SEEDS.md`, `launch/CONTENT-DRAFTS.md` (30-day calendar, channel drafts for human posting), `launch/FOUNDER-ABSENCE-TEST.md`.
7. Founder-absence dry run: fresh `git clone` of the local repo into scratch, `npm ci && npm run build && npm test`.
8. Commit in logical units on `feat/launch-site`. No push.

## Acceptance

Clean-clone build and tests pass; every status claim on the site traces to a file in the repo; nothing claims a registration, deployment, timestamp or transcript that doesn't exist.

## Decisions reserved for the human (collected, not blocking local work)

See `launch/LAUNCH-STATUS.md` → "Needs the human".
