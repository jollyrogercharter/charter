// Pure rendering for /adopt/: data in, escaped HTML strings out. Repository-derived text only ever passes through e().
const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeUrl = (u) => (typeof u === "string" && /^https:\/\/(github\.com|jollyrogercharter\.org)\//.test(u) ? u : null);
const link = (u, text) => { const s = safeUrl(u); return s ? `<a href="${e(s)}" rel="noopener noreferrer">${text}</a>` : text; };

export const STATUS_LABEL = { evidenced: "Evidenced", "partially-evidenced": "Partly evidenced", missing: "No evidence found", "not-applicable": "Not applicable", unknown: "Unknown" };
const OUTCOME_LABEL = { found: "Found", "not-found": "Not found", contradicted: "Contradicted", "not-checked": "Couldn't check", "not-applicable": "Not applicable" };
const LEVEL_LABEL = { "not-applicable": "Not applicable", missing: "No evidence yet", exploring: "Exploring", partial: "Partly evidenced", "self-reported": "Evidenced (self-reported)", "independently-reproduced": "Reported as independently reproduced" };
const STAGES = [["metadata", "Read repository settings"], ["commit", "Pin the commit"], ["tree", "Read the file list"], ["files", "Read key files"], ["evaluate", "Evaluate the six pillars"]];
const short = (c) => (c ? c.slice(0, 7) : "");
const blob = (r, p) => (r.snapshot.repository && r.snapshot.commit ? `${r.snapshot.repository}/blob/${r.snapshot.commit}/${p.split("/").map(encodeURIComponent).join("/")}` : null);

export function progressHtml(events) {
  const seen = new Map(events.map((x) => [x.stage, x]));
  const last = events.at(-1)?.stage;
  return `<ol class="progress">${STAGES.map(([id, label]) => {
    const ev = seen.get(id);
    const state = !ev ? "waiting" : id === last && id !== "done" ? "active" : "done";
    const extra = id === "commit" && ev?.ref ? ` (${e(ev.ref)})` : id === "tree" && ev?.commit ? ` at ${e(short(ev.commit))}` : id === "files" && ev ? ` (${e(ev.files)} of ${e(ev.entries)} paths)` : "";
    return `<li class="${state}"><span class="visually-hidden">${state === "done" ? "Done: " : state === "active" ? "In progress: " : "Waiting: "}</span>${label}${extra}</li>`;
  }).join("")}</ol>`;
}

export function errorHtml(err) {
  const details = (err.details ?? []).slice(0, 8).map((d) => `<li><code>${e(d.at)}</code>: ${e(d.message)}</li>`).join("");
  return `<div class="notice" role="alert"><p><strong>Couldn't assess this (${e(err.code ?? "error")}).</strong> ${e(err.message)}</p>${details ? `<ul>${details}</ul>` : ""}</div>`;
}

function checksTable(r, p) {
  return `<div class="table-scroll"><table><caption class="visually-hidden">Checks for ${e(p.title)}</caption><thead><tr><th scope="col">Check</th><th scope="col">Outcome</th><th scope="col">Why</th><th scope="col">Evidence</th></tr></thead><tbody>${p.checks.map((c) => `<tr><td>${e(c.title)}${c.core ? "" : ' <span class="muted">(supporting)</span>'}</td><td><span class="badge outcome-${e(c.outcome)}">${OUTCOME_LABEL[c.outcome]}</span></td><td>${e(c.why)}</td><td>${c.evidence.map((x) => link(blob(r, x), `<code>${e(x)}</code>`)).join("<br>")}${c.evidence_total > c.evidence.length ? `<br>and ${c.evidence_total - c.evidence.length} more` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

export function reportHtml(r) {
  const s = r.summary;
  const src = r.snapshot.repository ? `${link(r.snapshot.repository, e(r.snapshot.repository.replace("https://github.com/", "")))}${r.snapshot.commit ? ` at ${link(`${r.snapshot.repository}/tree/${r.snapshot.commit}`, `<code>${e(short(r.snapshot.commit))}</code>`)}` : ""}` : `local directory <code>${e(r.snapshot.name)}</code>`;
  const counts = ["evidenced", "partially-evidenced", "missing", "unknown", "not-applicable"].map((k) => `<li><span class="count">${s[k]}</span> ${STATUS_LABEL[k].toLowerCase()}</li>`).join("");
  const concerns = r.concerns.length ? `<div class="notice"><h3>Concerns (${r.concerns.length})</h3><p>Things the repository contradicts or gets wrong, as opposed to evidence that is simply absent.</p><ul>${r.concerns.map((c) => `<li><strong>${e(c.severity)}</strong> <code>${e(c.code)}</code>${c.pillar ? ` (${e(r.pillars[c.pillar].title)})` : ""}: ${e(c.message)}</li>`).join("")}</ul></div>` : "";
  const pillars = Object.entries(r.pillars).map(([k, p]) => `<details class="pillar" id="pillar-${e(k)}"${p.status === "evidenced" || p.status === "not-applicable" ? "" : " open"}><summary><span class="pillar-title">${e(p.title)}</span> <span class="badge status-${e(p.status)}">${STATUS_LABEL[p.status]}</span></summary><p class="muted"><em>${e(p.question)}</em></p><p>${e(p.explanation)}</p>${checksTable(r, p)}${p.manifest ? `<p>The repository's jrc.json declares <strong>${e(p.manifest.declared)}</strong> with ${e(p.manifest.claims)} claim(s).</p>` : ""}</details>`).join("");
  return `<h2 id="results-heading" tabindex="-1">Assessment of ${e(r.snapshot.name ?? "the repository")}</h2>
<p class="meta">${src}${r.snapshot.retrieved_at ? `, read ${e(r.snapshot.retrieved_at)}` : ""}. ${r.snapshot.file_list_complete ? "Whole file list read" : "<strong>File list incomplete: some absences are unknown</strong>"}; ${e(r.snapshot.files_read)} files read for content.${r.snapshot.skipped_unsafe_paths ? ` ${e(r.snapshot.skipped_unsafe_paths)} paths with hidden characters ignored.` : ""} jrc.json: ${e(s.manifest)}.</p>
<p class="notice small">${e(r.disclaimer)}</p>
<ul class="counts">${counts}</ul>
${concerns}
<h3>The six pillars</h3>
${pillars}`;
}

export function roadmapHtml(r) {
  return `<h3 id="roadmap">Your path to adoption</h3><p>Ordered so nothing comes before what it depends on, then by impact, then by effort.</p><ol class="roadmap">${r.roadmap.map((s) => `<li id="step-${e(s.id)}"><strong>${e(s.action)}</strong> <span class="badge ${s.priority === "fix first" ? "pending" : ""}">${e(s.priority === "fix first" ? "fix first" : `${s.impact} impact`)}</span> <span class="badge">${e(s.effort)} effort</span><br>${e(s.why)}${s.detail ? ` ${e(s.detail)}` : ""}${s.after.length ? `<br><span class="muted">After: ${s.after.map((a) => e(r.roadmap.find((x) => x.id === a)?.action ?? a)).join("; ")}</span>` : ""}${s.template ? `<br><span class="muted">Starter file in the patch: <code>${e(s.template)}</code></span>` : ""}</li>`).join("")}</ol>`;
}

export function challengeHtml(steps) {
  return `<h3 id="challenge-checks">Jolly Roger Challenge: what could be checked safely</h3><p>Only discovery can be done from public files. Steps that need the code built or run are left for a person on an isolated machine; this page never runs repository code.</p><div class="table-scroll"><table><thead><tr><th scope="col">Step</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead><tbody>${steps.map((s) => `<tr><td>${e(s.title)}</td><td><span class="badge">${e(s.status)}</span>${s.automated ? '<br><span class="muted">automated</span>' : ""}</td><td>${e(s.reason)}${s.pre_checks ? `<ul>${s.pre_checks.map((p) => `<li>${e(p.title)}: ${OUTCOME_LABEL[p.outcome].toLowerCase()}</li>`).join("")}</ul>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

const DESCRIBE = {
  "JRC-ASSESSMENT.md": "Human-readable report", "jrc-assessment.json": "Machine-readable report", "jrc.candidate.json": "Candidate manifest (rename to jrc.json after review)",
  "ADOPTION-CHECKLIST.md": "Adoption checklist", "jrc-suggested-files.patch": "Starter files as a git patch (new files only)", "PR-DESCRIPTION.md": "Suggested pull-request description",
  "CHALLENGE-LOG.md": "Pre-filled challenge log", "jrc-snapshot.json": "Evidence snapshot, to reproduce this exact report", "JRC-REPORT.md": "Human-readable report", "jrc-report.json": "Machine-readable report", "ADOPTION-PLAN.md": "Next steps",
};

export function downloadsHtml(files, links = {}) {
  const rows = Object.keys(files).map((name, i) => `<li><span>${e(DESCRIBE[name] ?? name)}: <code>${e(name)}</code></span> <button type="button" data-download="${i}">Download <span class="visually-hidden">${e(name)}</span></button> <button type="button" data-copy="${i}">Copy <span class="visually-hidden">${e(name)}</span></button></li>`).join("");
  const gh = Object.entries(links).map(([k, v]) => {
    const label = k === "checklist_issue" ? "Open the checklist as an issue in your repository" : k === "challenge_submission" ? "Submit the challenge log to the charter repository" : `Create <code>${e(k)}</code> in your repository`;
    return safeUrl(v.url) ? `<li>${link(v.url, label)}${v.prefilled ? "" : " (too long to prefill; paste the downloaded file)"}</li>` : "";
  }).join("");
  return `<h3 id="downloads">Results to review</h3><p>Nothing has been published. Review and edit these before using them.</p><ul class="downloads">${rows}</ul>${gh ? `<h4>Open on GitHub</h4><p>These links open GitHub with the content filled in. GitHub asks you to sign in and confirm; nothing is sent from this page.</p><ul>${gh}</ul>` : ""}`;
}

export function reproduceHtml(r) {
  return `<h3 id="reproduce">Reproduce this assessment</h3><p>Download the evidence snapshot, then anyone can regenerate this exact report offline:</p><pre><code>npx --yes --package=github:jollyrogercharter/charter jrc assess --snapshot jrc-snapshot.json --format json</code></pre>${r.snapshot.sha256 ? `<p>Snapshot SHA-256 <code class="hash">${e(r.snapshot.sha256)}</code>.</p>` : ""}`;
}

export function manifestHtml(a, plan) {
  if (!a.summary) return `<h2 id="results-heading" tabindex="-1">Manifest assessment</h2><div class="notice" role="alert"><p><strong>The manifest doesn't match the schema</strong> (${e(a.error_count)} error(s)).</p><ul>${a.errors.map((x) => `<li><code>${e(x.code)}</code> <code>${e(x.at)}</code>: ${e(x.message)}</li>`).join("")}</ul></div>`;
  const r = a._report;
  return `<h2 id="results-heading" tabindex="-1">Manifest assessment: ${e(r.project.name)}</h2>
<p class="notice small">Assessed in this page with the same engine as <code>jrc check</code>. File evidence can't be read from a browser, so it is <strong>not checked</strong> here: run <code>jrc check</code> where the files are, or assess the repository instead. Not a certification.</p>
<ul class="counts"><li><span class="count">${e(a.summary.evidenced_pillars)}</span> of ${e(a.summary.applicable_pillars)} evidenced</li><li><span class="count">${e(a.summary.partial_pillars)}</span> partly</li><li><span class="count">${e(a.summary.errors)}</span> errors</li><li><span class="count">${e(a.summary.warnings)}</span> warnings</li></ul>
<div class="table-scroll"><table><thead><tr><th scope="col">Pillar</th><th scope="col">Declared</th><th scope="col">Level</th><th scope="col">Basis</th></tr></thead><tbody>${Object.entries(a.pillars).map(([k, p]) => `<tr><td>${e(r.pillars[k].title)}</td><td>${e(p.declared)}</td><td>${e(LEVEL_LABEL[p.level])}</td><td>${e(p.basis)}</td></tr>`).join("")}</tbody></table></div>
${r.findings.length ? `<h3>Findings</h3><ul>${r.findings.slice(0, 40).map((f) => `<li><strong>${e(f.severity)}</strong> <code>${e(f.code)}</code>: ${e(f.message)}</li>`).join("")}</ul>` : ""}
<h3 id="roadmap">Next steps</h3><ol class="roadmap">${plan.steps.map((s) => `<li><strong>${e(s.action)}</strong> <span class="badge">${e(s.priority)}</span><br>${e(s.why)}${s.command ? `<br><code>${e(s.command)}</code>` : ""}</li>`).join("")}</ol>`;
}
