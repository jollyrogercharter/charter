import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import markdownIt from "markdown-it";

// Org name is unconfirmed; override with REPO_URL if the fallback name is used.
const REPO_URL = process.env.REPO_URL ?? "https://github.com/jollyrogercharter/charter";
const ROOT = process.cwd();

// Maps canonical repo docs to site routes so cross-links stay on-site when a page exists.
const DOC_ROUTES = {
  "MANIFESTO.md": "/manifesto/",
  "CHARTER.md": "/charter/",
  "standard/CONFORMANCE.md": "/charter/#conformance",
  "community/THE-CHALLENGE.md": "/challenge/",
  "community/GOVERNANCE-AND-DEBATE.md": "/governance/",
  "product/QUARTERMASTER.md": "/quartermaster/",
  "research/PRECEDENTS.md": "/history/",
  "spec/JRC-MANIFEST.md": "/spec/",
  "spec/jrc-0.1.schema.json": "/spec/jrc-0.1.schema.json",
  "spec/quartermaster/QM-LEDGER.md": "/spec/quartermaster/",
  "spec/quartermaster/qm-0.1.schema.json": "/spec/quartermaster/qm-0.1.schema.json",
  "launch/costs.json": "/costs/ledger.json",
  "docs/WEBMCP.md": "/agents/",
  "STEWARDSHIP-ECONOMY.md": "/stewardship/",
  "STEWARDSHIP-PILOT.md": "/pilot/",
  "PROJECTS.md": "/projects/",
  "community/GET-INVOLVED.md": "/get-involved/",
  "history/MANIFESTO-v0.1-2026-10-17.md": "/manifesto/v0-1/",
  "launch/LAUNCH-STATUS.md": "/status/",
};

const md = markdownIt({ html: false, linkify: true, typographer: false });

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

md.core.ruler.push("heading_ids", (state) => {
  const seen = new Map();
  for (let i = 0; i < state.tokens.length; i++) {
    const t = state.tokens[i];
    if (t.type !== "heading_open") continue;
    let slug = slugify(state.tokens[i + 1].content);
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    if (n) slug += `-${n}`;
    t.attrSet("id", slug);
  }
});

md.renderer.rules.table_open = () => '<div class="table-scroll"><table>\n';
md.renderer.rules.table_close = () => "</table></div>\n";

md.core.ruler.push("rewrite_links", (state) => {
  const srcPath = state.env?.srcPath;
  if (!srcPath) return;
  const dir = path.posix.dirname(srcPath);
  for (const block of state.tokens) {
    for (const t of block.children ?? []) {
      if (t.type !== "link_open") continue;
      const href = t.attrGet("href");
      if (!href || /^[a-z]+:|^#|^\//i.test(href)) continue;
      const [rel, hash] = href.split("#");
      const target = path.posix.normalize(path.posix.join(dir, rel));
      const route = DOC_ROUTES[target];
      t.attrSet("href", route ? route + (hash && !route.includes("#") ? `#${hash}` : "") : `${REPO_URL}/blob/main/${target}${hash ? `#${hash}` : ""}`);
    }
  }
});

export function renderDoc(srcPath, { dropTitle = false, shiftHeadings = 0 } = {}) {
  let src = readFileSync(path.join(ROOT, srcPath), "utf8");
  if (dropTitle) src = src.replace(/^# .*\n/, "");
  if (shiftHeadings) src = src.replace(/^(#{1,5}) /gm, (m, h) => "#".repeat(Math.min(6, h.length + shiftHeadings)) + " ");
  return md.render(src, { srcPath });
}

function gitInfo() {
  try {
    return {
      commit: execSync("git rev-parse HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(),
      date: execSync("git log -1 --format=%cI", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(),
    };
  } catch {
    return { commit: null, date: null };
  }
}

export default function (eleventyConfig) {
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.addShortcode("doc", (srcPath, opts = {}) => renderDoc(srcPath, opts));
  eleventyConfig.addShortcode("sourceLink", (srcPath) => `${REPO_URL}/blob/main/${srcPath}`);
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString());
  eleventyConfig.addGlobalData("repoUrl", REPO_URL);
  eleventyConfig.addGlobalData("siteUrl", (process.env.SITE_URL ?? "https://jollyrogercharter.org").replace(/\/$/, ""));
  eleventyConfig.addGlobalData("git", gitInfo());
  eleventyConfig.addGlobalData("buildTime", new Date().toISOString());
  eleventyConfig.addPassthroughCopy({ "site/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "site/_headers": "_headers", "site/_redirects": "_redirects" });
  eleventyConfig.addPassthroughCopy({ "MANIFESTO.md": "downloads/MANIFESTO.md", "CHARTER.md": "downloads/CHARTER.md", "history/MANIFESTO-v0.1-2026-10-17.md": "downloads/MANIFESTO-v0.1-2026-10-17.md" });
  eleventyConfig.addPassthroughCopy({ "spec/jrc-0.1.schema.json": "spec/jrc-0.1.schema.json", "jrc.json": "check/jrc.json", "spec/quartermaster/qm-0.1.schema.json": "spec/quartermaster/qm-0.1.schema.json", "launch/costs.json": "costs/ledger.json", "spec/capabilities-0.1.schema.json": "spec/capabilities-0.1.schema.json", "lexicons": "lexicons" });
  // Platform-neutral modules only: the browser runs the same engine as the CLI. Node-only files (check.mjs, init.mjs) stay out.
  for (const f of ["jrc/core.mjs", "jrc/site-config.mjs", "jrc/validate.mjs", "jrc/report.mjs", "jrc/constants.mjs", "jrc/challenge.mjs", "qm/expenses.mjs", "capabilities/capabilities.mjs", "capabilities/tools.mjs", "capabilities/input.mjs", "capabilities/tools-extended.mjs", "capabilities/manifest.mjs", "community/community.mjs", "qm/compare.mjs", "atproto/records.mjs", "assess/snapshot.mjs", "assess/github.mjs", "assess/evaluate.mjs", "assess/artifacts.mjs", "assess/session.mjs"]) {
    eleventyConfig.addPassthroughCopy({ [`lib/${f}`]: `js/lib/${f}` });
  }
  eleventyConfig.addWatchTarget("./*.md");

  return {
    dir: { input: "site", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
