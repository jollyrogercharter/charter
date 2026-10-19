# WebMCP Developer Guide

> **Update 2026-10-19:** there are now 24 tools (read-only and prepare-only), also served by a local MCP server and the CLI. See [`AGENT-INTEROP.md`](AGENT-INTEROP.md) for the full list and safety model. The five founding-provenance tools were retired the same day, so the tables below no longer list them. The sections below describe the original browser layer. Where they say thirteen (or seven project) tools, count one fewer: `get_provenance` is gone. The browser now registers all 24 the same way; the real-Chrome checks below covered the original 13 tools, and the newer tools only through the page forms.

jollyrogercharter.org registers thirteen **read-only** tools with [WebMCP](https://webmachinelearning.github.io/webmcp/) (`document.modelContext`). Through structured calls instead of scraping, an AI agent in the browser can query the charter, status and costs, assess a `jrc.json`, and assess a public GitHub repository and prepare its adoption. The seven project tools are also available to any client as static JSON at `/api/v1/`. The six repository tools are described in [`docs/ADOPT.md`](ADOPT.md).

**Status:**
- Implemented and tested in Node, including a spec-modelled *simulated* `modelContext`.
- Executed for real in Chrome 155. That run covered the module and tool layer, plus the fallback when WebMCP is unavailable.
- **Native WebMCP registration is not yet verified in a browser with WebMCP enabled.** It needs `chrome://flags/#enable-webmcp-testing` or an origin-trial token; see [Verify natively](#verify-natively).

## Tools

| Tool | Input | Returns | Annotations |
|---|---|---|---|
| `get_charter` | `pillar?` | Six pillars; with `pillar`, its evidence requirements and assessment question | read-only |
| `get_project_status` | `state?`, `area?`, `id?` | Counts by state, what isn't done, founder dependencies; with `id`, one item's evidence | read-only |
| `assess_jrc_manifest` | `manifest` (object, ≤ 64 KiB) | The `jrc` engine's result: validity, pillar levels, up to 8 findings | read-only, **untrusted content** |
| `generate_adoption_plan` | `manifest` | Ordered, deterministic next steps derived from the assessment | read-only, **untrusted content** |
| `get_project_costs` | `category?` | Quartermaster ledger: categories never summed together, `null` = unknown | read-only |
| `get_open_challenges` | `step?` | The 9 challenge steps, this project's reproduction status, open ways to help | read-only |
| `assess_repository` | `repository` + `ref?`, or `snapshot` | Each pillar's status (evidenced / partially-evidenced / missing / not-applicable / unknown), concerns, next step | read-only, **untrusted content**, reads GitHub |
| `prepare_adoption_roadmap` | same | Ordered steps: dependencies, then impact, then effort | read-only, **untrusted content**, reads GitHub |
| `generate_jrc_manifest` | same | Candidate `jrc.json` (never `evidenced`), checked by the engine, plus a GitHub new-file link | read-only, **untrusted content**, reads GitHub |
| `prepare_contribution` | same + `kind` | PR description, checklist, new-files patch or challenge log, plus links; never submits | read-only, **untrusted content**, reads GitHub |
| `run_challenge_checks` | same | Challenge steps safe from public files; steps that need code to run are `not-attempted` | read-only, **untrusted content**, reads GitHub |
| `generate_assessment_report` | same + `format?` | The full reproducible report (Markdown or JSON) | read-only, **untrusted content**, reads GitHub |

The two manifest tools are marked `untrustedContentHint: true` because their output echoes text supplied by whoever called them.

### Result conventions

- `{ ok: true, tool, tools_version, data_commit, … }` on success. On failure, `{ ok: false, tool, error: { code, message, details? } }`, with codes `INVALID_INPUT`, `INPUT_TOO_LARGE`, `OUTPUT_TOO_LARGE` (about 2 KiB by default, up to 48 KiB for tools that return drafts or reports), `NOT_FOUND` or `TOOL_FAILED`. Cancellation rejects with `AbortError` instead of returning.
- Every fact carries a **`basis`**:
  - `verified`: anyone can re-check it by a reproducible method (hash, block header).
  - `self-reported`: a claim, not checked independently.
  - `unchecked`: claimed with file evidence the browser couldn't read.
  - `missing`: not done or unknown.
  - `estimate`: a forecast.
  - `not-applicable`.
  - `historical`.
  The legend is in `/api/v1/tools.json`.
- `null` means unknown, never zero.
- Results link to evidence (`references`) instead of embedding documents. Default outputs stay near Chrome's ~1.5K guidance (the test budget is 2,200 characters); filters return detail.
- `assess_jrc_manifest` runs **in the page**. The manifest isn't uploaded anywhere. File evidence can't be read from the browser, so it comes back as `not-checked`: the pillar's basis is `unchecked`, `summary.file_evidence_not_checked` counts it, and the adoption plan's first step says to run `jrc check` where the files are. It's never shown as verified.
- `canonical_json_sha256` hashes `JSON.stringify` of the supplied object. The CLI's `manifest.sha256` hashes the file's bytes, so the two differ by design.
- Text taken from the supplied manifest is clipped to 120 characters and wrapped as `{ text, source: "supplied manifest (untrusted)" }`. It never appears in the tool's own advice fields.

## Architecture

```text
lib/jrc/core.mjs            assessment engine (pure; evidence via an injected probe)
lib/jrc/check.mjs           Node probe: filesystem containment, existence, SHA-256  ← CLI only
lib/jrc/report.mjs          report builder (pure; caller supplies the manifest hash)
lib/qm/expenses.mjs         Quartermaster ledger validation and summary (pure)
lib/capabilities/
  bundle.mjs                builds the public data bundle from repository files
  capabilities.mjs          one deterministic function per capability, with basis labels
  input.mjs                 validates tool input against the tool's own JSON Schema
  tools.mjs                 tool definitions + runTool(): validation, limits, cancellation, envelope
site/_data/webmcp.js        build: bundle → /webmcp/data.json, tool outputs → /api/v1/*.json
site/assets/webmcp.js       browser: feature-detect, register, execute (no framework)
```

- The CLI, the site build, the tests and the browser all call the same functions. The browser loads exact copies of the platform-neutral modules from `/js/lib/` (Node-only `check.mjs` and `init.mjs` are never served).
- `/webmcp/data.json` is built from `CHARTER.md`, `OPEN-DEPENDENCIES.md`, `launch/status.json`, `launch/costs.json` and the debate and opportunity sources. There's no separate copy to drift.

### Browser lifecycle (`site/assets/webmcp.js`)

1. **Feature-detect.** It checks `document.modelContext?.registerTool`. If that's missing, it sets `<html data-webmcp="unsupported">` and does nothing else: no errors, and no effect on the page.
2. **Register.** Each tool is registered with its own `AbortController`, and the registrations settle independently. A rejection (`NotAllowedError` from the `tools` permissions policy, or `InvalidStateError` for a duplicate or invalid name) is recorded, and the other tools still register. The resulting `data-webmcp` value is `registered`, `partial` or `failed`.
3. **Execute.**
   - `execute(input, { signal })` validates the input, lazily fetches the bundle once (same-origin, `credentials: "omit"`), runs the capability, and checks `signal` before and after each await.
   - String input, which Chrome passed before version 155, is parsed.
   - Unexpected errors become `{ ok: false, error: { code: "TOOL_FAILED" } }` instead of an opaque `OperationError`.
4. **Unregister.** Aborting a tool's controller (or the optional outer signal passed to `registerJrcTools`) unregisters it, as the spec defines.

There's nothing else on the page: no cookies, storage, analytics, third-party scripts, login or vendor SDK.

## Using the HTTP API instead

| URL | Same as |
|---|---|
| `/api/v1/tools.json` | Tool catalog: names, schemas, annotations, basis legend |
| `/api/v1/charter.json` | `get_charter {}` |
| `/api/v1/status.json` | `get_project_status {}` |
| `/api/v1/costs.json` | `get_project_costs {}` |
| `/api/v1/challenges.json` | `get_open_challenges {}` |
| `/webmcp/data.json` | The full bundle the tools read |

Static files, built on every deploy. A test checks that each one equals the tool's output.

## Tests

`npm test` runs `test/webmcp.test.mjs`:

| Area | What's checked | Real or simulated |
|---|---|---|
| Discovery | Names, description lengths and annotations against the spec and Chrome guidance; the published catalog equals the code | Real code |
| Schemas | Strict Ajv compiles every schema; the input validator rejects everything Ajv rejects | Real code |
| Execution | Every tool on repository data; budget; basis labels; filters; NOT_FOUND / INVALID_INPUT / INPUT_TOO_LARGE | Real code and data |
| Consistency | `assess_jrc_manifest` equals `jrc report` (summary, levels, error codes) on four manifests; costs equal `qm summary`; the static API equals the tools; a pending proof is never labelled verified | Real code and CLI |
| Registration | All 24 register (13 when this table was first written); `executeTool` equals the Node path; legacy string input; `DataError` for non-object input | **Simulated** `modelContext` |
| Failures and cancellation | `NotAllowedError` → `failed`; a duplicate → `partial`; per-tool and outer abort unregister; aborted execution rejects | **Simulated** |
| Fallback | No `modelContext`, or a non-function `registerTool` | **Simulated** |
| Pages | Every page loads `/assets/webmcp.js`; no third-party scripts; no tracking APIs; no Node built-ins in served modules | Real build output |
| Review regressions | 10 tests from an independent review: unchecked evidence, ReDoS, output clipping and capping, ZIP digest basis, hash naming, pre-aborted signal and listener release, prototype-named parameters, affirming pseudo-negations, self-asserted independence, malformed bundle | Real code; 2 simulated. Each was confirmed to fail on the pre-fix commit. |

The simulated `modelContext` follows the spec's IDL and algorithms (name rules, duplicates, signals, JSON serialization, `executeTool` errors). The tests load the **built** `webmcp.js` and the **served** module copies, not the sources.

## Verify natively

1. Use Chrome 149 or newer. Enable `chrome://flags/#enable-webmcp-testing` and relaunch. Production visitors would instead need the origin trial, see below.
2. `npm run build`, then serve `_site/` on `localhost` (a secure context): `cd _site && python3 -m http.server 8765`.
3. Open http://localhost:8765/. In DevTools: `document.documentElement.dataset.webmcp` should be `"registered"`, and `(await document.modelContext.getTools()).map(t => t.name)` should list all 24 tools. The DevTools **Application → WebMCP** panel shows them too.
4. Execute one: `await document.modelContext.executeTool((await document.modelContext.getTools()).find(t => t.name === "get_charter"), {})`.
5. Or drive it with an agent: the [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) or GoogleChromeLabs' [example extension](https://github.com/GoogleChromeLabs/webmcp-extension/).

**What was verified on 2026-10-18, in Chrome 155 on localhost without the flag:**
- `isSecureContext` was true and `document.modelContext` was absent, so the page fell back to `data-webmcp="unsupported"` with no errors of its own.
- Importing the served modules and calling each tool's executor (real `fetch`, WebCrypto and ES modules) gave results byte-identical to `/api/v1/*.json`. `assess_jrc_manifest` on `jrc.json` gave the CLI's result (1 of 5).
- An aborted signal produced `AbortError`.
- **Steps 3–5 haven't been run yet.**

## Production availability: origin trial

For the tools to work for visitors without a flag, register the site for the [WebMCP origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241) (this needs a Google account; it's the owner's decision). Then set `webmcpOriginTrialToken` in `site/_data/site.json`, and `base.njk` emits the `<meta http-equiv="origin-trial">` tag. Until then, nothing changes for visitors: the feature-detection path stays inert.

## Adding a tool

1. Write a pure function in `lib/capabilities/capabilities.mjs`. Label every fact with a `basis`. Keep the default output small and link to detail.
2. Add a definition to `TOOLS` in `tools.mjs`:
   - a name of 30 characters or fewer;
   - a description of 500 characters or fewer;
   - a strict `inputSchema` with `additionalProperties: false`, `enum`/`maxLength`/`pattern` on strings, and parameter descriptions of 150 characters or fewer;
   - honest annotations.
3. Run `npm test`. The catalog, schema, budget, consistency and simulated-browser tests cover new tools automatically. Add a consistency test against the source it reads.
4. Any tool that changes state needs `consequentialHint`, a confirmation design and an RFC first. All current tools are read-only by design.

## Security notes

- **Input:** validated against the published schema, with a 64 KiB manifest limit. Manifests are untrusted. The `jrc` engine rejects path escapes, control and zero-width characters, homoglyphs, misleading authority wording and privacy leaks, and never fetches URLs or runs manifest commands.
- **Output:** carries no credentials, invoice numbers or private data. The ledger validator rejects them at build time.
- **Exposure:** `exposedTo` isn't used, so tools are same-origin only (the spec default). The site sets no Permissions-Policy override for `tools`.
