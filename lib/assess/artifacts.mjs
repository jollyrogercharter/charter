// Everything the developer can download or copy, derived only from the evaluation and snapshot. Nothing here publishes anything.
import { CHALLENGE_STEPS } from "../jrc/challenge.mjs";
import { privacyScan } from "../jrc/core.mjs";
import { PILLARS, SCHEMA_URL, SPEC_VERSION } from "../jrc/constants.mjs";
import { code, esc } from "../jrc/report.mjs";
import { CHECK_TEXT, linkFor, short } from "./evaluate.mjs";

const CHARTER_REPO = "https://github.com/jollyrogercharter/charter";
const SITE = "https://jollyrogercharter.org";
const MAX_PREFILL = 6000;
const STATUS_TEXT = { evidenced: "Evidenced", "partially-evidenced": "Partly evidenced", missing: "No evidence found", "not-applicable": "Not applicable (self-reported)", unknown: "Unknown" };
const OUTCOME_TEXT = { found: "found", "not-found": "not found", contradicted: "contradicted", "not-checked": "couldn't check", "not-applicable": "not applicable" };

const where = (r) => r.snapshot.repository ? `${r.snapshot.repository}${r.snapshot.commit ? ` @ ${short(r.snapshot.commit)}` : ""}` : `local directory ${r.snapshot.name ?? ""}`.trim();
const ref = (r, p) => { const l = linkFor(r, p); return l ? `[${code(p)}](${l})` : code(p); };
const today = (r) => (r.snapshot.retrieved_at ?? "1970-01-01T00:00:00Z").slice(0, 10);

export function assessmentMarkdown(r) {
  const s = r.summary;
  const out = [
    `# JRCv1 adoption assessment: ${esc(r.snapshot.name ?? "repository")}`,
    "",
    `> ${r.disclaimer}`,
    "",
    `- **Source:** ${r.snapshot.repository ? `${r.snapshot.repository}` : "local directory"}${r.snapshot.ref ? `, ref ${code(r.snapshot.ref)}` : ""}${r.snapshot.commit ? `, commit ${code(r.snapshot.commit)}` : ""}; read ${r.snapshot.retrieved_at ?? "at an unrecorded time"}.`,
    `- **Snapshot SHA-256:** ${r.snapshot.sha256 ? code(r.snapshot.sha256) : "not computed"}. Re-run \`jrc assess --snapshot\` on the saved snapshot to reproduce this report exactly.`,
    `- **Result:** ${s.evidenced} evidenced, ${s["partially-evidenced"]} partly, ${s.missing} with no evidence found, ${s.unknown} unknown, ${s["not-applicable"]} not applicable. ${s.concerns} concern${s.concerns === 1 ? "" : "s"} (${s.contradictions} contradiction${s.contradictions === 1 ? "" : "s"}). jrc.json: ${s.manifest}.`,
    `- **Basis:** ${s.basis}. ${r.snapshot.file_list_complete ? "The whole file list was read." : "**The file list is incomplete, so some absences are unknown.**"} ${r.snapshot.files_read} file(s) were read for content.${r.snapshot.skipped_unsafe_paths ? ` ${r.snapshot.skipped_unsafe_paths} path(s) with hidden or unsafe characters were ignored.` : ""}`,
    "",
    "| Pillar | Status | Why |",
    "|---|---|---|",
    ...Object.values(r.pillars).map((p) => `| ${p.title} | ${STATUS_TEXT[p.status]} | ${esc(p.explanation)} |`),
    "",
  ];
  if (r.concerns.length) {
    out.push("## Concerns", "", "Things the repository itself contradicts or gets wrong, as opposed to evidence that is merely absent.", "");
    for (const c of r.concerns) out.push(`- **${c.severity}** ${code(c.code)}${c.pillar ? ` (${r.pillars[c.pillar].title})` : ""}${c.at ? ` at ${code(c.at)}` : ""}: ${esc(c.message)}`);
    out.push("");
  }
  for (const p of Object.values(r.pillars)) {
    out.push(`## ${p.title}: ${STATUS_TEXT[p.status]}`, "", `*${esc(p.question)}*`, "", esc(p.explanation), "");
    for (const c of p.checks) {
      out.push(`- **${esc(c.title)}**${c.core ? "" : " (supporting)"}: ${OUTCOME_TEXT[c.outcome]}. ${esc(c.why)}`);
      if (c.evidence.length) out.push(`  - Evidence: ${c.evidence.map((e) => ref(r, e)).join(", ")}${c.evidence_total > c.evidence.length ? ` and ${c.evidence_total - c.evidence.length} more` : ""}`);
    }
    if (p.manifest) out.push(`- **jrc.json declares:** ${esc(p.manifest.declared)} with ${p.manifest.claims} claim(s); file evidence ${Object.entries(p.manifest.file_evidence).map(([k, v]) => `${v} ${k}`).join(", ") || "none"}.`);
    out.push("");
  }
  out.push("## Roadmap", "", "Ordered so that nothing comes before what it depends on; then by impact, then by effort.", "");
  for (const s of r.roadmap) out.push(`${s.step}. **${esc(s.action)}** (${s.priority === "fix first" ? "fix first" : `${s.impact} impact`}, ${s.effort} effort${s.after.length ? `, after ${s.after.map((a) => code(a)).join(", ")}` : ""}). ${esc(s.why)}${s.detail ? ` ${esc(s.detail)}` : ""}`);
  out.push("", "Outcomes: **found** = a matching public file exists at this commit; **not found** = the whole file list was read and nothing matched; **contradicted** = the repository shows the opposite; **couldn't check** = the evidence wasn't available to this scan.", "");
  return out.join("\n");
}

// A starting point only: never "evidenced", assessor left as a placeholder, every claim self-reported.
export function candidateManifest(r, snap) {
  const repoUrl = r.snapshot.repository;
  const pillars = {};
  for (const { key } of PILLARS) {
    const p = r.pillars[key];
    const claims = [];
    const gaps = [];
    for (const c of p.checks) {
      if (c.outcome === "found") {
        const evidence = c.evidence.filter((e) => !privacyScan(e).length).slice(0, 3).map((path) => {
          const f = snap.files[path];
          const entry = snap.tree?.entries.find((x) => x[0] === path);
          return { kind: "file", path, ...(f && entry?.[1] === "blob" ? { sha256: f.sha256 } : {}) };
        });
        if (evidence.length) claims.push({ id: c.id, statement: CHECK_TEXT[c.id].claim, evidence, verification: { level: "self-reported" } });
        else gaps.push(`${CHECK_TEXT[c.id].claim} (found by the scan but not tied to a file; add evidence)`);
      } else if (c.outcome !== "not-applicable") gaps.push(CHECK_TEXT[c.id].gap);
    }
    if (key === "data") gaps.unshift("Decide whether this project holds user data. If it doesn't, set status to not-applicable and say why in applicability.");
    pillars[key] = { status: claims.length ? "partial" : "not-started", claims, gaps };
  }
  return {
    $schema: SCHEMA_URL,
    jrc: SPEC_VERSION,
    project: { name: r.snapshot.name ?? "REPLACE: project name", ...(repoUrl ? { repository: repoUrl } : {}) },
    assessment: {
      kind: "self",
      assessor: "REPLACE: your name, handle or role (no email)",
      date: today(r),
      ...(r.snapshot.commit ? { commit: r.snapshot.commit } : {}),
      method: `Starting point generated by jrc assess from public files${r.snapshot.commit ? ` at commit ${short(r.snapshot.commit)}` : ""}. Each claim only says a file exists; review every claim and gap before publishing.`,
    },
    pillars,
    limitations: ["Generated from file names and a few fixed fields by an automated scan; nobody has reviewed these claims yet.", "No status is set to evidenced: that is the project's decision after review."],
  };
}

export function checklistMarkdown(r) {
  const out = [`# JRCv1 adoption checklist: ${esc(r.snapshot.name ?? "repository")}`, "", `From an automated scan of ${esc(where(r))}. Tick items as you finish them; re-run the scan to check.`, ""];
  for (const s of r.roadmap) out.push(`- [ ] **${esc(s.action)}** (${s.priority === "fix first" ? "fix first" : `${s.impact} impact`}, ${s.effort} effort)${s.template ? `. Starter file: ${code(s.template)}` : ""}`);
  const done = Object.values(r.pillars).flatMap((p) => p.checks.filter((c) => c.outcome === "found").map((c) => c.title));
  if (done.length) out.push("", "## Already in place (found by the scan, not reviewed)", "", ...done.map((d) => `- [x] ${esc(d)}`));
  out.push("", `Could your software survive without you? ${SITE}/challenge/`, "");
  return out.join("\n");
}

const TEMPLATES = {
  "SECURITY.md": () => ["# Security policy", "", "## Reporting a vulnerability", "", "REPLACE: how to report privately (for example GitHub private vulnerability reporting), and what reporters can expect.", "", "## Who responds", "", "REPLACE: at least two people or a team, so reports don't depend on one person.", "", "## Supported versions", "", "REPLACE: which releases receive security fixes."],
  "CONTRIBUTING.md": () => ["# Contributing", "", "Anyone may propose a change. No permission is needed to fork.", "", "## Proposing a change", "", "1. Open an issue or a pull request describing the problem and the proposed change.", "2. REPLACE: build and test commands a contributor must run first.", "", "## How changes are decided", "", "REPLACE: who reviews, how long reviews take, and how disagreements are settled. See GOVERNANCE.md."],
  "GOVERNANCE.md": () => ["# Governance", "", "## Who decides", "", "REPLACE: the current maintainers and what each can do (review, merge, release, manage accounts).", "", "## Becoming a maintainer", "", "REPLACE: how a contributor earns these rights.", "", "## If the founder leaves", "", "REPLACE: who holds the accounts, keys and domains, and how they would be handed over. List anything that still needs one specific person.", "", "## Forking", "", "Anyone may fork this project under its licence."],
  "DEPLOYMENT.md": () => ["# Deployment", "", "How someone other than the current maintainers would deploy and run this project, with no secret steps.", "", "## Requirements", "", "REPLACE: hosting, runtime versions, accounts and services needed.", "", "## Deploy", "", "REPLACE: exact commands, from a fresh clone.", "", "## Configuration and secrets", "", "REPLACE: every setting and secret by name (never the values), and how to create your own.", "", "## Backup, restore and rollback", "", "REPLACE: what state exists, how to back it up and restore it, and how to roll back a release. If there is no state, say so."],
  "COSTS.md": () => ["# Operating costs", "", "What it costs to run this project, kept in separate categories that are never added together: billed cash, forecasts, reserves, donated labour and user attention. Unknown amounts are written as unknown, never zero.", "", "| Item | Category | Amount | Period | Source |", "|---|---|---|---|---|", "| REPLACE: e.g. hosting | cash | REPLACE | monthly | REPLACE: invoice or dashboard (no account numbers) |", "", `A machine-readable ledger format is described at ${SITE}/spec/quartermaster/.`],
  "DATA.md": () => ["# User data", "", "## Does this project hold user data?", "", "REPLACE: yes or no. If no, say why (for example: a library with no server), and mark the data pillar not-applicable in jrc.json.", "", "## What is stored, where, and for how long", "", "REPLACE.", "", "## Export and migration", "", "REPLACE: how a user gets all of their data out in an open format, and where they can take it."],
  "RELEASING.md": () => ["# Releasing", "", "REPLACE: how a release is cut, versioned, signed and published, and who can do it. List any keys or accounts involved (names only, never secrets)."],
  "AGENTS.md": () => ["# Working on this project", "", "Instructions for any contributor, human or AI agent.", "", "## Build and test", "", "REPLACE: commands from a fresh clone.", "", "## Conventions", "", "REPLACE: code style, commit messages, where decisions are recorded.", "", "## AI-assisted work", "", "REPLACE: whether AI tools were used and where their instructions and sanitised records are published. If none were used, say so."],
};

function newFileDiff(path, text) {
  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
  return [`diff --git a/${path} b/${path}`, "new file mode 100644", "--- /dev/null", `+++ b/${path}`, `@@ -0,0 +1,${lines.length} @@`, ...lines.map((l) => `+${l}`), ""].join("\n");
}

// New files only, and only where nothing with that name exists (any case), so the patch can't overwrite anything.
export function suggestedFiles(r, snap) {
  const taken = new Set((snap.tree?.entries ?? []).map((e) => e[0].toLowerCase()));
  const files = [];
  if (!snap.tree?.complete) return files;
  for (const s of r.roadmap) {
    if (!s.template || taken.has(s.template.toLowerCase())) continue;
    const text = s.template === "jrc.json" ? JSON.stringify(candidateManifest(r, snap), null, 2) + "\n" : TEMPLATES[s.template]().join("\n") + "\n";
    files.push({ path: s.template, step: s.step, text });
    taken.add(s.template.toLowerCase());
  }
  return files;
}

export function suggestedPatch(r, snap) {
  const files = suggestedFiles(r, snap);
  return files.length ? files.map((f) => newFileDiff(f.path, f.text)).join("") : "";
}

export function prDescription(r, snap) {
  const files = suggestedFiles(r, snap);
  const out = [
    "## Start a JRCv1 self-assessment",
    "",
    `This adds starter files toward the [Jolly Roger Charter](${SITE}/charter/) (JRCv1, a draft standard). They were prepared by an automated scan of ${esc(where(r))} and **haven't been reviewed by anyone yet**. Every file contains \`REPLACE:\` markers where only the maintainers know the answer.`,
    "",
    "### Files",
    "",
    ...(files.length ? files.map((f) => `- ${code(f.path)}`) : ["- none (every suggested file already exists, or the file list was incomplete)"]),
    "",
    "### What the scan found",
    "",
    "| Pillar | Status |",
    "|---|---|",
    ...Object.values(r.pillars).map((p) => `| ${p.title} | ${STATUS_TEXT[p.status]} |`),
    "",
    "### Before merging",
    "",
    "- [ ] Replace every `REPLACE:` marker or delete the section",
    "- [ ] Review each claim in `jrc.json`; delete any you can't stand behind",
    "- [ ] Run `jrc check` and fix any errors",
    "",
    "A scan says files exist, not that they are correct. This is not a certification.",
    "",
  ];
  return out.join("\n");
}

const STEP_SCAN = {
  discover: { checks: ["licence-declared", "licence-permits-reuse", "dependency-lock", "dependency-inventory", "build-instructions"], core: ["licence-declared", "licence-permits-reuse", "build-instructions"], automated: true },
  costs: { checks: ["cost-records", "funding-disclosure"], automated: false },
  restore: { checks: ["backup-restore", "release-process", "security-policy"], automated: false },
  "founder-absence": { checks: ["governance-doc", "multiple-stewards", "open-proposals"], automated: false },
};
const NEEDS_EXECUTION = "Needs the project's code to be built or run on an isolated machine. This tool never executes repository code, so a person has to do this step.";

// Only discovery is fully automatable from public files; everything else gets pre-checks, never a pass.
export function challengeChecks(r) {
  const byId = Object.fromEntries(Object.values(r.pillars).flatMap((p) => p.checks.map((c) => [c.id, c])));
  return CHALLENGE_STEPS.map((s) => {
    const scan = STEP_SCAN[s.id];
    if (s.id === "data-export" && r.pillars.data.status === "not-applicable") return { id: s.id, title: s.title, status: "not-applicable", automated: false, reason: "jrc.json declares the data pillar not applicable (self-reported)." };
    if (!scan) return { id: s.id, title: s.title, status: "not-attempted", automated: false, reason: NEEDS_EXECUTION };
    const pre = scan.checks.map((id) => ({ check: id, title: byId[id].title, outcome: byId[id].outcome }));
    if (!scan.automated) return { id: s.id, title: s.title, status: "not-attempted", automated: false, reason: "Only partly checkable from files. The pre-checks show what a person attempting this step can start from.", pre_checks: pre };
    const core = pre.filter((p) => scan.core.includes(p.check));
    const status = core.some((p) => p.outcome === "not-checked") ? "blocked" : core.every((p) => p.outcome === "found") ? "passed" : "failed";
    return { id: s.id, title: s.title, status, automated: true, reason: status === "passed" ? "The licence, a permissive reading of it and build instructions were all located in public files." : status === "blocked" ? "Some evidence couldn't be read." : "At least one of the licence, its terms or build instructions wasn't located.", pre_checks: pre };
  });
}

export function challengeLog(r) {
  const steps = challengeChecks(r);
  const out = [
    `# Jolly Roger Challenge log: ${esc(r.snapshot.name ?? "PROJECT NAME")}`,
    "",
    "> Could your software survive without you? Incomplete attempts are valid reports: what failed is the useful part.",
    "",
    `- **Project:** ${esc(r.snapshot.name ?? "PROJECT NAME")}`,
    `- **Repository and exact commit:** ${r.snapshot.repository ?? "REPOSITORY URL"} @ ${r.snapshot.commit ?? "COMMIT"}`,
    "- **Attempted by:** jrc assess (an automated tool, not an independent reviewer). Replace this line with your name or handle when a person continues the attempt.",
    `- **Date started:** ${today(r)}`,
    "- **Environment:** automated scan of public files; no code was built or run.",
    "",
    "Status for each step: `not-attempted` · `passed` · `failed` · `blocked` · `not-applicable`.",
    "",
  ];
  steps.forEach((s, i) => {
    out.push(`## ${i + 1}. ${s.title}`, "", `- **Status:** ${s.status}${s.automated ? " (automated discovery only)" : ""}`, `- **Notes:** ${esc(s.reason)}`);
    for (const p of s.pre_checks ?? []) out.push(`  - ${esc(p.title)}: ${OUTCOME_TEXT[p.outcome]}`);
    out.push("- **Blockers or undocumented assumptions:**", "");
  });
  out.push("## Summary", "", `- Steps passed by automation: ${steps.filter((s) => s.status === "passed").length} (discovery only; the other steps need a person)`, "- Things that still need the original creator:", "");
  return out.join("\n");
}

const q = (s) => encodeURIComponent(s);

// Links the developer clicks themselves; GitHub then asks them to sign in and confirm. Nothing is sent from here.
export function githubLinks(r, snap) {
  const repo = r.snapshot.repository;
  const branch = r.snapshot.ref ?? snap.repo_meta?.default_branch ?? null;
  const links = {};
  if (repo && branch) {
    for (const f of suggestedFiles(r, snap)) {
      const base = `${repo}/new/${branch.split("/").map(q).join("/")}?filename=${q(f.path)}`;
      const full = `${base}&value=${q(f.text)}`;
      links[f.path] = { url: full.length <= MAX_PREFILL ? full : base, prefilled: full.length <= MAX_PREFILL };
    }
    const checklist = checklistMarkdown(r);
    const issue = `${repo}/issues/new?title=${q("JRCv1 adoption checklist")}`;
    links.checklist_issue = { url: `${issue}&body=${q(checklist)}`.length <= MAX_PREFILL ? `${issue}&body=${q(checklist)}` : issue, prefilled: `${issue}&body=${q(checklist)}`.length <= MAX_PREFILL };
  }
  const log = challengeLog(r);
  const ch = `${CHARTER_REPO}/issues/new?title=${q(`Challenge log: ${r.snapshot.name ?? "project"}`)}`;
  links.challenge_submission = { url: `${ch}&body=${q(log)}`.length <= MAX_PREFILL ? `${ch}&body=${q(log)}` : ch, prefilled: `${ch}&body=${q(log)}`.length <= MAX_PREFILL };
  return links;
}
