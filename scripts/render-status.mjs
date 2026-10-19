// Renders launch/LAUNCH-STATUS.md from launch/status.json; `--check` exits 1 if the file is stale.
import { readFileSync, writeFileSync } from "node:fs";

const STATES = ["implemented", "pending", "blocked", "historical"];
const cell = (s) => String(s ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function renderStatus(status) {
  for (const i of status.items) {
    if (!STATES.includes(i.state)) throw new Error(`${i.id}: unknown state "${i.state}"`);
    if (!i.evidence || !i.verified_utc) throw new Error(`${i.id}: evidence and verified_utc are required`);
  }
  const rows = status.items
    .filter((i) => i.state !== "historical")
    .map((i) => `| ${cell(i.area)} | ${cell(i.title)} | **${i.state}** | ${i.url ? `<${i.url}>` : "—"} | ${cell(i.evidence)} | ${cell(i.verified_utc)} | ${cell(i.next)} |`);
  const human = status.items.filter((i) => i.owner === "human" && i.state !== "implemented");
  const hist = status.items.filter((i) => i.state === "historical");
  return [
    "# Launch Status",
    "",
    "<!-- Generated from launch/status.json by scripts/render-status.mjs. Edit the JSON, then run `npm run status`. -->",
    "",
    `**As of ${status.as_of_utc}.** ${status.summary}`,
    "",
    "States: " + STATES.map((s) => `**${s}**: ${status.states[s]}`).join(" "),
    "",
    "| Area | Item | State | URL | Evidence | Verified (UTC) | Next |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Needs the human",
    "",
    ...(human.length ? human.map((i, n) => `${n + 1}. **${i.title}** (${i.state}): ${i.next ?? i.evidence}`) : ["Nothing outstanding."]),
    "",
    "## Historical records",
    "",
    ...(hist.length ? hist.map((i) => `- **${i.title}**: ${i.evidence}${i.url ? ` <${i.url}>` : ""}`) : ["None."]),
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = renderStatus(JSON.parse(readFileSync("launch/status.json", "utf8")));
  if (process.argv.includes("--check")) {
    if (readFileSync("launch/LAUNCH-STATUS.md", "utf8") !== out) {
      console.error("launch/LAUNCH-STATUS.md is stale; run `npm run status`.");
      process.exit(1);
    }
  } else {
    writeFileSync("launch/LAUNCH-STATUS.md", out);
    console.log("Wrote launch/LAUNCH-STATUS.md");
  }
}
