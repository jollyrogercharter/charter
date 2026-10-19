// The versioned capability manifest: every capability, its safety class, maturity and which interfaces really support it.
import { TOOLS, TOOLS_VERSION } from "./tools.mjs";

export const MANIFEST_VERSION = "0.1";

const ORIGINAL = {
  get_charter: { group: "charter", http: "/api/v1/charter.json", website: "/charter/" },
  get_project_status: { group: "status", http: "/api/v1/status.json", website: "/status/" },
  assess_jrc_manifest: { group: "conformance", cli: "jrc check <manifest> (also reads local evidence files, which the tool can't)", website: "/check/" },
  generate_adoption_plan: { group: "conformance", safety: "read-only" },
  get_project_costs: { group: "quartermaster", http: "/api/v1/costs.json", website: "/costs/" },
  get_open_challenges: { group: "community", http: "/api/v1/challenges.json", website: "/challenge/" },
  get_provenance: { group: "provenance", http: "/api/v1/provenance.json", website: "/provenance/" },
  assess_repository: { group: "adoption", network: "github-public", cli: "jrc assess <dir|github-url>", website: "/adopt/" },
  prepare_adoption_roadmap: { group: "adoption", network: "github-public", cli: "jrc assess --format md", website: "/adopt/" },
  generate_jrc_manifest: { group: "adoption", network: "github-public", safety: "prepare-only", cli: "jrc assess --out DIR", website: "/adopt/" },
  prepare_contribution: { group: "adoption", network: "github-public", safety: "prepare-only", cli: "jrc assess --out DIR", website: "/adopt/" },
  run_challenge_checks: { group: "adoption", network: "github-public", website: "/adopt/" },
  generate_assessment_report: { group: "adoption", network: "github-public", safety: "prepare-only", cli: "jrc assess --out DIR", website: "/adopt/" },
};
const EXTENDED = {
  list_debates: { http: "/api/v1/debates.json", website: "/debate/" },
  get_debate: { website: "/debate/" },
  find_opportunities: { website: "/debate/#contribute" },
  draft_community_post: {},
  prepare_challenge_submission: {},
  explain_costs: { http: "/api/v1/cost-categories.json", website: "/costs/" },
  compare_infrastructure_costs: { cli: "qm compare A.json B.json", website: "/costs/#compare" },
  estimate_savings: { cli: "qm savings MODEL.json", website: "/costs/#compare" },
  prepare_cost_reduction_pr: { cli: "qm savings MODEL.json --pr" },
  get_provenance_manifest: { website: "/provenance/" },
  verify_hashes: { cli: "jrc provenance verify [FILE...]", website: "/provenance/#verify" },
  get_timestamp_status: { http: "/api/v1/timestamp.json", website: "/provenance/" },
  explain_evidence_limitations: { website: "/provenance/" },
  get_atproto_lexicons: { http: "/api/v1/lexicons.json", website: "/spec/atproto/" },
  export_atproto_record: { network: "github-public (assessment kind only)", website: "/spec/atproto/" },
  prepare_atproto_publication: {},
};

export const PLANNED = [
  { id: "mcp-http", title: "MCP over Streamable HTTP", maturity: "planned", why_not_yet: "Needs a server with rate limiting and an operator; the stdio server covers local use without one." },
  { id: "http-post-api", title: "HTTP API for the computational tools (assess, compare, draft)", maturity: "planned", why_not_yet: "Needs a backend. Read-only data is already static JSON under /api/v1/." },
  { id: "atproto-publish", title: "Publish AT Protocol records from the site with the user's own account", maturity: "planned", why_not_yet: "Needs an atproto OAuth client and a consent screen; publishing must always be the user's explicit action. Lexicons aren't published yet either." },
  { id: "github-submit", title: "Submit drafts to GitHub on the user's behalf", maturity: "not-planned", why_not_yet: "Drafts are deliberately prepare-only: the person posts from their own account." },
];

export function capabilityManifest() {
  return {
    manifest_version: MANIFEST_VERSION,
    tools_version: TOOLS_VERSION,
    safety_classes: {
      "read-only": "Returns information; no side effects anywhere.",
      "prepare-only": "Returns text, files or links for a person to review and submit themselves; no side effects anywhere.",
      consequential: "Would submit, publish, sign in or change infrastructure. No capability is in this class; any future one must use real authorization and explicit consent, not annotations alone.",
    },
    interfaces: {
      webmcp: "In-page tools via document.modelContext (site/assets/webmcp.js). Needs a browser with WebMCP enabled; native registration not yet verified.",
      mcp_stdio: "Local MCP server: node bin/jrc-mcp.mjs (protocol 2026-07-28, plus legacy initialize). Uses repository files; no network except the GitHub-reading tools.",
      http_static: "Static JSON under /api/v1/ for capabilities whose default answer is published data. Any static host can serve it.",
      cli: "jrc tool NAME runs any capability exactly as the other interfaces do; cli_shortcut names a related convenience command, which may differ (it can read local files, for example). Node 20+, no runtime dependencies.",
      website: "Pages with normal controls for people without an agent.",
    },
    capabilities: TOOLS.map((t) => {
      const m = ORIGINAL[t.name] ?? EXTENDED[t.name] ?? {};
      return {
        name: t.name,
        title: t.title,
        group: t.group ?? m.group,
        description: t.description,
        safety: t.safety ?? m.safety ?? (t.annotations.untrustedContentHint && /draft|prepare|generate/.test(t.name) ? "prepare-only" : "read-only"),
        network: m.network ?? "none",
        echoes_untrusted_input: Boolean(t.annotations.untrustedContentHint),
        maturity: "implemented",
        inputSchema: t.inputSchema,
        annotations: t.annotations,
        interfaces: { webmcp: t.name, mcp_stdio: t.name, http_static: m.http ?? null, cli: `jrc tool ${t.name}`, cli_shortcut: m.cli ?? null, website: m.website ?? null },
      };
    }),
    planned: PLANNED,
  };
}
