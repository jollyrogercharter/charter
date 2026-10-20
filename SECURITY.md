# Security

## Reporting a problem

Open a [GitHub security advisory](https://github.com/jollyrogercharter/charter/security/advisories/new) (private) for anything that could hurt users or let someone misrepresent a project, for example:

- making `jrc` or an agent tool claim evidence, independence or verification that isn't there;
- leaking private data through a report, draft or record;
- running code, fetching unexpected URLs, or writing files from manifest or repository content;
- forging results in Markdown, SVG, terminal output or the website.

If the advisory form isn't available to you, open an issue that asks for a private contact, without describing the problem. For anything else, a normal issue is fine. Please don't include secrets or personal data in public issues.

## What's in scope

The `jrc` and `qm` CLIs, the MCP server (`bin/jrc-mcp.mjs`), the WebMCP tools and pages in `site/`, and the shared code in `lib/`. The repository's hosting accounts are run by the project's maintainers; report account problems privately.

## What has been reviewed

Reviews so far were done by AI agents working for the project; each finding they confirmed has a regression test. No independent human security review has happened yet; that is one of the open contribution opportunities.
