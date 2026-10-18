# Overnight Report, 2026-10-18

**Bottom line:** JRCv1 now has a working, tested, offline tool. Anyone can run `jrc` against their repository, get an honest machine-readable assessment, and attempt the Jolly Roger Challenge without asking us. Everything is in three **draft PRs, not merged**. Nothing has been posted publicly.

## 1. What shipped (working code, draft PRs)

Merge in this order. After each merge, retarget the next PR's base to `main`.

| PR | Branch | What it does |
|---|---|---|
| [#4](https://github.com/jollyrogercharter/charter/pull/4) | `fix/status-truth` | `launch/status.json` is the single source for every status claim; it generates `LAUNCH-STATUS.md`, the new `/status/` page and the home summary, and a test keeps them in sync. Fixes stale public claims. **Records the verified Bitcoin timestamp**, and adds `provenance/check-ots.py`. |
| [#5](https://github.com/jollyrogercharter/charter/pull/5) | `feat/jrc-cli` | **`jrc` 0.1 draft** (`init` / `check` / `report` / `challenge`), its JSON Schema and spec, this repository's honest self-assessment, the `/check/` quickstart, `/spec/`, the **Raise the Flag** page, and a challenge-log template. CI runs `jrc check` and a Node 20/24 matrix. Also drafts of debate RFCs and a launch briefing (not posted). |
| [#6](https://github.com/jollyrogercharter/charter/pull/6) | `feat/quartermaster-schema` | **Quartermaster qm 0.1** expense ledger: schema, `qm validate / summary / csv2json`, cost page built from the validated ledger, and a propose-a-saving PR template. |

Cloudflare Pages builds a public preview for each PR on `*.jollyrogercharter.pages.dev`. Production changes only on merge.

## 2. Tests

| Check | Result |
|---|---|
| `npm test` on the top of the stack (#6) | **43/43 pass**: 15 site, 23 `jrc`, 7 `qm` |
| Node versions | 20.20.1, 22.22.3, 24.21.0 and 26.0.0 all pass locally; CI runs `build-and-test` (22) plus 20 and 24 |
| CI on #4 and #5 | Green: `build-and-test`, `node-compat (20, 24)`, Cloudflare Pages preview. #6 CI was triggered by the last push. |
| Independent review | Two Sonnet reviewers (code review, adversarial) found real defects in the first `jrc` commit. All confirmed findings were fixed with regression tests (§7). |
| Clean-clone end-to-end | Passed: fresh GitHub clone, Node 22, every exit code as specified (transcript below) |
| `npm audit` | 9 transitive build-time advisories; deliberately deferred to Eleventy 3.1.7 after 2026-10-29 ([#10](https://github.com/jollyrogercharter/charter/issues/10)) |
| Still failing | Nothing known |

Clean-clone transcript, abbreviated (2026-10-18T17:24Z, Node 22.22.3):

```text
$ git clone --branch feat/quartermaster-schema https://github.com/jollyrogercharter/charter.git   [exit 0]
$ npm ci && npm test            -> tests 43, pass 43, fail 0                                     [exit 0]
$ jrc check jrc.json            -> valid — 1/5 evidenced, 3 partly, 1 exploring (self-reported)    [exit 0]
$ jrc init                      -> Created jrc.json                                                [exit 0]
$ jrc init                      -> already exists; jrc init never overwrites                       [exit 1]
$ jrc check                     -> valid — 0/6 … 1 warning (W-PLACEHOLDER)                         [exit 0]
  (edit: code_rights evidenced with sha256, development partial, data not-applicable)
$ jrc check                     -> valid — 1/5 evidenced, 1 partly                                 [exit 0]
$ jrc report --out jrc-report   -> jrc-report.json, JRC-REPORT.md, jrc-badge.svg                   [exit 0]
$ report twice + cmp            -> byte-identical                                                  [exit 0]
$ (statement edited to "Certified: …") jrc check -> E-MISLEADING, INVALID                          [exit 1]
$ jrc challenge --out CHALLENGE-LOG.md -> 9 step sections                                           [exit 0]
$ qm validate / summary launch/costs.json -> valid; "USD 8.50 known cash … 3 unknown"             [exit 0]
```

## 3. Try the CLI in five minutes

Once #5 is merged, run these from any project directory. Before that, append `#feat/jrc-cli` to the package name.

```bash
npx --yes --package=github:jollyrogercharter/charter jrc init      # starter jrc.json; never overwrites
# edit jrc.json: set your name, add claims with evidence, leave honest gaps
npx --yes --package=github:jollyrogercharter/charter jrc check     # 0 valid · 1 invalid · 2 usage
npx --yes --package=github:jollyrogercharter/charter jrc report --out jrc-report
npx --yes --package=github:jollyrogercharter/charter jrc challenge --out CHALLENGE-LOG.md
```

I verified the `npx … #feat/jrc-cli` form end to end from GitHub. Docs: `/check/` and `/spec/` on the site after merge, or `spec/JRC-MANIFEST.md`.

## 4. Verified public state

- **Site:** https://jollyrogercharter.org is live from `main` (`37365e1`), with HTTP redirecting to HTTPS. **`www.` doesn't resolve** ([#7](https://github.com/jollyrogercharter/charter/issues/7)).
- **Repository:** public. CC0-1.0, detected by GitHub. Org 2FA required. `main` protected (PR plus `build-and-test`, 0 approvals). Discussions enabled with default categories and no posts.
- **Timestamp proof:** **verified.** The founding digest list (`provenance/launch-digests.sha256`, SHA-256 `e87e615c…`) is attested in Bitcoin **block 971948** (block time **2026-10-18T04:45:37Z**), plus three later blocks.
  - **Method:** `ots upgrade`, then commitments compared with block headers from blockstream.info and mempool.space; all matched.
  - **Not** checked with a local Bitcoin node.
  - It proves the list existed no later than that time. It does not prove authorship, priority, or when the ideas arose.
  - It reaches the live site when #4 merges.
- **Founding transcript:** not supplied; still blocked.
- **Self-assessment:**
  - **1 of 5** applicable pillars evidenced (development);
  - 3 partial (code and rights, operations, economics);
  - governance exploring;
  - data not-applicable (static site).
  - **Independent reproduction: NOT YET VERIFIED** ([#12](https://github.com/jollyrogercharter/charter/issues/12)).
- **Still depends on the founder:** sole active admin and merger; Cloudflare account (domain plus hosting); the ChatGPT export; every decision on open questions. See `OPEN-DEPENDENCIES.md`.

## 5. Approvals needed from you, in priority order

1. **Review and merge #4, then #5, then #6.** Retarget each PR to `main` after the previous one merges.
2. **Add `www`** as a Pages custom domain or redirect ([#7](https://github.com/jollyrogercharter/charter/issues/7)).
3. **Create the Discussions categories** and approve the seed and overnight RFC text for posting ([#8](https://github.com/jollyrogercharter/charter/issues/8)).
4. **Second owner:** once they accept, raise required approvals to 1 ([#9](https://github.com/jollyrogercharter/charter/issues/9)).
5. **Founding conversation:** export it from ChatGPT so the transcript work can start.
6. **Launch posts:** review `launch/LAUNCH-BRIEFING.md` and post from your own accounts if you want to. The news is the working tool, not a claim to have invented freedom.
7. **Legal review** of CC0, and a patent-policy decision before Quartermaster code ships ([#11](https://github.com/jollyrogercharter/charter/issues/11)).

## 6. Deliberately deferred

- **Quartermaster provider adapters.** There was no credentials-free, documented public sample billing export to build and test one against honestly. FOCUS 1.4 mapping is left for seed RFC 6.
- **Signed evidence and reviewer attestations** (Sigstore/OTS as an evidence kind; independent reviews as their own manifests). Listed as open questions in `spec/JRC-MANIFEST.md`.
- **Online `jrc` mode** that fetches and hashes URL evidence. Offline-first was the requirement; an opt-in `--online` is a possible 0.2 feature.
- **A local-node timestamp check**, the stronger form. Anyone with Bitcoin Core can run `ots verify`.
- **Separate `conformance`, `quartermaster` and `starter` repositories.** The tools live in `charter` until there's enough to justify splitting them.
- **Eleventy 3.1.7** ([#10](https://github.com/jollyrogercharter/charter/issues/10)).

## 7. AI contribution and cost

- **Main agent:** Claude Opus 5.5 in Claude Code. Planning, all code, tests, docs, PRs and issues.
- **Sub-agents (Claude Sonnet):**
  - **Code review** of `jrc`, which found:
    - the validator was looser than the schema;
    - partly failing evidence still counted as evidenced;
    - crashes, a FIFO hang and a rejected BOM;
    - `--out` errors.
  - **Adversarial review**, which found:
    - Markdown/HTML injection that forged a "valid" result;
    - a 6/6 badge earned with `echo trust me`;
    - Unicode bypasses of the independence and wording checks;
    - ANSI escapes reaching the terminal;
    - the report writing leaked secrets to disk;
    - symlink writes from `--out`.
  - **Drafting** of the RFC and briefing documents.
  - Every confirmed finding was fixed in e623d39 with a regression test.
- **Errors I made and corrected,** all disclosed in `transparency/agent-runs/2026-10-18-overnight.md`:
  - a commit created while a test was failing (amended before pushing);
  - a dropped placeholder warning;
  - mangled Unicode escapes;
  - a real invoice number typed into a test fixture (never committed);
  - an invalid first end-to-end run.
- **Cost:** **unknown.** I can't see the AI billing for this session; it's recorded as `null` in `launch/costs.json`. Infrastructure spend tonight was **$0**: no purchases, no new accounts.
- **Human attention:** not measured.
