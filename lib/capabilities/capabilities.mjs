// Deterministic read-only capabilities. Every fact carries a `basis` so agents can tell checked facts from claims, gaps and estimates.
import { assessManifest, BROWSER_PROBE } from "../jrc/core.mjs";
import { PILLARS } from "../jrc/constants.mjs";
import { buildReport } from "../jrc/report.mjs";
import { CATEGORIES, summarize } from "../qm/expenses.mjs";

export const BASIS = {
  verified: "checked by a reproducible method anyone can repeat (file-hash comparison)",
  "self-reported": "the project's or manifest author's own claim; not independently checked",
  unchecked: "claimed with file evidence this tool couldn't read; neither confirmed nor refuted",
  missing: "not done, not supplied, or unknown",
  estimate: "a forecast or projection, not a recorded fact",
  "not-applicable": "doesn't apply, with a stated reason",
  historical: "true when recorded; kept as history, not a current claim",
};

const ref = (b, p) => `${b.site_url}${p}`;
// Text that came from a supplied manifest is clipped and marked, so agents don't mistake it for this site's own words.
const MAX_ECHO = 120;
const clip = (s) => { const t = String(s); return [...t].length > MAX_ECHO ? `${[...t].slice(0, MAX_ECHO).join("")}…` : t; };
const fromManifest = (s) => ({ text: clip(s), source: "supplied manifest (untrusted)" });
const src = (b, p) => `${b.repo_url}/blob/main/${p}`;

export function getCharter(b, { pillar } = {}) {
  const c = b.charter;
  const pillars = pillar ? c.pillars.filter((p) => p.key === pillar) : c.pillars;
  return {
    name: c.name,
    status: c.status,
    basis: "self-reported",
    manifest_spec: c.manifest_spec,
    pillars: pillar ? pillars : pillars.map(({ key, title, aspiration }) => ({ key, title, aspiration })),
    ...(pillar ? {} : { detail_hint: "pass { pillar } for evidence requirements and the assessment question" }),
    references: { charter: ref(b, "/charter/"), spec: ref(b, "/spec/"), schema: c.schema_url, source: src(b, "CHARTER.md") },
  };
}

const STATE_BASIS = { implemented: "self-reported", pending: "missing", blocked: "missing", historical: "historical" };

export function getProjectStatus(b, { state, area, id } = {}) {
  const s = b.status;
  if (id) {
    const item = s.items.find((i) => i.id === id);
    if (!item) return { error: { code: "NOT_FOUND", message: `no status item "${clip(id)}"`, known_ids: s.items.map((i) => i.id) } };
    return { as_of_utc: s.as_of_utc, item: { ...item, basis: STATE_BASIS[item.state] }, references: { status: ref(b, "/status/") } };
  }
  let items = s.items;
  if (state) items = items.filter((i) => i.state === state);
  if (area) items = items.filter((i) => i.area.toLowerCase() === area.toLowerCase());
  const counts = {};
  for (const i of s.items) counts[i.state] = (counts[i.state] ?? 0) + 1;
  const filtered = Boolean(state || area);
  const shown = filtered ? items : items.filter((i) => i.state === "pending" || i.state === "blocked");
  return {
    as_of_utc: s.as_of_utc,
    summary: s.summary,
    counts,
    basis_by_state: STATE_BASIS,
    // The unfiltered view lists ids only so it stays small as items are added; { id } gives the detail.
    [filtered ? "items" : "not_done"]: shown.map((i) => ({ id: i.id, ...(filtered ? { title: [...i.title].length > 48 ? `${[...i.title].slice(0, 47).join("")}\u2026` : i.title } : {}), state: i.state, ...(i.owner ? { owner: i.owner } : {}) })),
    ...(filtered ? {} : { implemented_ids: items.filter((i) => i.state === "implemented").map((i) => i.id), founder_dependencies: b.open_dependencies.length }),
    note: "The project's own records, not independent verification. Pass { id }, { state } or { area }.",
    references: { status: ref(b, "/status/"), source: src(b, "launch/status.json") },
  };
}

const EVIDENCE_BASIS = { verified: "verified", present: "self-reported", "present-directory": "self-reported", "not-fetched": "self-reported", "not-run": "self-reported", "not-checked": "unchecked" };

// Same engine as `jrc check`/`jrc report`, with the browser probe: file evidence is "not-checked", never "verified".
export function assessJrcManifest(manifest, { sha256, probe = BROWSER_PROBE } = {}) {
  const result = assessManifest(manifest, { probe });
  const errors = result.findings.filter((f) => f.severity === "error");
  if (!result.schemaOk) {
    return { valid: false, summary: null, errors: errors.slice(0, 8).map(({ code, at, message }) => ({ code, at: clip(at), message: clip(message) })), error_count: errors.length };
  }
  const r = buildReport(manifest, sha256, result, "supplied manifest");
  const pillars = Object.fromEntries(Object.entries(r.pillars).map(([k, p]) => {
    const ev = p.claims.flatMap((c) => c.evidence.map((e) => EVIDENCE_BASIS[e.result] ?? "missing"));
    const basis = p.level === "not-applicable" ? "not-applicable" : p.level === "missing" || p.level === "exploring" ? "missing" : ev.length && ev.every((x) => x === "verified") ? "verified" : ev.length && ev.every((x) => x === "unchecked") ? "unchecked" : "self-reported";
    return [k, { level: p.level, declared: p.declared_status, claims: p.claims.length, gaps: p.gaps.length, basis, ...(p.level === "independently-reproduced" ? { independence_verified: false } : {}) }];
  }));
  const ordered = [...errors, ...result.findings.filter((f) => f.severity === "warning")];
  const notChecked = Object.values(result.evidenceResults).filter((x) => x === "not-checked").length;
  return {
    valid: r.summary.valid,
    summary: { ...r.summary, file_evidence_not_checked: notChecked },
    pillars,
    findings: ordered.slice(0, 8).map(({ severity, code, at, message }) => ({ severity, code, at: clip(at), message: clip(message) })),
    findings_total: result.findings.length,
    canonical_json_sha256: sha256,
    note: `${notChecked ? `${notChecked} file evidence item(s) couldn't be read here and are unchecked: they count as claims, not proof. ` : ""}Run \`jrc check\` where the files are to verify hashes. canonical_json_sha256 hashes JSON.stringify of the supplied object, not the file bytes the CLI hashes. Not a certification.`,
    has_pinned_files: Object.values(manifest.pillars).some((p) => p.claims.some((c) => c.evidence.some((e) => e.kind === "file" && e.sha256))),
    _report: r,
  };
}

export function generateAdoptionPlan(assessment) {
  const steps = [];
  const add = (priority, action, why, extra = {}) => steps.push({ step: steps.length + 1, priority, action, why, ...extra });
  if (!assessment.summary) {
    add("high", "Fix the manifest so it matches the schema", `${assessment.error_count} schema error(s); nothing else can be assessed until they're fixed.`, { codes: [...new Set(assessment.errors.map((e) => e.code))], reference: "/spec/" });
    return { steps, basis: "derived from the assessment; not a certification" };
  }
  const r = assessment._report;
  const errs = r.findings.filter((f) => f.severity === "error");
  if (errs.length) add("high", `Fix ${errs.length} error(s) before publishing a report`, "jrc report refuses or marks the manifest invalid while errors remain.", { codes: [...new Set(errs.map((f) => f.code))].slice(0, 6) });
  if (assessment.summary.file_evidence_not_checked) add("high", "Run jrc check where the evidence files are", `${assessment.summary.file_evidence_not_checked} file evidence item(s) couldn't be read here, so nothing about them is confirmed yet.`, { command: "jrc check" });
  if (r.findings.some((f) => f.code === "W-PLACEHOLDER")) add("high", "Replace REPLACE: placeholders, starting with the assessor", "Unedited starter text makes the report meaningless.");
  for (const { key, title, asks } of PILLARS) {
    const p = r.pillars[key];
    if (p.level === "not-applicable") continue;
    if (p.level === "missing") add("medium", `Add a first claim with evidence for ${title}`, asks, { pillar: key });
    else if (p.level === "exploring") add("medium", `Decide what you can evidence for ${title}`, "Exploring means no conformance claim yet; move to partial once one claim has evidence.", { pillar: key });
    else if (p.level === "partial") add("medium", `Close the known gaps in ${title}`, "Unproven claims or open gaps remain.", { pillar: key, ...(p.gaps.length ? { first_gap: fromManifest(p.gaps[0]), gaps_total: p.gaps.length } : {}) });
  }
  if (!assessment.has_pinned_files) add("low", "Pin key evidence files with sha256", "Only hash-pinned files can be verified; everything else stays self-reported.", { reference: "/spec/" });
  if (r.summary.valid) add("low", "Publish the report", "Readers can only check claims they can see.", { command: "jrc report --out jrc-report" });
  if (r.summary.independently_reproduced_pillars) add("medium", "Check that every claimed independent reproduction is public and by someone unaffiliated", "jrc records independence claims but can't verify them; readers will look for the reviewer's own report.", { reference: "/challenge/" });
  else add("low", "Ask someone unaffiliated to take the Jolly Roger Challenge", "Self-reports are a starting point; independent reproduction is the real test.", { command: "jrc challenge --out CHALLENGE-LOG.md", reference: "/challenge/" });
  return { steps: steps.slice(0, 12), basis: "derived from the assessment; not a certification" };
}

const COST_BASIS = (e) => (e.amount === null ? "missing" : e.category === "forecast" ? "estimate" : "self-reported");

export function getProjectCosts(b, { category } = {}) {
  const l = b.ledger;
  const s = summarize(l);
  const entries = l.entries
    .filter((e) => !category || e.category === category)
    .map((e) => ({ id: e.id, ...(category ? { item: e.item } : { category: e.category }), amount: e.amount, ...(e.hours !== undefined ? { hours: e.hours } : {}), basis: COST_BASIS(e), ...(category ? { source_kind: l.sources.find((x) => x.id === e.source)?.kind, recurrence: e.recurrence ?? null } : {}) }));
  return {
    as_of_utc: l.as_of_utc,
    currency: l.currency,
    statement: s.statement,
    totals: Object.fromEntries(Object.entries(s.categories).filter(([k, v]) => v.entries && (!category || k === category)).map(([k, v]) => [k, {
      known_amount: v.entries > v.unknown_amounts ? v.known_amount : null,
      unknown_amounts: v.unknown_amounts,
      ...(k === "donated-labor" || k === "user-attention" ? { known_hours: v.entries > v.unmeasured_hours ? v.known_hours : null, unmeasured_hours: v.unmeasured_hours } : {}),
    }])),
    entries,
    note: "Categories are never added together; null means unknown. From a manual ledger; no billing integration. Pass { category } for item details.",
    references: { costs: ref(b, "/costs/"), ledger: ref(b, "/costs/ledger.json"), format: ref(b, "/spec/quartermaster/") },
  };
}

export function getOpenChallenges(b, { step } = {}) {
  if (step) {
    const s = b.challenge_steps.find((x) => x.id === step);
    if (!s) return { error: { code: "NOT_FOUND", message: `no challenge step "${clip(step)}"`, known_steps: b.challenge_steps.map((x) => x.id) } };
    return { step: s, references: { challenge: ref(b, "/challenge/"), log_template: ref(b, "/challenge/log-template.md") } };
  }
  const repro = b.status.items.find((i) => i.id === "independent-reproduction");
  const open = b.status.items.filter((i) => (i.state === "pending" || i.state === "blocked") && i.owner !== "human").map((i) => ({ id: i.id, title: i.title }));
  return {
    question: "Could your software survive without you?",
    steps: b.challenge_steps.map(({ id, title }) => ({ id, title })),
    this_project: { independent_reproduction: repro ? repro.state : "unknown", basis: repro?.state === "implemented" ? "self-reported" : "missing" },
    contribution_opportunities: open,
    note: "Pass { step } for what a step asks. No permission needed; partial and failed attempts count.",
    references: { challenge: ref(b, "/challenge/"), log_template: ref(b, "/challenge/log-template.md"), report_attempt: `${b.repo_url}/issues/new?template=reproduction-challenge.md` },
  };
}
