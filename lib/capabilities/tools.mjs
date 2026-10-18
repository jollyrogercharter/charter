// Tool definitions shared by WebMCP (browser), tests, the static API and any future MCP/HTTP server.
import { PILLAR_KEYS } from "../jrc/constants.mjs";
import { CATEGORIES } from "../qm/expenses.mjs";
import { assessJrcManifest, BASIS, generateAdoptionPlan, getCharter, getOpenChallenges, getProjectCosts, getProjectStatus, getProvenance } from "./capabilities.mjs";
import { validateInput } from "./input.mjs";

export const TOOLS_VERSION = "1.0.0";
export const MAX_MANIFEST_BYTES = 64 * 1024;

const READ_ONLY = { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false };
const ECHOES_INPUT = { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false };
const manifestParam = { type: "object", description: "A jrc.json manifest (spec 0.1) as a JSON object. Not uploaded anywhere; assessed in the page." };

export const TOOLS = [
  {
    name: "get_charter",
    title: "Get the JRCv1 charter",
    description: "Returns the draft Jolly Roger Charter (JRCv1): its six pillars, what each asks for, and links to the full text and manifest schema. JRCv1 is a draft conformance standard, not a licence.",
    inputSchema: { type: "object", additionalProperties: false, properties: { pillar: { type: "string", enum: PILLAR_KEYS, description: "Return one pillar with its evidence requirements and assessment question." } } },
    annotations: READ_ONLY,
    needsBundle: true,
    run: (input, { bundle }) => getCharter(bundle, input),
  },
  {
    name: "get_project_status",
    title: "Get project status",
    description: "Returns the project's current implementation status from its single machine-readable status file: counts by state, items not yet done, and founder dependencies. Filter by state, area or id.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        state: { type: "string", enum: ["implemented", "pending", "blocked", "historical"], description: "Only items in this state." },
        area: { type: "string", maxLength: 40, description: "Only items in this area, e.g. Provenance." },
        id: { type: "string", maxLength: 60, pattern: "^[a-z0-9-]+$", description: "One item with its evidence and next step." },
      },
    },
    annotations: READ_ONLY,
    needsBundle: true,
    run: (input, { bundle }) => getProjectStatus(bundle, input),
  },
  {
    name: "assess_jrc_manifest",
    title: "Assess a JRC manifest",
    description: "Assesses a supplied jrc.json with the same engine as the jrc CLI: schema, misleading wording, privacy leaks, independence rules and pillar levels. File evidence can't be read here, so it is reported as not-checked. Not a certification.",
    inputSchema: { type: "object", additionalProperties: false, required: ["manifest"], properties: { manifest: manifestParam } },
    annotations: ECHOES_INPUT,
    needsHash: true,
    run: async (input, { sha256 }) => {
      const { _report, ...publicResult } = assessJrcManifest(input.manifest, { sha256: await sha256(JSON.stringify(input.manifest)) });
      return publicResult;
    },
  },
  {
    name: "generate_adoption_plan",
    title: "Plan next steps for adoption",
    description: "Assesses a supplied jrc.json, then returns ordered, deterministic next steps toward JRCv1: errors to fix, pillars to evidence, gaps to close, and how to get independent reproduction.",
    inputSchema: { type: "object", additionalProperties: false, required: ["manifest"], properties: { manifest: manifestParam } },
    annotations: ECHOES_INPUT,
    needsHash: true,
    run: async (input, { sha256 }) => {
      const a = assessJrcManifest(input.manifest, { sha256: await sha256(JSON.stringify(input.manifest)) });
      return { valid: a.valid, summary: a.summary ? { evidenced: a.summary.evidenced_pillars, applicable: a.summary.applicable_pillars, basis: a.summary.basis } : null, ...generateAdoptionPlan(a) };
    },
  },
  {
    name: "get_project_costs",
    title: "Get project costs",
    description: "Returns the project's published operating costs from its Quartermaster ledger. Cash, forecasts, reserves, donated labour and user attention are kept separate. Unknown amounts are null, never zero.",
    inputSchema: { type: "object", additionalProperties: false, properties: { category: { type: "string", enum: Object.keys(CATEGORIES), description: "Only one cost category." } } },
    annotations: READ_ONLY,
    needsBundle: true,
    run: (input, { bundle }) => getProjectCosts(bundle, input),
  },
  {
    name: "get_open_challenges",
    title: "Get the Jolly Roger Challenge",
    description: "Returns the steps of the Jolly Roger Challenge ('Could your software survive without you?'), whether this project has been independently reproduced, and open ways to contribute.",
    inputSchema: { type: "object", additionalProperties: false, properties: { step: { type: "string", maxLength: 40, pattern: "^[a-z0-9-]+$", description: "One step with what it asks you to do." } } },
    annotations: READ_ONLY,
    needsBundle: true,
    run: (input, { bundle }) => getOpenChallenges(bundle, input),
  },
  {
    name: "get_provenance",
    title: "Get provenance records",
    description: "Returns the project's published provenance: SHA-256 digests of the founding package, the timestamp proof state (not-requested, pending or verified, with method), and transcript status. Never presents a pending proof as verified.",
    inputSchema: { type: "object", additionalProperties: false, properties: { path: { type: "string", maxLength: 200, description: "A founding file path, e.g. MANIFESTO.md, to get its digest." } } },
    annotations: READ_ONLY,
    needsBundle: true,
    run: (input, { bundle }) => getProvenance(bundle, input),
  },
];

// Runs one tool: validates input, enforces limits, honours cancellation, and wraps the result in a labelled envelope.
export async function runTool(tool, input, ctx) {
  const { signal } = ctx;
  const fail = (code, message, details) => ({ ok: false, tool: tool.name, error: { code, message, ...(details ? { details } : {}) } });
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  const args = input ?? {};
  const problems = validateInput(tool.inputSchema, args);
  if (problems.length) return fail("INVALID_INPUT", "The input doesn't match this tool's schema.", problems.slice(0, 8));
  if (args.manifest !== undefined && new TextEncoder().encode(JSON.stringify(args.manifest)).length > MAX_MANIFEST_BYTES) {
    return fail("INPUT_TOO_LARGE", `Manifests over ${MAX_MANIFEST_BYTES / 1024} KiB aren't accepted.`);
  }
  const bundle = tool.needsBundle ? await ctx.loadBundle(signal) : null;
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  const result = await tool.run(args, { bundle, sha256: ctx.sha256 });
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  if (result?.error) return fail(result.error.code, result.error.message, Object.fromEntries(Object.entries(result.error).filter(([k]) => !["code", "message"].includes(k))));
  return { ok: true, tool: tool.name, tools_version: TOOLS_VERSION, ...(bundle ? { data_commit: bundle.commit } : {}), ...result };
}

export const toolCatalog = () => ({
  tools_version: TOOLS_VERSION,
  basis_legend: BASIS,
  conventions: "Every result has ok:true|false. Facts carry basis: verified, self-reported, missing, estimate, not-applicable or historical. null means unknown, never zero. Results link to evidence instead of embedding documents.",
  tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
});
