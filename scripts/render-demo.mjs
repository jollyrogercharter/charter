// Regenerates docs/demo/*/ from each saved snapshot (offline). With --live, refetches the snapshot from GitHub first.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { allArtifacts, createSession } from "../lib/assess/session.mjs";

const DEMO = "docs/demo";
const sha256 = async (b) => createHash("sha256").update(b).digest("hex");

export async function renderDemo(dir, { live = false } = {}) {
  const old = JSON.parse(readFileSync(path.join(dir, "jrc-snapshot.json"), "utf8"));
  const session = createSession({ fetch: globalThis.fetch, sha256 });
  const input = live ? { repository: old.source.repository, ref: old.source.ref } : { snapshot: old };
  return allArtifacts(await session.assess(input)).files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/render-demo.mjs")) {
  for (const d of readdirSync(DEMO, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const files = await renderDemo(path.join(DEMO, d.name), { live: process.argv.includes("--live") });
    for (const [name, text] of Object.entries(files)) writeFileSync(path.join(DEMO, d.name, name), text);
    process.stdout.write(`${DEMO}/${d.name}: ${Object.keys(files).length} files\n`);
  }
}
