// Builds the data bundle from repository files on disk. Node only: used by the site build, the MCP server, the CLI and tests.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle } from "./bundle.mjs";
import { configureSite } from "../jrc/site-config.mjs";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadNodeBundle(root = REPO_ROOT) {
  const read = (p) => readFileSync(path.join(root, p), "utf8");
  const json = (p) => JSON.parse(read(p));
  let commit = null;
  try { commit = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
  const lexDir = "lexicons/org/jollyrogercharter";
  const lexicons = Object.fromEntries(readdirSync(path.join(root, lexDir)).filter((f) => f.endsWith(".json")).sort().map((f) => { const d = json(`${lexDir}/${f}`); return [d.id, d]; }));
  const siteUrl = (process.env.SITE_URL ?? "https://jollyrogercharter.org").replace(/\/$/, "");
  const repoUrl = process.env.REPO_URL ?? "https://github.com/jollyrogercharter/charter";
  configureSite({ repoUrl, siteUrl });
  const provenance = json("provenance/launch-manifest.json");
  // Founding files edited since the preservation commit, so a "mismatch" on them is expected rather than alarming.
  const provenanceChanged = provenance.files.filter((f) => !existsSync(path.join(root, f.path)) || createHash("sha256").update(readFileSync(path.join(root, f.path))).digest("hex") !== f.sha256).map((f) => f.path);
  return buildBundle({
    charterMd: read("CHARTER.md"),
    openDependenciesMd: read("OPEN-DEPENDENCIES.md"),
    status: json("launch/status.json"),
    ledger: json("launch/costs.json"),
    provenance,
    provenanceChanged,
    seedsMd: read("launch/RFC-SEEDS.md"),
    overnightMd: read("launch/RFC-DRAFTS-OVERNIGHT.md"),
    decisionsMd: read("DECISIONS-AND-QUESTIONS.md"),
    opportunities: json("community/opportunities.json"),
    lexicons,
    siteUrl,
    repoUrl,
    commit,
  });
}
