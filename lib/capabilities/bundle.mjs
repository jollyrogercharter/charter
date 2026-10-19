// Builds the public data bundle the capabilities read. Pure: callers pass file contents, so Node and tests share it.
import { CHALLENGE_STEPS } from "../jrc/challenge.mjs";
import { PILLARS, SCHEMA_URL, SPEC_VERSION } from "../jrc/constants.mjs";
import { parseRegistry } from "../community/community.mjs";

export const BUNDLE_VERSION = "1";

function tableRows(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`heading not found: ${heading}`);
  const rows = [];
  for (const line of markdown.slice(start).split("\n").slice(1)) {
    if (line.startsWith("## ") && rows.length) break;
    if (!line.startsWith("|") || /^\|\s*-/.test(line)) continue;
    rows.push(line.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim()));
  }
  return rows.slice(1);
}

const plain = (s) => s.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export function parseCharterPillars(charterMd) {
  const rows = tableRows(charterMd, "## Six pillars");
  if (rows.length !== PILLARS.length) throw new Error(`CHARTER.md: expected ${PILLARS.length} pillar rows, found ${rows.length}`);
  return rows.map(([name, aspiration, evidence], i) => ({
    key: PILLARS[i].key,
    title: PILLARS[i].title,
    charter_name: plain(name).replace(/^\d+\.\s*/, ""),
    aspiration: plain(aspiration),
    evidence_to_request: plain(evidence),
    question: PILLARS[i].asks,
  }));
}

export function parseOpenDependencies(md) {
  return tableRows(md, "| # | Dependency |").map(([n, dependency, why, proposal]) => ({ n: Number(n), dependency: plain(dependency), why: plain(why), proposal: plain(proposal) }));
}

export function buildBundle({ charterMd, openDependenciesMd, status, ledger, provenance, siteUrl, repoUrl, commit, seedsMd, overnightMd, decisionsMd, opportunities, lexicons }) {
  return {
    bundle_version: BUNDLE_VERSION,
    site_url: siteUrl,
    repo_url: repoUrl,
    commit: commit ?? null,
    charter: { name: "JRCv1", status: "draft conformance standard; not a licence or a certification", manifest_spec: SPEC_VERSION, schema_url: SCHEMA_URL, pillars: parseCharterPillars(charterMd) },
    status,
    open_dependencies: parseOpenDependencies(openDependenciesMd),
    ledger,
    provenance,
    challenge_steps: CHALLENGE_STEPS,
    debates: parseRegistry({ seedsMd, overnightMd, decisionsMd }),
    opportunities,
    lexicons,
  };
}
