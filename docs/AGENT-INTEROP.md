# Agent Interoperability Guide

The Jolly Roger Charter's capabilities can be used by any agent, through whichever interface suits it. **WebMCP is one entry point, not the only one.** Every capability is a deterministic function in `lib/` that each interface calls in the same way, so the results agree. The tests check that they do.

Machine-readable index: [`/api/v1/capabilities.json`](https://jollyrogercharter.org/api/v1/capabilities.json) (schema: [`spec/capabilities-0.1.schema.json`](../spec/capabilities-0.1.schema.json)). Human-readable: [jollyrogercharter.org/agents/](https://jollyrogercharter.org/agents/).

## Interfaces

| Interface | How | Covers | Needs |
|---|---|---|---|
| **MCP (stdio)** | `node bin/jrc-mcp.mjs`, from a clone or `npx --package=github:jollyrogercharter/charter jrc-mcp` | All 29 tools | Node 20+. Reads the repository's files, so no network is needed except for the GitHub-reading tools. |
| **CLI** | `node bin/jrc.mjs tool NAME --input FILE`, plus `jrc check`, `jrc assess`, `jrc provenance verify`, `qm compare`, `qm savings` | All 29 tools | Node 20+ |
| **WebMCP** | Open the site in a browser with WebMCP enabled | All 29 tools | Chrome 149+ with the flag or an origin-trial token. **Native registration not yet verified.** |
| **Static HTTP** | `GET /api/v1/*.json` | Default answers of the read-only data tools (charter, status, costs, debates, timestamp, Lexicons…) | Any HTTP client. Any static host can serve it. |
| **Website** | Normal pages with forms | Most tools: see the matrix on `/agents/` | Any browser. Pages work without JavaScript, showing static lists and CLI instructions instead of forms. |

No interface needs an account, an AI provider, an API key or this project's hosting. The MCP server and CLI run entirely from a clone.

### MCP details

- **Protocol 2026-07-28 (modern, stateless):** every request carries `_meta` with `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`. `server/discover` lists the supported versions. Errors: `-32602` for missing `_meta` or an unknown tool, `-32022` (with `data.supported`) for an unsupported version, `-32601` for an unknown method.
- **Legacy clients:** clients that open with `initialize` (2025-11-25, 2025-06-18, 2025-03-26) are served with that revision's semantics for the rest of the process. Most clients in use today work this way.
- **Results:** `structuredContent` holds the tool result and `content[0].text` holds the same JSON. Tool-level failures (bad input, not found) are `isError: true` results, not protocol errors.
- **Annotations:** every tool is `readOnlyHint: true` and `destructiveHint: false`. `openWorldHint` is true only for tools that read public GitHub repositories.
- **Cancellation:** `notifications/cancelled` aborts an in-flight call.
- **Not implemented:** MCP over HTTP (*planned*), resources, prompts, sampling, elicitation and subscriptions.

Client configuration varies by client. The server is just a command:

```json
{ "command": "node", "args": ["/path/to/charter/bin/jrc-mcp.mjs"] }
```

## Capabilities by area

| Area | Tools | What they really do |
|---|---|---|
| Charter, status | `get_charter`, `get_project_status` | Read the published charter table and `launch/status.json` |
| Conformance | `assess_jrc_manifest`, `generate_adoption_plan` | Run the `jrc` engine on a supplied manifest |
| Adoption | `assess_repository`, `prepare_adoption_roadmap`, `generate_jrc_manifest`, `prepare_contribution`, `run_challenge_checks`, `generate_assessment_report` | Scan a public GitHub repository at one commit (see `/adopt/`) |
| Community | `list_debates`, `get_debate`, `find_opportunities`, `draft_community_post`, `prepare_challenge_submission` | Read the RFC drafts; match supplied skills to a curated list; draft posts and challenge packages for a person to submit |
| Quartermaster | `get_project_costs`, `explain_costs`, `compare_infrastructure_costs`, `estimate_savings`, `prepare_cost_reduction_pr` | Read the ledger; compute estimates in whole cents from supplied assumptions; draft a PR body |
| Provenance | `get_provenance`, `get_provenance_manifest`, `verify_hashes`, `get_timestamp_status`, `explain_evidence_limitations` | Read the manifest; compare hashes the caller computed; report timestamp state and who verified it |
| AT Protocol | `get_atproto_lexicons`, `export_atproto_record`, `prepare_atproto_publication` | Return the *proposed* Lexicons; build and validate records; return the request the user would send from their own account |

## Safety model

Every capability is **read-only** or **prepare-only**. That's a property of the code, not just the annotations:
- `lib/` and `bin/` contain no code path that posts to GitHub, publishes AT Protocol records, signs in, or changes infrastructure.
- No tool runs repository code, and none fetches URLs except the adoption tools, which reach two allowlisted GitHub hosts without credentials.

Input handling:
- **Validation:** every input is validated against the published JSON Schema. Strings have length limits, and a whole input over 128 KiB (1 MiB for snapshots) is refused.
- **Privacy:** text that becomes a draft, package or record goes through the same privacy scanner as `jrc`. Email addresses, tokens, keys, home paths and credentials in URLs are refused with `PRIVATE_DATA`.
- **Untrusted echoes:** tools that can echo the caller's text carry `untrustedContentHint: true`. A test fills every input with a sentinel and fails if any tool echoes it without that hint.

Output caps: about 2 KiB by default (Chrome's guidance is ~1.5K), with tool-specific caps up to 24 KiB for drafts. Over the cap, the result is withheld with `OUTPUT_TOO_LARGE`.

**If a consequential capability is ever added** (posting, publishing, signing in), it must use the person's own authorization (their GitHub or AT Protocol session) and an explicit consent step in the interface. `consequentialHint` alone isn't a control.

## AT Protocol: where it stands and what's next

**Done:**
- Proposed Lexicons `org.jollyrogercharter.{assessment,adoption,contribution}` in `lexicons/`, validated by the reference `@atproto/lexicon` in the test suite.
- Example records at `/api/v1/atproto-example-*.json`.
- A record builder and `prepare_atproto_publication`, which returns a `com.atproto.repo.createRecord` body with `repo` left as the user's DID or handle.

**Not done:**
1. **Publish the Lexicons for resolution.** Add a `_lexicon.jollyrogercharter.org` TXT record (`did=…`) pointing at a DID the project controls, and publish `com.atproto.lexicon.schema` records. This needs an RFC on naming first, and the owner's DNS action.
2. **User-initiated publishing from the site.** Needs a public AT Protocol OAuth client (static client metadata JSON, DPoP, PKCE) and a consent screen that shows the exact record. No backend is required for a browser OAuth client, but it is new security-sensitive code and needs its own review.
3. **Reading records back.** An aggregator or AppView to list adoption records across PDSes. That is infrastructure, and so outside this static site.
4. **Private or organisational records** wait on AT Protocol permissioned data (Spaces alpha); see RFC 3.

## Broader interoperability: next steps

- **MCP over Streamable HTTP**, if the project decides to run a server: it would need rate limiting, an operator, and a cost entry in the ledger.
- **An OpenAPI description** of `/api/v1/` for HTTP-only clients.
- **Independent verification:** native WebMCP verification, MCP checks with several clients, and an outside security review (see `community/opportunities.json`).
