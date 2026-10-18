// Deterministic read-only capabilities. Every fact carries a `basis` so agents can tell checked facts from claims, gaps and estimates.
import { assessManifest, BROWSER_PROBE } from "../jrc/core.mjs";
import { PILLARS } from "../jrc/constants.mjs";
import { buildReport } from "../jrc/report.mjs";
import { CATEGORIES, summarize } from "../qm/expenses.mjs";

export const BASIS = {
  verified: "checked by a reproducible method anyone can repeat (hash comparison, block header)",
  "self-reported": "the project's or manifest author's own claim; not independently checked",
  missing: "not done, not supplied, or unknown",
  estimate: "a forecast or projection, not a recorded fact",
  "not-applicable": "doesn't apply, with a stated reason",
  historical: "true when recorded; kept as history, not a current claim",
};

const ref = (b, p) => `${b.site_url}${p}`;
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
    if (!item) return { error: { code: "NOT_FOUND", message: `no status item "${id}"`, known_ids: s.items.map((i) => i.id) } };
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
    [filtered ? "items" : "not_done"]: shown.map((i) => ({ id: i.id, title: i.title, state: i.state, ...(i.owner ? { owner: i.owner } : {}) })),
    ...(filtered ? {} : { implemented_ids: items.filter((i) => i.state === "implemented").map((i) => i.id), founder_dependencies: b.open_dependencies.length }),
    note: "The project's own records; 'implemented' isn't independent verification. Pass { id } for evidence, or { state } / { area } to filter.",
    references: { status: ref(b, "/status/"), source: src(b, "launch/status.json"), dependencies: src(b, "OPEN-DEPENDENCIES.md") },
  };
}

const EVIDENCE_BASIS = { verified: "verified", present: "self-reported", "present-directory": "self-reported", "not-fetched": "self-reported", "not-run": "self-reported", "not-checked": "self-reported" };

// Same engine as `jrc check`/`jrc report`, with the browser probe: file evidence is "not-checked", never "verified".
export function assessJrcManifest(manifest, { sha256, probe = BROWSER_PROBE } = {}) {
  const result = assessManifest(manifest, { probe });
  const errors = result.findings.filter((f) => f.severity === "error");
  if (!result.schemaOk) {
    return { valid: false, summary: null, errors: errors.slice(0, 8).map(({ code, at, message }) => ({ code, at, message })), error_count: errors.length };
  }
  const r = buildReport(manifest, sha256, result, "supplied manifest");
  const pillars = Object.fromEntries(Object.entries(r.pillars).map(([k, p]) => {
    const ev = p.claims.flatMap((c) => c.evidence.map((e) => EVIDENCE_BASIS[e.result] ?? "missing"));
    const basis = p.level === "not-applicable" ? "not-applicable" : p.level === "missing" || p.level === "exploring" ? "missing" : ev.includes("verified") && ev.every((x) => x === "verified") ? "verified" : "self-reported";
    return [k, { level: p.level, declared: p.declared_status, claims: p.claims.length, gaps: p.gaps.length, basis }];
  }));
  const ordered = [...errors, ...result.findings.filter((f) => f.severity === "warning")];
  return {
    valid: r.summary.valid,
    summary: r.summary,
    pillars,
    findings: ordered.slice(0, 8).map(({ severity, code, at, message }) => ({ severity, code, at, message })),
    findings_total: result.findings.length,
    manifest_sha256: sha256,
    note: "File evidence can't be read from here, so it is reported as not-checked. Run `jrc check` where the files are for hash verification. This is not a certification.",
    _report: r,
  };
}

export function generateAdoptionPlan(assessment) {
  const steps = [];
  const add = (priority, action, why, extra = {}) => steps.push({ step: steps.length + 1, priority, action, why, ...extra });
  if (!assessment.summary) {
    add("high", "Fix the manifest so it matches the schema", `${assessment.error_count} schema error(s); nothing else can be assessed until they're fixed.`, { codes: [...new Set(assessment.errors.map((e) => e.code))], reference: "/spec/" });
    return { steps, basis: "derived deterministically from the assessment; not a certification" };
  }
  const r = assessment._report;
  const errs = r.findings.filter((f) => f.severity === "error");
  if (errs.length) add("high", `Fix ${errs.length} error(s) before publishing a report`, "jrc report refuses or marks the manifest invalid while errors remain.", { codes: [...new Set(errs.map((f) => f.code))].slice(0, 6) });
  if (r.findings.some((f) => f.code === "W-PLACEHOLDER")) add("high", "Replace REPLACE: placeholders, starting with the assessor", "Unedited starter text makes the report meaningless.");
  for (const { key, title, asks } of PILLARS) {
    const p = r.pillars[key];
    if (p.level === "not-applicable") continue;
    if (p.level === "missing") add("medium", `Add a first claim with evidence for ${title}`, asks, { pillar: key });
    else if (p.level === "exploring") add("medium", `Decide what you can evidence for ${title}`, "Exploring means no conformance claim yet; move to partial once one claim has evidence.", { pillar: key });
    else if (p.level === "partial") add("medium", `Close the known gaps in ${title}`, p.gaps.length ? p.gaps.slice(0, 2).join(" ") : "Some claims lack passing evidence, or the status isn't 'evidenced'.", { pillar: key });
  }
  const hashed = Object.values(r.pillars).some((p) => p.claims.some((c) => c.evidence.some((e) => e.result === "verified")));
  if (!hashed) add("low", "Pin key evidence files with sha256", "Only hash-pinned files count as verified; everything else is self-reported.", { reference: "/spec/" });
  if (r.summary.valid) add("low", "Publish the report", "Readers can only check claims they can see.", { command: "jrc report --out jrc-report" });
  if (!r.summary.independently_reproduced_pillars) add("low", "Ask someone unaffiliated to take the Jolly Roger Challenge", "Self-reports are a starting point; independent reproduction is the real test.", { command: "jrc challenge --out CHALLENGE-LOG.md", reference: "/challenge/" });
  return { steps: steps.slice(0, 12), basis: "derived deterministically from the assessment; not a certification" };
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
    totals: Object.fromEntries(Object.entries(s.categories).filter(([k, v]) => v.entries && (!category || k === category)).map(([k, v]) => [k, { known_amount: v.known_amount, unknown_amounts: v.unknown_amounts, ...(k === "donated-labor" || k === "user-attention" ? { known_hours: v.known_hours, unmeasured_hours: v.unmeasured_hours } : {}) }])),
    entries,
    note: "Categories are never added together; null means unknown. From a manual ledger; no billing integration. Pass { category } for item details.",
    references: { costs: ref(b, "/costs/"), ledger: ref(b, "/costs/ledger.json"), format: ref(b, "/spec/quartermaster/") },
  };
}

export function getOpenChallenges(b, { step } = {}) {
  if (step) {
    const s = b.challenge_steps.find((x) => x.id === step);
    if (!s) return { error: { code: "NOT_FOUND", message: `no challenge step "${step}"`, known_steps: b.challenge_steps.map((x) => x.id) } };
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

export function getProvenance(b, { path } = {}) {
  const m = b.provenance;
  if (path) {
    const f = m.files.find((x) => x.path === path) ?? (m.received_package?.file === path ? { path, bytes: m.received_package.bytes, sha256: m.received_package.sha256 } : null);
    if (!f) return { error: { code: "NOT_FOUND", message: `no digest recorded for "${path}"`, hint: "paths are as committed at the preservation commit, e.g. MANIFESTO.md" } };
    return { file: f, preservation_commit: m.preservation_commit, basis: "verified", how: `recompute: git show ${m.preservation_commit.slice(0, 7)}:${f.path} | shasum -a 256`, references: { provenance: ref(b, "/provenance/") } };
  }
  const ts = m.timestamp_state;
  return {
    digests: { files: m.files.length, preservation_commit: m.preservation_commit, basis: "verified", how: "recomputed from Git by the test suite on every build; anyone can repeat it" },
    timestamp: {
      state: ts,
      basis: ts === "verified" ? "verified" : "missing",
      ...(ts === "verified" ? { attested_no_later_than_utc: m.bitcoin_attestation_time_utc, block: m.bitcoin_attestation?.earliest_block_height ?? null, method: m.verification_method } : { note: ts === "pending" ? "submitted but not yet attested in Bitcoin; a pending proof is not a verified timestamp" : "no timestamp requested" }),
      artifact: m.timestamped_artifact ? { path: m.timestamped_artifact.path, sha256: m.timestamped_artifact.sha256 } : null,
    },
    founding_transcript: { state: m.founding_transcript.state, basis: "missing" },
    note: "Digests and timestamps show bytes existed by a time; not authorship, originality or priority. Pass { path } for one file's digest. Full limitations: see manifest.",
    references: { provenance: ref(b, "/provenance/"), manifest: ref(b, "/provenance/launch-manifest.json"), verify: src(b, "provenance/VERIFY.md") },
  };
}
