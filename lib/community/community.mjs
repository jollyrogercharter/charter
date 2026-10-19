// Community capabilities: the RFC/debate registry, opportunity matching, and drafts that people post themselves. Pure.
import { privacyScan } from "../jrc/core.mjs";
import { site } from "../jrc/site-config.mjs";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = (s) => s.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();

function sections(block, marker) {
  const out = {};
  let name = null;
  for (const line of block.split("\n")) {
    if (line.startsWith(marker)) { name = slug(line.slice(marker.length)); out[name] = ""; }
    else if (name) out[name] += `${line}\n`;
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

// Parses the project's own RFC and debate documents into a registry. Throws if their structure changes, so drift fails the build.
export function parseRegistry({ seedsMd, overnightMd, decisionsMd }) {
  const entries = [];
  const seeds = seedsMd.split(/^### RFC (\d+)\s*$/m);
  for (let i = 1; i < seeds.length; i += 2) {
    const n = Number(seeds[i]);
    const block = seeds[i + 1].split(/^---\s*$/m)[0];
    const title = /^\*\*Title:\*\*\s*(.+)$/m.exec(block)?.[1];
    if (!title) throw new Error(`RFC-SEEDS.md: RFC ${n} has no **Title:** line`);
    const s = sections(block, "#### ");
    entries.push({
      id: `rfc-${n}`, kind: "rfc", title: plain(title), status: "draft", posted: false,
      source: { path: "launch/RFC-SEEDS.md", anchor: `rfc-${n}` },
      proposal: s["what-should-change"] ?? "", evidence: s["evidence-and-precedents"] ?? "", against: s["strongest-argument-against-this-proposal"] ?? "",
      why: s["why-does-this-matter-for-independence-freedom-or-user-sovereignty"] ?? "", validation: s["suggested-validation-or-experiment"] ?? "",
    });
  }
  const drafts = overnightMd.split(/^## Draft (\d+): (.+)$/m);
  for (let i = 1; i < drafts.length; i += 3) {
    const n = Number(drafts[i]);
    const s = sections(drafts[i + 2].split(/^---\s*$/m)[0], "### ");
    entries.push({
      id: `debate-${n}`, kind: "debate", title: plain(drafts[i + 1]), status: "draft", posted: false,
      source: { path: "launch/RFC-DRAFTS-OVERNIGHT.md", anchor: `draft-${n}-${slug(drafts[i + 1])}` },
      proposal: s.options ?? s["body-paste-from-here"] ?? "", evidence: s.motivation ?? "", against: s["strongest-argument-against"] ?? "",
      why: s.motivation ?? "", validation: s["what-would-change-the-spec-or-jrc"] ?? "",
    });
  }
  const open = /## Open decisions requiring debate\s*\n([\s\S]*?)(?:\n## |$)/.exec(decisionsMd)?.[1];
  if (!open) throw new Error("DECISIONS-AND-QUESTIONS.md: 'Open decisions requiring debate' section not found");
  for (const m of open.matchAll(/^(\d+)\.\s+\*\*(.+?):\*\*\s*(.+)$/gm)) {
    entries.push({ id: `decision-${m[1]}`, kind: "open-decision", title: plain(m[2]), status: "open", posted: false, source: { path: "DECISIONS-AND-QUESTIONS.md", anchor: "open-decisions-requiring-debate" }, proposal: plain(m[3]), evidence: "", against: "", why: "", validation: "" });
  }
  if (entries.filter((e) => e.kind === "rfc").length < 1) throw new Error("no RFCs parsed");
  return entries;
}

const clip = (s, n) => { const t = [...String(s)]; return t.length > n ? `${t.slice(0, n).join("")}\u2026` : t.join(""); };

export function listDebates(registry, { kind, query } = {}) {
  let items = registry;
  if (kind) items = items.filter((e) => e.kind === kind);
  if (query) {
    const q = query.toLowerCase();
    items = items.filter((e) => `${e.title} ${e.proposal}`.toLowerCase().includes(q));
  }
  return {
    by_kind: Object.fromEntries(["rfc", "debate", "open-decision"].map((k) => [k, items.filter((e) => e.kind === k).map(({ id, title }) => ({ id, title: clip(title, 70) }))]).filter(([, v]) => v.length)),
    status: "all drafts or open; none posted",
    posted: registry.filter((e) => e.posted).length,
    basis: "self-reported",
    note: "All entries are drafts in the repository. None has been posted to GitHub Discussions yet (issue #8), so there are no public replies to report.",
    references: { discussions: `${site.repoUrl}/discussions`, seeds: `${site.repoUrl}/blob/main/launch/RFC-SEEDS.md` },
  };
}

export function getDebate(registry, id, { part } = {}) {
  const e = registry.find((x) => x.id === id);
  if (!e) return { error: { code: "NOT_FOUND", message: `no debate "${clip(id, 60)}"`, known_ids: registry.map((x) => x.id) } };
  const parts = ["proposal", "why", "evidence", "against", "validation"];
  const pick = part ? [part] : parts;
  return {
    id: e.id, kind: e.kind, title: e.title, status: e.status, posted: e.posted,
    ...Object.fromEntries(pick.map((p) => [p, clip(e[p] || "(not stated in the source)", part ? 1400 : 280)])),
    basis: "self-reported",
    note: "The arguments are the project's own draft text, including its own strongest objection. Nobody outside the project has responded yet. Pass { part } for the full text of one section.",
    references: { source: `${site.repoUrl}/blob/main/${e.source.path}#${e.source.anchor}` },
  };
}

export function matchOpportunities(catalog, { skills = [], interests = [] }) {
  const scored = catalog.opportunities
    .map((o) => ({ o, skill: o.skills.filter((s) => skills.includes(s)).length, interest: o.interests.filter((s) => interests.includes(s)).length }))
    .filter((x) => x.skill + x.interest > 0)
    .sort((a, b) => b.skill - a.skill || b.interest - a.interest || a.o.id.localeCompare(b.o.id));
  return {
    as_of: catalog.as_of,
    matches: scored.slice(0, 8).map(({ o, skill, interest }) => ({ id: o.id, title: o.title, effort: o.effort, matched_skills: skill, matched_interests: interest, where: o.where })),
    matches_total: scored.length,
    basis: "self-reported",
    note: "Matched only on the skills and interests you supplied; nothing else about you is used or stored. Scores count overlaps; ties are alphabetical.",
  };
}

// GitHub rejects very long URLs, so the prefilled body is cut until the encoded link fits.
const MAX_LINK = 7000;
function prefilledIssue(params, body, cutNote) {
  const link = (b) => `${site.repoUrl}/issues/new?${new URLSearchParams({ ...params, body: b })}`;
  if (link(body).length <= MAX_LINK) return link(body);
  let lo = 0, hi = body.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (link(body.slice(0, mid) + cutNote).length <= MAX_LINK) lo = mid; else hi = mid - 1; }
  return link(body.slice(0, lo).replace(/[\ud800-\udbff]$/, "") + cutNote);
}
// Registry titles come from repository files anyone can propose edits to; keep markup and mentions out of drafts.
const inert = (t) => t.replace(/[<>[\]()`*_#|]/g, "").replace(/@(?=\w)/g, "@\u2060");

const KIND_TEMPLATE = { rfc: "charter-rfc.md", criticism: "what-would-make-this-fail.md", response: null, contribution: null };
const KIND_LABEL = { rfc: "RFC", criticism: "What Would Make This Fail?", response: "Response", contribution: "Contribution proposal" };

// Builds a Markdown draft and a prefilled GitHub link. The author posts it themselves; nothing is sent from here.
export function draftCommunityPost(registry, input) {
  const leaks = privacyScan(input);
  if (leaks.length) return { error: { code: "PRIVATE_DATA", message: `Remove private data before drafting: ${[...new Set(leaks.map((l) => l.kind))].join(", ")}.` } };
  const target = input.target ? registry.find((x) => x.id === input.target) : null;
  if (input.target && !target) return { error: { code: "NOT_FOUND", message: `no debate "${clip(input.target, 60)}"` } };
  if (input.kind === "response" && !target) return { error: { code: "INVALID_INPUT", message: "A response needs a target debate id." } };
  const s = input.sections ?? {};
  const head = {
    rfc: [["What should change?", s.proposal], ["Why does this matter for independence, freedom or user sovereignty?", s.why], ["Evidence and precedents", s.evidence], ["Strongest argument against this proposal", s.against], ["Impact on legal/technical compatibility, privacy, security and costs", s.impact], ["Suggested validation or experiment", s.validation], ["Decision status (maintainers fill in)", ""]],
    criticism: [["The failure mode", s.proposal], ["Evidence or concrete scenario", s.evidence], ["What principle does this challenge?", s.why], ["How could we test or mitigate it?", s.validation], ["What would change your mind?", s.against]],
    response: [["Which point I'm responding to", s.why], ["My response", s.proposal], ["Evidence", s.evidence], ["Where I might be wrong", s.against]],
    contribution: [["What I'd like to do", s.proposal], ["Why it helps the project survive without its founder", s.why], ["What I need", s.evidence], ["Risks", s.against], ["How we'll know it worked", s.validation]],
  }[input.kind];
  const body = [
    ...(target ? [`Re: ${inert(target.title)} (${target.id}, ${site.repoUrl}/blob/main/${target.source.path}#${target.source.anchor})`, ""] : []),
    ...head.flatMap(([h, v]) => [`## ${h}`, "", (v ?? "").trim() || "_(to write)_", ""]),
    input.ai_assisted ? "_Drafted with AI assistance and reviewed by the author before posting._" : "",
  ].join("\n").trim() + "\n";
  const title = `${input.kind === "rfc" ? "RFC: " : ""}${input.title}`;
  const tmpl = KIND_TEMPLATE[input.kind];
  const url = prefilledIssue({ ...(tmpl ? { template: tmpl } : {}), title }, body, "\n\n_(truncated: paste the rest from your draft)_");
  return {
    kind: input.kind, label: KIND_LABEL[input.kind], title, filename: `${slug(title).slice(0, 60) || "draft"}.md`, content: body,
    post_link: url, alternative: target ? "Or reply in the Discussion once it's posted (issue #8)." : `Or start a Discussion: ${site.repoUrl}/discussions/new`,
    note: "Draft only. Nothing was posted; you review, edit and submit it from your own account.",
  };
}

const STEP_IDS = ["discover", "clean-build", "agent-workflow", "alternate-deploy", "costs", "data-export", "improve", "restore", "founder-absence"];
export const CHALLENGE_STEP_IDS = STEP_IDS;

function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

// Packages someone's own challenge attempt for submission. It records what they report; it verifies nothing.
export async function challengePackage(input, sha256Hex) {
  const leaks = privacyScan(input);
  if (leaks.length) return { error: { code: "PRIVATE_DATA", message: `Remove private data before packaging: ${[...new Set(leaks.map((l) => l.kind))].join(", ")}.` } };
  const byId = new Map(input.steps.map((s) => [s.id, s]));
  const steps = STEP_IDS.map((id) => ({ id, status: byId.get(id)?.status ?? "not-attempted", commands: byId.get(id)?.commands ?? [], notes: byId.get(id)?.notes ?? "" }));
  const pkg = { challenge: "jolly-roger", package_version: "1", project: input.project, repository: input.repository, commit: input.commit, attempted_by: input.attempted_by, affiliated: input.affiliated, environment: input.environment ?? "", steps, founder_dependencies: input.founder_dependencies ?? [] };
  const counted = steps.filter((s) => s.status !== "not-applicable");
  const passed = counted.filter((s) => s.status === "passed").length;
  const json = canonical(pkg);
  const md = [
    `# Jolly Roger Challenge log: ${input.project}`, "",
    `- Repository and commit: ${input.repository} @ ${input.commit}`, `- Attempted by: ${input.attempted_by} (affiliated with the project: ${input.affiliated ? "yes" : "no"})`, `- Environment: ${input.environment || "not stated"}`,
    `- Package SHA-256 (canonical JSON): ${await sha256Hex(json)}`, "",
    "| Step | Status |", "|---|---|", ...steps.map((s) => `| ${s.id} | ${s.status} |`), "",
    ...steps.filter((s) => s.commands.length || s.notes).flatMap((s) => [`## ${s.id}`, "", ...(s.commands.length ? ["```", ...s.commands, "```", ""] : []), s.notes, ""]),
    "## Still depends on the original creator", "", ...(pkg.founder_dependencies.length ? pkg.founder_dependencies.map((d) => `- ${d}`) : ["- (none reported)"]), "",
    `_Self-reported by the person who attempted it. ${input.affiliated ? "They are affiliated with the project, so this is not an independent reproduction." : "Not checked by the project."}_`,
  ].join("\n");
  return {
    summary: { passed, of: counted.length, independence_claimed: !input.affiliated, basis: "self-reported" },
    package_json: JSON.parse(json), package_sha256: await sha256Hex(json), markdown: md,
    submit_link: prefilledIssue({ template: "reproduction-challenge.md", title: `Challenge: ${input.project}` }, md, "\n\n_(truncated: attach the full log)_"),
    note: "Packaged from what you reported; nothing was run or verified, and nothing was submitted. An attempt by someone affiliated with the project never counts as independent.",
  };
}
