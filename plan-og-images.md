# Plan: social and icon metadata images

Branch `feat/og-images`, stacked on `fix/prelaunch-polish` (#19), so the Get Involved card has a page to point to. The founder asked for this on 2026-10-20.

## Found

`base.njk` sets `og:title`, `og:description`, `og:url` and `twitter:card=summary`, but has no `og:image`. The only icon is `flag.svg`. LinkedIn, Slack and iMessage ignore SVG previews, so shared links have no picture.

## Approach

- `site/_data/og.json` is the single source for the card texts, keyed by URL. It covers the default card plus the manifesto, stewardship, Get Involved and pilot pages, which are the pages the announcement will link to.
- `scripts/render-og.mjs` builds each 1200×630 card from that file and the inline flag, using the site's palette and fonts, and screenshots it with local headless Chrome (no window, throwaway profile). It also writes a 180×180 `apple-touch-icon.png`. The PNGs are committed, so the build and CI never need Chrome. To regenerate, run `npm run og`, with `CHROME=/path` if Chrome isn't in its macOS location.
- `base.njk` adds `og:image` (with width, height and alt), `twitter:card=summary_large_image`, `twitter:image` and `apple-touch-icon`.
- Tests: every page names an og:image that exists in `_site` as a 1200×630 PNG, the touch icon is 180×180, and every `og.json` entry has its file.

## Non-goals

No new dependencies, no build-time rasterizing, no per-page cards beyond the five.

## Limitation

Fonts come from the system that renders the cards (Iowan Old Style on macOS). Cards regenerated elsewhere will differ slightly; the committed PNGs are what's served.
