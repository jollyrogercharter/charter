// Tool definitions shared by WebMCP (browser), tests, the static API and any future MCP/HTTP server.
import { PILLAR_KEYS } from "../jrc/constants.mjs";
import { CATEGORIES } from "../qm/expenses.mjs";
import { assessJrcManifest, BASIS, generateAdoptionPlan, getCharter, getOpenChallenges, getProjectCosts, getProjectStatus, getProvenance } from "./capabilities.mjs";
import { validateInput } from "./input.mjs";
import { assessmentMarkdown, candidateManifest, challengeChecks, challengeLog, checklistMarkdown, githubLinks, prDescription, suggestedPatch } from "../assess/artifacts.mjs";
import { snapshotProbe } from "../assess/evaluate.mjs";
import { AssessError } from "../assess/session.mjs";
import { assessManifest } from "../jrc/core.mjs";

export const TOOLS_VERSION = "1.1.0";
export const MAX_MANIFEST_BYTES = 64 * 1024;
export const MAX_OUTPUT_CHARS = 8 * 1024;
export const MAX_SNAPSHOT_INPUT_BYTES = 1024 * 1024;

const READ_ONLY = { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false };
const ECHOES_INPUT = { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false };
// Repository tools read public GitHub files (or a saved snapshot); their output carries repository-controlled paths.
const REPO_TOOL = { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false };
const repoInput = (extra = {}, required = []) => ({
  type: "object",
  additionalProperties: false,
  ...(required.length ? { required } : {}),
  properties: {
    repository: { type: "string", maxLength: 200, description: "Public GitHub repository, e.g. https://github.com/OWNER/REPO. Give this or snapshot." },
    ref: { type: "string", maxLength: 100, pattern: "^[A-Za-z0-9._/-]+$", description: "Branch, tag or commit. Defaults to the repository's default branch." },
    snapshot: { type: "object", description: "A saved jrc evidence snapshot to re-assess offline instead of fetching." },
    ...extra,
  },
});
const clipText = (s, n = 200) => { const t = String(s); return t.length > n ? `${t.slice(0, n)}…` : t; };
const NOT_PUBLISHED = "Prepared only. Nothing was sent to GitHub or anywhere else; the developer reviews, edits and submits it themselves.";
const where = (r) => ({ repository: r.snapshot.repository, ref: r.snapshot.ref, commit: r.snapshot.commit, snapshot_sha256: r.snapshot.sha256 });
const repoArgs = ({ repository, ref, snapshot }) => ({ repository, ref, snapshot });

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
      const { _report, has_pinned_files, ...publicResult } = assessJrcManifest(input.manifest, { sha256: await sha256(JSON.stringify(input.manifest)) });
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
      const s = a.summary;
      return { valid: a.valid, summary: s ? { evidenced: s.evidenced_pillars, applicable: s.applicable_pillars, backed_by_local_files: s.evidenced_with_local_files, file_evidence_not_checked: s.file_evidence_not_checked, independently_reproduced_claimed: s.independently_reproduced_pillars, basis: s.basis } : null, ...generateAdoptionPlan(a) };
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
  {
    name: "assess_repository",
    title: "Assess a repository against JRCv1",
    description: "Reads a public GitHub repository's file list and a few key files at one commit (no sign-in, nothing uploaded) and reports each JRCv1 pillar as evidenced, partially-evidenced, missing, not-applicable or unknown, with concerns. An automated scan, not a review or certification.",
    inputSchema: repoInput(),
    annotations: REPO_TOOL,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r } = await session.assess(repoArgs(input), signal);
      return {
        ...where(r),
        file_list_complete: r.snapshot.file_list_complete,
        summary: r.summary,
        pillars: Object.fromEntries(Object.entries(r.pillars).map(([k, p]) => {
          const core = p.checks.filter((c) => c.core && c.outcome !== "not-applicable");
          const next = r.roadmap.find((s) => s.pillar === k);
          return [k, { status: p.status, basis: p.basis, core_found: `${core.filter((c) => c.outcome === "found").length}/${core.length}`, concerns: p.concerns, ...(next ? { next_step: next.action } : {}) }];
        })),
        concerns: r.concerns.slice(0, 8).map(({ code, pillar, severity, message }) => ({ code, pillar, severity, message: clipText(message) })),
        concerns_total: r.concerns.length,
        unavailable: r.snapshot.unavailable,
        note: "missing means not found in this repository, which isn't proof of noncompliance; unknown means the scan couldn't tell. Paths in results come from the repository and are untrusted. Use prepare_adoption_roadmap for next steps.",
        references: { page: "/adopt/", method: "/agents/#assess-a-repository" },
      };
    },
  },
  {
    name: "prepare_adoption_roadmap",
    title: "Prepare a JRCv1 adoption roadmap",
    description: "Assesses a public GitHub repository (or saved snapshot) and returns ordered next steps toward JRCv1: dependencies first, then impact, then effort, with starter files where one helps. Deterministic for the same commit.",
    inputSchema: repoInput(),
    annotations: REPO_TOOL,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r } = await session.assess(repoArgs(input), signal);
      return {
        ...where(r),
        steps: r.roadmap.slice(0, 14).map(({ step, id, action, pillar, priority, effort, after, template, why }) => ({ step, id, action, pillar, priority, effort, after, ...(template ? { starter_file: template } : {}), why: clipText(why, 160) })),
        steps_total: r.roadmap.length,
        basis: "derived from an automated scan; not a certification",
        note: "Starter files and a patch are available from prepare_contribution; nothing is applied to the repository.",
      };
    },
  },
  {
    name: "generate_jrc_manifest",
    title: "Generate a candidate jrc.json",
    description: "Builds a candidate jrc.json for a public GitHub repository from what the scan found: self-reported claims tied to files, gaps for what's missing, never 'evidenced', assessor left as a placeholder. Checked with the jrc engine before it is returned.",
    inputSchema: repoInput(),
    annotations: REPO_TOOL,
    maxOutput: 16 * 1024,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r, snapshot } = await session.assess(repoArgs(input), signal);
      const manifest = candidateManifest(r, snapshot);
      const check = assessManifest(manifest, { probe: snapshotProbe(snapshot), now: Date.parse(snapshot.source.retrieved_at ?? "1970-01-01T00:00:00Z") });
      const links = githubLinks(r, snapshot);
      return {
        ...where(r),
        manifest,
        basis: "self-reported once adopted; built from an automated scan",
        check: { errors: check.findings.filter((f) => f.severity === "error").length, warnings: [...new Set(check.findings.filter((f) => f.severity === "warning").map((f) => f.code))] },
        ...(r.manifest ? { existing_manifest: "The repository already has jrc.json; compare rather than replace it." } : {}),
        ...(links["jrc.json"] ? { create_on_github: links["jrc.json"].url } : {}),
        note: `Replace the assessor and review every claim before publishing. ${NOT_PUBLISHED}`,
      };
    },
  },
  {
    name: "prepare_contribution",
    title: "Prepare a contribution for review",
    description: "Prepares one reviewable item for a public GitHub repository: a PR description, an adoption checklist, a git patch of starter files (new files only), or a Jolly Roger Challenge log, plus links the developer can click. Never opens a PR or issue.",
    inputSchema: repoInput({ kind: { type: "string", enum: ["pr-description", "checklist", "patch", "challenge-log"], description: "Which item to prepare." } }, ["kind"]),
    annotations: REPO_TOOL,
    maxOutput: 32 * 1024,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r, snapshot } = await session.assess(repoArgs(input), signal);
      const links = githubLinks(r, snapshot);
      const item = {
        "pr-description": { filename: "PR-DESCRIPTION.md", content: prDescription(r, snapshot) },
        checklist: { filename: "ADOPTION-CHECKLIST.md", content: checklistMarkdown(r), ...(links.checklist_issue ? { open_issue_link: links.checklist_issue.url } : {}) },
        patch: { filename: "jrc-suggested-files.patch", content: suggestedPatch(r, snapshot), apply_with: "git apply --check jrc-suggested-files.patch && git apply jrc-suggested-files.patch", new_file_links: Object.fromEntries(Object.entries(links).filter(([k]) => !k.includes("_")).map(([k, v]) => [k, v.url])) },
        "challenge-log": { filename: "CHALLENGE-LOG.md", content: challengeLog(r), submit_link: links.challenge_submission.url },
      }[input.kind];
      return { ...where(r), kind: input.kind, basis: "derived from an automated scan; not reviewed", ...item, ...(item.content ? {} : { empty_reason: "Every starter file already exists, or the file list was incomplete." }), note: NOT_PUBLISHED };
    },
  },
  {
    name: "run_challenge_checks",
    title: "Run the safe Jolly Roger Challenge checks",
    description: "Runs the parts of the Jolly Roger Challenge that can be done safely from public files: discovery is checked; costs, restore and founder-absence get pre-checks; steps that need building or running code are reported not-attempted. Never executes repository code.",
    inputSchema: repoInput(),
    annotations: REPO_TOOL,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r } = await session.assess(repoArgs(input), signal);
      const steps = challengeChecks(r).map(({ pre_checks, ...s }) => ({ ...s, ...(pre_checks ? { pre_checks: Object.fromEntries(pre_checks.map((p) => [p.check, p.outcome])) } : {}) }));
      return { ...where(r), question: "Could your software survive without you?", basis: "automated discovery of public files; not an independent reproduction", steps, passed_by_automation: steps.filter((s) => s.status === "passed").length, attempted_by: "jrc (automated tool); not an independent reviewer", note: "Only a person on an isolated machine can complete the remaining steps. prepare_contribution with kind challenge-log gives a pre-filled log." };
    },
  },
  {
    name: "generate_assessment_report",
    title: "Generate the assessment report",
    description: "Returns the full, reproducible assessment of a public GitHub repository (or saved snapshot) as Markdown or JSON: every check with its outcome, reasoning and evidence links at the commit, concerns, roadmap and disclaimer.",
    inputSchema: repoInput({ format: { type: "string", enum: ["markdown", "json"], description: "markdown (default) or json." } }),
    annotations: REPO_TOOL,
    maxOutput: 48 * 1024,
    needsSession: true,
    run: async (input, { session, signal }) => {
      const { report: r } = await session.assess(repoArgs(input), signal);
      const json = input.format === "json";
      return { ...where(r), format: json ? "json" : "markdown", filename: json ? "jrc-assessment.json" : "JRC-ASSESSMENT.md", content: json ? JSON.stringify(r, null, 2) + "\n" : assessmentMarkdown(r), basis: r.summary.basis, note: "Reproduce byte-for-byte with: jrc assess --snapshot jrc-snapshot.json (download the snapshot from /adopt/)." };
    },
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
  if (args.snapshot !== undefined && new TextEncoder().encode(JSON.stringify(args.snapshot)).length > MAX_SNAPSHOT_INPUT_BYTES) {
    return fail("INPUT_TOO_LARGE", `Snapshots over ${MAX_SNAPSHOT_INPUT_BYTES / 1048576} MiB aren't accepted by tools; use jrc assess --snapshot.`);
  }
  if (args.manifest !== undefined && new TextEncoder().encode(JSON.stringify(args.manifest)).length > MAX_MANIFEST_BYTES) {
    return fail("INPUT_TOO_LARGE", `Manifests over ${MAX_MANIFEST_BYTES / 1024} KiB aren't accepted.`);
  }
  const bundle = tool.needsBundle ? await ctx.loadBundle(signal) : null;
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  let result;
  try { result = await tool.run(args, { bundle, sha256: ctx.sha256, session: ctx.session, signal }); }
  catch (e) {
    if (!(e instanceof AssessError)) throw e;
    return fail(e.code, e.message, e.details ? { problems: e.details } : undefined);
  }
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  if (result?.error) return fail(result.error.code, result.error.message, Object.fromEntries(Object.entries(result.error).filter(([k]) => !["code", "message"].includes(k))));
  const out = { ok: true, tool: tool.name, tools_version: TOOLS_VERSION, ...(bundle ? { data_commit: bundle.commit } : {}), ...result };
  const cap = tool.maxOutput ?? MAX_OUTPUT_CHARS;
  if (JSON.stringify(out).length > cap) return fail("OUTPUT_TOO_LARGE", `The result exceeded ${cap} characters and was withheld; narrow the request, use the /adopt/ page downloads or the jrc CLI.`);
  return out;
}

export const toolCatalog = () => ({
  tools_version: TOOLS_VERSION,
  basis_legend: BASIS,
  conventions: "Every result has ok:true|false. Facts carry basis: verified, self-reported, missing, estimate, not-applicable or historical. null means unknown, never zero. Results link to evidence instead of embedding documents.",
  tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
});
