# WebMCP Plan — 2026-10-18

Brief: make jollyrogercharter.org natively usable by AI browser agents through WebMCP, with real tools backed by the same code as the CLI. Branch `feat/webmcp`, stacked on #6 (draft PR; no merges).

## What the platform provides (checked against sources on 2026-10-18)

| Fact | Source |
|---|---|
| `document.modelContext` (`[SecureContext]`); `registerTool(tool, { signal, exposedTo })` returns a Promise | WebMCP Draft CG Report, 16 Oct 2026 |
| `tool = { name, title?, description, inputSchema?, execute, annotations? }`; name is 1–128 of `[A-Za-z0-9_.-]` | same |
| `execute(input, { signal })`; the resolved value is serialized to a JSON string; a rejection becomes `OperationError` | same |
| Annotations: `readOnlyHint`, `untrustedContentHint`, `consequentialHint`, `debugging` (all default false) | spec + Chrome imperative-API doc |
| Errors: duplicate or invalid name → `InvalidStateError`; blocked by `tools` permissions policy → `NotAllowedError`; already-aborted signal → abort reason | spec |
| Unregister by aborting the `signal` passed at registration; this doesn't cancel in-flight runs | spec, Chrome doc |
| Availability: Chrome origin trial from 149, or `chrome://flags/#enable-webmcp-testing`; DevTools has a WebMCP panel; Model Context Tool Inspector extension | Chrome WebMCP overview |
| Guidance: description ≤ 500 chars, parameter description ≤ 150, name ≤ 30, output ≈ ≤ 1.5K chars; `untrustedContentHint` for outputs carrying untrusted content | Chrome secure-tools doc |

## Architecture

1. **Pure engine** (`lib/jrc/core.mjs`): validation, wording/privacy/control scans, semantic rules. Evidence checks go through an injected *probe*. The Node CLI's probe uses the filesystem; the browser's probe reports file evidence as `not-checked` (it can't see your files) and never pretends to have verified it. `report.mjs` takes the manifest hash as a parameter (Node `crypto` in the CLI, WebCrypto in the browser).
2. **Capability layer** (`lib/capabilities/`): one deterministic function per capability (charter, status, assessment, adoption plan, costs, challenges, provenance). They take plain data and return compact, labelled results. Every fact carries `basis`: `verified` | `self-reported` | `missing` | `estimate` | `not-applicable`.
3. **Tool definitions** (`lib/capabilities/tools.mjs`): name, description, JSON Schema, annotations and a `run(input, ctx)` that validates input against that same schema, then calls the capability. Used by the browser, tests, and any future MCP or HTTP server.
4. **Site build:** a single `/webmcp/data.json` bundle (charter table parsed from `CHARTER.md`, status, ledger, provenance manifest, open dependencies), plus a static read-only HTTP API at `/api/v1/*.json` produced by the *same* capability functions, plus `/api/v1/tools.json` for discovery.
5. **Browser glue** (`site/assets/webmcp.js`, an ES module with no framework): feature-detect; register each tool with its own `AbortController`; settle registrations independently so one failure doesn't block the rest; honour the execution `signal`; return structured `{ ok: false, error }` for bad input. With no `modelContext`, the page works as before and the script does nothing.
6. **No** tracking, cookies, auth, vendor SDK or network beyond same-origin static files. Supplied manifests stay in the page; nothing is uploaded.

## Tests

- Node, real code: every tool against the repository data. Ajv agrees with each tool schema; input validation rejects bad input; outputs stay within budget; results agree with `jrc report` and `qm summary`; the static API equals tool output.
- **Simulated** browser: a spec-modelled fake `document.modelContext` (name rules, duplicates, signals, JSON serialization, `executeTool`) loads the real `webmcp.js` with the real modules. Clearly labelled as simulated.
- Fallbacks: no `modelContext`; `registerTool` rejecting `NotAllowedError` or `InvalidStateError`; aborted executions.
- **Native**: attempt in the human's Chrome on `localhost` via `document.modelContext.getTools()` / `executeTool()`. Report honestly whether it was possible (it needs the flag or an origin-trial token).

## Needs the human

- Origin-trial token registration (Google account) for production availability without a flag.
- Enabling `chrome://flags/#enable-webmcp-testing` for native verification. The agent won't change browser flags itself.
