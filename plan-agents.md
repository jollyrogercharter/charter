# Agent Interoperability Plan — 2026-10-19

Brief: make the movement's debate, economics, provenance and contribution opportunities usable by AI agents of the user's choosing. WebMCP is one entry point among several. Branch `feat/agents-interop`, stacked on #14 (`feat/adopt`), draft PR only.

## Facts checked before designing (2026-10-19)

| Fact | Source |
|---|---|
| MCP 2026-07-28 is stateless. Every request carries `_meta` with `io.modelcontextprotocol/protocolVersion` and `clientCapabilities` (required) and optionally `clientInfo`. Missing ones are rejected with `-32602`; an unsupported version gets `-32022` with `data.supported` and `data.requested`. | modelcontextprotocol.io basic/index, basic/versioning |
| `server/discover` is mandatory and returns `supportedVersions`, `capabilities`, `_meta["io.modelcontextprotocol/serverInfo"]` and `instructions`. Every result carries `resultType: "complete"`. | server/discover |
| A dual-era server may also answer legacy `initialize` (2025-11-25 and earlier), which is what most clients in use today send. | basic/versioning |
| `tools/call` results carry `content`, `structuredContent` and `isError`. Tool errors return `isError: true`; an unknown tool is protocol error `-32602`. | server/tools |
| Lexicon v1 is `{ lexicon: 1, id, defs }`. A record def has `key` and `record`, and records carry `$type`. String `maxLength` counts UTF-8 bytes. NSID authority comes from DNS on the reversed domain (`org.jollyrogercharter.*` → jollyrogercharter.org) and is published via `_lexicon` TXT plus `com.atproto.lexicon.schema` records. | atproto.com/specs/lexicon |

## Scope

### New capabilities

All pure and deterministic, all in `lib/`, and all exposed through WebMCP, MCP, the static HTTP API (read-only parts), the CLI and pages where noted.

- **Community** (`lib/community/`):
  - registry of RFCs and debates, parsed from `launch/RFC-SEEDS.md`, `launch/RFC-DRAFTS-OVERNIGHT.md` and `DECISIONS-AND-QUESTIONS.md`;
  - one RFC's arguments and evidence;
  - opportunity matching against explicitly supplied skills, from a curated `community/opportunities.json`;
  - drafts of an RFC, criticism, response or contribution proposal (Markdown plus a prefilled GitHub link, never posted);
  - a challenge submission package from supplied attempt results.
- **Quartermaster** (`lib/qm/compare.mjs`):
  - explain the cost categories using the live ledger;
  - compare two infrastructure configurations in integer cents, where unknowns propagate rather than becoming zero;
  - estimate savings over a horizon from documented assumptions;
  - prepare a cost-reduction PR from the propose-a-saving template.
- **Provenance** (`lib/provenance/`):
  - manifest parts with paging;
  - verify supplied or locally computed hashes against published digests;
  - timestamp status (`absent` / `pending` / `verified`, with *who* verified and how);
  - exact limitations per evidence type.
- **AT Protocol** (`lexicons/`, `lib/atproto/`):
  - proposed Lexicons `org.jollyrogercharter.{adoption,assessment,contribution}`;
  - record builders and exportable example records;
  - a publication *preparation* that returns a `com.atproto.repo.createRecord` body for the user's own DID and PDS, with no token handling and no network.

### Interfaces

- **Capability manifest:** `spec/capabilities-0.1.schema.json`, published at `/api/v1/capabilities.json`. It lists every capability with schemas, a safety class, maturity (`implemented` / `draft` / `planned`) and per-interface availability. Planned items (an MCP-over-HTTP server, AT Protocol publishing, a POST HTTP API) are listed *as planned*.
- **MCP server:** `bin/jrc-mcp.mjs`, stdio, dual-era (2026-07-28 modern plus legacy `initialize`), no dependencies. It serves the same `TOOLS` from local repository files, with no dependency on jollyrogercharter.org.
- **CLI:** `qm compare`, `qm savings`, `jrc provenance verify`, `jrc atproto example`.
- **Pages:**
  - `/agents/` rewritten from the capability manifest;
  - `/debate/` RFC list plus an opportunity finder;
  - `/provenance/` file verifier (WebCrypto, local only);
  - `/costs/` configuration comparison;
  - `/spec/atproto/` Lexicons and example records.

### Safety model

- Every tool is either `read-only` or `prepare-only`: it returns text or links and causes no side effects. No tool submits, publishes, authenticates or changes infrastructure, so none needs `consequentialHint`.
- That's documented as a design decision, not a guarantee from annotations: the server and page code have no write paths at all.
- Only the existing repository tools touch the network, through allowlisted GitHub hosts. No new tool fetches URLs.
- User-supplied text is validated, clipped, privacy-scanned (the same scanner as `jrc`) and marked untrusted (`untrustedContentHint`).

## Acceptance

- `npm test` passes, with new tests for each capability, schema agreement (Ajv), consistency across interfaces, MCP protocol conformance including error paths, Lexicon validation of example records with `@atproto/lexicon`, and hostile input.
- The capability manifest validates and matches `TOOLS` exactly. No capability is marked `implemented` without an interface that works.
- An independent four-reviewer audit covers spec compliance and vendor neutrality; security and privacy; accessibility, fallback and reproducibility; and claims, transparency and provenance. Significant findings are fixed with regression tests.

## Not doing

- Posting to GitHub, publishing AT Protocol records, OAuth, any backend, or new hosting.
- An HTTP MCP endpoint (planned; it needs a server).
- DNS `_lexicon` records (that's the owner's decision).
