import { loadNodeBundle } from "../../lib/capabilities/node-bundle.mjs";
import { capabilityManifest } from "../../lib/capabilities/manifest.mjs";
import { runTool, toolCatalog, TOOLS } from "../../lib/capabilities/tools.mjs";
import { sha256Hex } from "../../lib/jrc/check.mjs";
import { readFileSync } from "node:fs";

export default async function () {
  const bundle = loadNodeBundle(process.cwd());
  const ctx = { loadBundle: async () => bundle, sha256: async (t) => sha256Hex(t) };
  const endpoints = [];
  for (const [file, toolName] of [["charter", "get_charter"], ["status", "get_project_status"], ["costs", "get_project_costs"], ["challenges", "get_open_challenges"], ["provenance", "get_provenance"]]) {
    endpoints.push({ file, body: JSON.stringify(await runTool(TOOLS.find((t) => t.name === toolName), {}, ctx), null, 2) + "\n" });
  }
  for (const [file, toolName] of [["debates", "list_debates"], ["cost-categories", "explain_costs"], ["timestamp", "get_timestamp_status"], ["lexicons", "get_atproto_lexicons"]]) {
    endpoints.push({ file, body: JSON.stringify(await runTool(TOOLS.find((t) => t.name === toolName), {}, ctx), null, 2) + "\n" });
  }
  endpoints.push({ file: "opportunities", body: JSON.stringify(bundle.opportunities, null, 2) + "\n" });
  const manifest = capabilityManifest();
  const snapshot = JSON.parse(readFileSync("docs/demo/main/jrc-snapshot.json", "utf8"));
  const examples = {};
  const ex = async (name, input) => { const r = await runTool(TOOLS.find((t) => t.name === "export_atproto_record"), input, { ...ctx, session: (await import("../../lib/capabilities/node-runtime.mjs")).nodeContext().session }); if (!r.ok || !r.valid) throw new Error(`example ${name} failed: ${JSON.stringify(r.error ?? r.problems)}`); examples[name] = r.record; };
  await ex("assessment", { kind: "assessment", snapshot });
  await ex("adoption", { kind: "adoption", adoption: { repository: "https://github.com/jollyrogercharter/charter", manifest_uri: "https://jollyrogercharter.org/check/jrc.json", statement: "Working toward JRCv1; self-assessment published, independent reproduction not yet done.", declared_at: "2026-10-19T00:00:00Z" } });
  await ex("contribution", { kind: "contribution", created_at: "2026-10-19T00:00:00Z", contribution: { kind: "criticism", title: "What would make jrc self-assessments meaningless?", subject: "https://github.com/jollyrogercharter/charter", url: "https://github.com/jollyrogercharter/charter/blob/main/launch/RFC-DRAFTS-OVERNIGHT.md", ai_assisted: true } });
  for (const [k, v] of Object.entries(examples)) endpoints.push({ file: `atproto-example-${k}`, body: JSON.stringify(v, null, 2) + "\n" });
  endpoints.push({ file: "tools", body: JSON.stringify(toolCatalog(), null, 2) + "\n" });
  endpoints.push({ file: "capabilities", body: JSON.stringify(manifest, null, 2) + "\n" });
  return { bundleJson: JSON.stringify(bundle) + "\n", endpoints, catalog: toolCatalog(), manifest, lexicons: Object.values(bundle.lexicons), debates: bundle.debates, opportunities: bundle.opportunities, examples };
}
