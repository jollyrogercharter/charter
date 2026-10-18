import { createHash } from "node:crypto";
import { DISCLAIMER, PILLARS, SPEC_VERSION, TOOL } from "./constants.mjs";

const GOOD = new Set(["verified", "present", "present-directory", "not-fetched", "not-run"]);
const LOCAL = new Set(["verified", "present", "present-directory"]);

const LEVEL_TEXT = {
  "not-applicable": "Not applicable",
  missing: "No evidence yet",
  exploring: "Exploring (no conformance claim)",
  partial: "Partly evidenced (self-reported)",
  "self-reported": "Evidenced (self-reported)",
  "independently-reproduced": "Reported as independently reproduced (review not verified by jrc)",
};

function pillarLevel(p, key, evidenceResults) {
  if (p.status === "not-applicable") return "not-applicable";
  if (p.status === "exploring") return "exploring";
  const evidenced = p.claims.filter((c, ci) => c.evidence.length && c.evidence.every((_, ei) => GOOD.has(evidenceResults[`$.pillars.${key}.claims[${ci}].evidence[${ei}]`])));
  if (!evidenced.length || p.status === "not-started") return "missing";
  if (p.status !== "evidenced" || evidenced.length !== p.claims.length) return "partial";
  return evidenced.every((c) => c.verification.level === "independently-reproduced") ? "independently-reproduced" : "self-reported";
}

export function buildReport(manifest, raw, { findings, evidenceResults }, manifestPath = "jrc.json") {
  const pillars = {};
  for (const { key, title } of PILLARS) {
    const p = manifest.pillars[key];
    const level = pillarLevel(p, key, evidenceResults);
    pillars[key] = {
      title,
      declared_status: p.status,
      level,
      ...(p.applicability ? { applicability: p.applicability } : {}),
      claims: p.claims.map((c, ci) => ({
        id: c.id,
        statement: c.statement,
        verification: c.verification.level,
        ...(c.verification.reviewer ? { reviewer: c.verification.reviewer, reviewed: c.verification.reviewed, review_report: c.verification.report } : {}),
        evidence: c.evidence.map((e, ei) => ({
          kind: e.kind,
          ref: e.path ?? e.url ?? e.command,
          result: evidenceResults[`$.pillars.${key}.claims[${ci}].evidence[${ei}]`] ?? "unchecked",
          ...(e.note ? { note: e.note } : {}),
        })),
      })),
      gaps: p.gaps ?? [],
      candidates: p.candidates ?? [],
    };
  }
  const levels = Object.values(pillars).map((p) => p.level);
  const applicable = levels.filter((l) => l !== "not-applicable").length;
  const evidenced = levels.filter((l) => l === "self-reported" || l === "independently-reproduced").length;
  const errors = findings.filter((f) => f.severity === "error").length;
  const locallyChecked = Object.values(pillars).filter((p) => (p.level === "self-reported" || p.level === "independently-reproduced") && p.claims.every((c) => c.evidence.some((e) => LOCAL.has(e.result)))).length;
  return {
    jrc_report: SPEC_VERSION,
    tool: TOOL,
    manifest: { path: manifestPath, sha256: createHash("sha256").update(raw).digest("hex") },
    project: manifest.project,
    assessment: manifest.assessment,
    summary: {
      valid: errors === 0,
      applicable_pillars: applicable,
      evidenced_pillars: evidenced,
      evidenced_with_local_files: locallyChecked,
      partial_pillars: levels.filter((l) => l === "partial").length,
      exploring_pillars: levels.filter((l) => l === "exploring").length,
      independently_reproduced_pillars: levels.filter((l) => l === "independently-reproduced").length,
      basis: manifest.assessment.kind === "independent" ? "independent assessment (not verified by jrc)" : "self-reported",
      errors,
      warnings: findings.filter((f) => f.severity === "warning").length,
    },
    pillars,
    findings,
    limitations: manifest.limitations ?? [],
    disclaimer: DISCLAIMER,
  };
}

// Every manifest-derived string goes through esc() or code(): no raw HTML, no line breaks, no Markdown structure.
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\u2060-\u2069\ufeff]+/g, " ");
const esc = (s) => clean(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_[\]|#~!])/g, "\\$1");
const code = (s) => `<code>${clean(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "&#124;")}</code>`;

export function reportMarkdown(r) {
  const s = r.summary;
  const out = [
    `# JRCv1 assessment: ${esc(r.project.name)}`,
    "",
    `> ${r.disclaimer}`,
    "",
    `- **Result:** ${s.valid ? "manifest valid" : `**manifest invalid** (${s.errors} error${s.errors === 1 ? "" : "s"})`}; ${s.evidenced_pillars} of ${s.applicable_pillars} applicable pillars evidenced (${s.evidenced_with_local_files} backed by local files), ${s.partial_pillars} partly, ${s.exploring_pillars} exploring. Basis: ${s.basis}.`,
    `- **Assessment:** ${esc(r.assessment.kind)}, by ${esc(r.assessment.assessor)}, ${esc(r.assessment.date)}${r.assessment.commit ? `, commit ${code(r.assessment.commit)}` : ""}.`,
    `- **Manifest:** ${code(r.manifest.path)}, SHA-256 ${code(r.manifest.sha256)}. Spec ${r.jrc_report} draft; ${r.tool.name} ${r.tool.version}.`,
    "",
    "| Pillar | Declared | Level | Claims | Gaps |",
    "|---|---|---|---:|---:|",
    ...Object.values(r.pillars).map((p) => `| ${p.title} | ${p.declared_status} | ${LEVEL_TEXT[p.level]} | ${p.claims.length} | ${p.gaps.length} |`),
    "",
  ];
  for (const p of Object.values(r.pillars)) {
    out.push(`## ${p.title}`, "", `**${LEVEL_TEXT[p.level]}.**${p.applicability ? ` ${esc(p.applicability)}` : ""}`, "");
    for (const c of p.claims) {
      out.push(`- **${esc(c.statement)}** (${code(c.id)}, ${c.verification}${c.reviewer ? ` by ${esc(c.reviewer)} on ${esc(c.reviewed)}, report: ${code(c.review_report)}` : ""})`);
      for (const e of c.evidence) out.push(`  - ${e.kind}: ${code(e.ref)} → ${e.result}${e.note ? ` (${esc(e.note)})` : ""}`);
      if (!c.evidence.length) out.push("  - no evidence yet");
    }
    if (p.gaps.length) out.push("", "Gaps:", ...p.gaps.map((g) => `- ${esc(g)}`));
    if (p.candidates.length) out.push("", "Candidate evidence (not yet reviewed, not counted):", ...p.candidates.map((c) => `- ${code(c)}`));
    out.push("");
  }
  if (r.findings.length) {
    out.push("## Findings", "", "| Severity | Code | Where | Message |", "|---|---|---|---|");
    for (const f of r.findings) out.push(`| ${f.severity} | ${f.code} | ${code(f.at)} | ${esc(f.message)} |`);
    out.push("");
  }
  if (r.limitations.length) out.push("## Stated limitations", "", ...r.limitations.map((l) => `- ${esc(l)}`), "");
  out.push("Evidence results: **verified** = file hash matched; **present** = file exists, content not checked; **not-fetched** = URL not opened (jrc works offline); **not-run** = command not executed (jrc never runs manifest commands). Only **verified** says anything about content.", "");
  return out.join("\n");
}

export function reportBadge(r) {
  const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const left = "JRCv1 draft";
  const right = r.summary.valid ? `${r.summary.evidenced_pillars}/${r.summary.applicable_pillars} ${r.summary.basis === "self-reported" ? "self-reported" : "independent, unverified"}` : "invalid manifest";
  const lw = 8 + left.length * 6.6, rw = 8 + right.length * 6.6, w = Math.round(lw + rw);
  const title = `JRCv1 draft: ${right}. Not a certification. Manifest ${r.manifest.sha256.slice(0, 12)}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><rect width="${Math.round(lw)}" height="20" fill="#16202e"/><rect x="${Math.round(lw)}" width="${Math.round(rw)}" height="20" fill="${r.summary.valid ? "#4a5568" : "#9e1b1b"}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="4" y="14">${xml(left)}</text><text x="${Math.round(lw) + 4}" y="14">${xml(right)}</text></g></svg>\n`;
}
