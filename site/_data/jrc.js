import { readFileSync } from "node:fs";
import { checkManifest } from "../../lib/jrc/check.mjs";
import { challengeMarkdown } from "../../lib/jrc/challenge.mjs";
import { PILLARS } from "../../lib/jrc/constants.mjs";
import { buildReport, reportBadge } from "../../lib/jrc/report.mjs";

export default () => {
  const raw = readFileSync("jrc.json", "utf8");
  const manifest = JSON.parse(raw);
  const report = buildReport(manifest, raw, checkManifest(manifest, { root: process.cwd() }), "jrc.json");
  return {
    report,
    pillars: PILLARS,
    reportJson: JSON.stringify(report, null, 2) + "\n",
    badge: reportBadge(report),
    challengeTemplate: challengeMarkdown({ project: "PROJECT NAME", repository: "REPOSITORY URL", date: "YYYY-MM-DD" }),
  };
};
