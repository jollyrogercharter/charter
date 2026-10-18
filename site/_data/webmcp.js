import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildBundle } from "../../lib/capabilities/bundle.mjs";
import { runTool, toolCatalog, TOOLS } from "../../lib/capabilities/tools.mjs";
import { sha256Hex } from "../../lib/jrc/check.mjs";

const read = (p) => readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));

export default async function () {
  let commit = null;
  try { commit = execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch {}
  const bundle = buildBundle({
    charterMd: read("CHARTER.md"),
    openDependenciesMd: read("OPEN-DEPENDENCIES.md"),
    status: json("launch/status.json"),
    ledger: json("launch/costs.json"),
    provenance: json("provenance/launch-manifest.json"),
    siteUrl: (process.env.SITE_URL ?? "https://jollyrogercharter.org").replace(/\/$/, ""),
    repoUrl: process.env.REPO_URL ?? "https://github.com/jollyrogercharter/charter",
    commit,
  });
  const ctx = { loadBundle: async () => bundle, sha256: async (t) => sha256Hex(t) };
  const endpoints = [];
  for (const [file, toolName] of [["charter", "get_charter"], ["status", "get_project_status"], ["costs", "get_project_costs"], ["challenges", "get_open_challenges"], ["provenance", "get_provenance"]]) {
    endpoints.push({ file, body: JSON.stringify(await runTool(TOOLS.find((t) => t.name === toolName), {}, ctx), null, 2) + "\n" });
  }
  endpoints.push({ file: "tools", body: JSON.stringify(toolCatalog(), null, 2) + "\n" });
  return { bundleJson: JSON.stringify(bundle) + "\n", endpoints, catalog: toolCatalog() };
}
