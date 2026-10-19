# Deployment

**Current state (2026-10-18):** not deployed anywhere. Nothing below has been run against a live host yet; `launch/LAUNCH-STATUS.md` records when that changes.

The site is plain static files. Any host that serves a directory works, and no step needs a secret, an API key or an account other than the host's own.

## Build locally

```bash
git clone https://github.com/jollyrogercharter/charter.git
cd charter
npm ci            # Node 20+; exact versions come from package-lock.json
npm test          # builds _site/ and runs the checks in test/
```

Clone with full history: the provenance tests re-hash files at the preservation commit and are skipped in a shallow clone (`--depth 1`, or CI's default `fetch-depth: 1`).

`npm run build` alone produces `_site/`. `npm run serve` gives a local preview on http://localhost:8080.

Two environment variables change output, both optional:

| Variable | Default | Effect |
|---|---|---|
| `SITE_URL` | `https://jollyrogercharter.org` | Canonical URLs, feed and sitemap. Set it when deploying to a temporary or alternative address. |
| `REPO_URL` | `https://github.com/jollyrogercharter/charter` | Source, issue and commit links. Set it for a fork or if the org name changes. |

## Option A: Cloudflare Pages (candidate primary host, free plan)

Human steps, done in the Cloudflare dashboard by the account owner:

1. Workers & Pages → Create → Pages → Connect to Git → select the `charter` repository.
2. Build command `npm ci && npm run build`; output directory `_site`; environment variables `NODE_VERSION=22`, `SITE_URL=https://<project>.pages.dev` until the domain exists.
3. Leave Web Analytics off. The charter forbids forced tracking.
4. Production branch `main`; preview deployments on pull requests are fine.

Pages serves `_site/404.html` automatically for unknown paths.

## Option B: GitHub Pages

Settings → Pages → Source: GitHub Actions, then add a workflow that runs `npm ci && npm test` and uploads `_site` with `actions/upload-pages-artifact` + `actions/deploy-pages`. The site must be served from a domain root: its scripts import modules by absolute path (`/assets/…`, `/js/lib/…`), so a project path such as `<org>.github.io/charter/` breaks the interactive parts, and Eleventy's `pathPrefix` doesn't rewrite those imports. Use a custom domain or a user/organisation site (`<org>.github.io`) and set `SITE_URL` to it.

## Option C: anything else

```bash
SITE_URL=https://example.net npm run build
rsync -a --delete _site/ user@host:/var/www/charter/   # or upload _site/ via any static host UI
```

Netlify, Vercel static, S3 + CloudFront, a Raspberry Pi with Caddy: all equivalent. Configure the server to return `/404.html` for missing paths.

## Verify a deploy

```bash
curl -sI https://<host>/ | head -1                 # 200
curl -s https://<host>/provenance/launch-manifest.json | shasum -a 256
shasum -a 256 provenance/launch-manifest.json      # must match
```

CI uploads `_site` plus `site-checksums.txt` as an artifact for each run, so a deployed file can be compared against the build that produced it.

## Rollback

Every deploy is a commit on `main`. Roll back by reverting the commit (`git revert <sha>` and push) or, on Cloudflare Pages, by promoting the previous deployment in the dashboard. No database or state exists to restore.

## Dependency hygiene

Eleventy is pinned to 3.1.6. `npm audit` reports build-time DoS advisories in transitive `braces` and `sprintf-js`, fixed by Eleventy 3.1.7 (published 2026-10-15). They only affect parsing of our own committed content. Upgrade once 3.1.7 has a couple of weeks of soak (target: on or after 2026-10-29), then rerun `npm test`.

## Forks and mirrors

Set `REPO_URL` (your repository's https URL) and `SITE_URL` at build time. Every link the tools and pages generate (issue drafts, opportunities, source references, reproduce commands) then points at your copy instead of this one. `site/_headers` carries the Content-Security-Policy; Cloudflare Pages and Netlify read it, other hosts need the same headers set in their own configuration.
