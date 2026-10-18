// Pure, deterministic evaluation of an evidence snapshot against JRCv1. Same snapshot in, same report out.
import { assessManifest, lexicalPathProblem } from "../jrc/core.mjs";
import { PILLARS, TOOL } from "../jrc/constants.mjs";
import { buildReport } from "../jrc/report.mjs";
import { validateLedger } from "../qm/expenses.mjs";
import { canonicalJson, isObj, LICENCE_FILE, SNAPSHOT_VERSION } from "./snapshot.mjs";

export const ASSESSMENT_VERSION = "0.1";
export const STATUSES = ["evidenced", "partially-evidenced", "missing", "not-applicable", "unknown"];
export const OUTCOMES = ["found", "not-found", "contradicted", "not-checked", "not-applicable"];
export const ASSESSMENT_DISCLAIMER = "Automated scan of public files at one commit. Finding a file shows that it exists, not that it is correct or followed. Not finding one shows only that it isn't in this repository; the evidence may live elsewhere. Nothing here is independently verified, and JRCv1 is a draft standard, not a certification.";

const FREE_SPDX = /^(MIT|MIT-0|Apache-2\.0|BSD-[234]-Clause(-[A-Za-z]+)?|0BSD|ISC|MPL-2\.0|(L|A)?GPL-[23]\.0(-only|-or-later|\+)?|LGPL-2\.1(-only|-or-later|\+)?|CC0-1\.0|CC-BY(-SA)?-4\.0|Unlicense|Zlib|EPL-[12]\.0|BSL-1\.0|Artistic-2\.0|EUPL-1\.[12]|PSF-2\.0|Python-2\.0|OFL-1\.1|WTFPL|BlueOak-1\.0\.0|MulanPSL-2\.0|UPL-1\.0)$/;
const NONFREE_SPDX = /^(BUSL-1\.1|SSPL-1\.0|Elastic-2\.0|CC-BY(-SA)?-NC.*|CC-BY-NC-ND.*|PolyForm-.*|UNLICENSED|Commons-Clause|FSL-.*)$/i;
const FREE_TEXT = [
  ["MIT", /permission is hereby granted, free of charge, to any person obtaining a copy/],
  ["Apache-2.0", /apache license,? version 2\.0/],
  ["AGPL-3.0", /gnu affero general public license version 3/],
  ["LGPL", /gnu lesser general public license/],
  ["GPL-3.0", /gnu general public license version 3/],
  ["GPL-2.0", /gnu general public license version 2/],
  ["MPL-2.0", /mozilla public license,? (version|v\.?) ?2\.0/],
  ["BSD", /redistribution and use in source and binary forms, with or without modification, are permitted/],
  ["ISC", /permission to use, copy, modify, and\/or distribute this software for any purpose with or without fee is hereby granted/],
  ["CC0-1.0", /cc0 1\.0 universal/],
  ["Unlicense", /this is free and unencumbered software released into the public domain/],
  ["EPL-2.0", /eclipse public license - v 2\.0/],
  ["BSL-1.0", /boost software license - version 1\.0/],
  ["EUPL-1.2", /european union public licen[cs]e/],
  ["Artistic-2.0", /the artistic license 2\.0/],
  ["Zlib", /this software is provided 'as-is', without any express or implied warranty\. in no event will the authors be held liable/],
];
const NONFREE_TEXT = [
  ["Business Source License", /business source license/],
  ["Commons Clause", /commons clause/],
  ["Server Side Public License", /server side public license/],
  ["Elastic License", /elastic license/],
  ["PolyForm", /polyform/],
  ["Functional Source License", /functional source license/],
  ["a non-commercial restriction", /\bnon-?commercial\b/],
];

const LOCKFILES = /^(.*\/)?(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|go\.sum|poetry\.lock|uv\.lock|Pipfile\.lock|pdm\.lock|requirements[\w.-]*\.txt|Gemfile\.lock|composer\.lock|mix\.lock|pubspec\.lock|Package\.resolved|packages\.lock\.json|gradle\.lockfile|flake\.lock)$/;
const PKG_MANIFESTS = /^(.*\/)?(package\.json|Cargo\.toml|go\.mod|pyproject\.toml|setup\.py|setup\.cfg|Pipfile|Gemfile|composer\.json|mix\.exs|pubspec\.yaml|Package\.swift|[\w.-]+\.csproj|pom\.xml|build\.gradle(\.kts)?|flake\.nix)$/;
const BUILD_HEADING = /^\s{0,3}#{1,4}\s*(build|building|install|installation|installing|getting started|developing|development setup|local development|setup|set up|quick ?start|compil\w*|from source|how to build|running locally)\b/im;
const RST_HEADING = /^(build|building|install|installation|getting started|developing|setup|quick ?start|from source)[^\n]{0,60}\n[=~^-]{3,}\s*$/im;
const DEPLOY_HEADING = /^\s{0,3}#{1,4}\s*(deploy|deployment|deploying|self-?host|hosting|production|operations|running in production)\b/im;
const BACKUP_WORDS = /\b(backups?|restore|restoring|rollback|roll back|disaster recovery)\b/i;

const ROLE_FILES = {
  deploy: /^(\.github\/|docs?\/)?(deploy(ment|ing)?|operations|runbook|self[-_]?host(ing)?)(\.(md|rst|txt))?$/i,
  codeowners: /^(\.github\/|docs\/)?codeowners$/i,
  costs: /^([\w-]+\/)?(costs?|budget|ledger|expenses)(\.(json|md|csv))$/i,
};
// Long or sentence-like path segments are a vector for injected prose, so they aren't cited as evidence.
const proseLike = (p) => p.split("/").some((seg) => seg.length > 64 || (seg.match(/\s/g) ?? []).length > 3);
// Copies of other projects (vendored code, test fixtures) aren't this project's evidence.
const VENDORED = /(^|\/)(node_modules|vendor|third_party|fixtures?|__fixtures__|testdata)\/./;
const short = (c) => (c ? c.slice(0, 7) : null);
const effortRank = { small: 0, medium: 1, large: 2 };
const impactRank = { high: 0, medium: 1, low: 2 };

// Each check looks only at file names, a few fixed fields and fixed patterns; repository prose is never copied out.
const CHECKS = [
  { id: "licence-declared", pillar: "code_rights", core: true, title: "A licence is declared",
    test: (x) => {
      const files = x.paths(LICENCE_FILE, true);
      if (files.length) return x.found(files);
      const fields = x.packageLicences();
      if (fields.length) return x.found(fields.map((f) => f.path), "No licence file, but a package manifest declares a licence.");
      if (x.meta?.license_spdx && x.meta.license_spdx !== "NOASSERTION") return x.found([], "GitHub reports a licence for this repository.");
      if (x.unreadAt(/^(package|composer)\.json$|^(cargo|pyproject)\.toml$/i)) return x.notChecked("No licence file, and a package manifest that could declare one couldn't be read.");
      return x.absent("No licence file or licence field was found. Without a licence, default copyright usually means nobody else may copy, modify or redistribute the code. The licence may be stated somewhere this scan doesn't look, such as file headers.");
    },
    claim: "The licence is published in the repository.", gap: "No licence is declared in the repository.",
    fix: { action: "Choose a licence and add it as LICENSE", effort: "small", impact: "high", detail: "This is the owner's decision; this tool won't pick one. https://choosealicense.com/ compares common licences." } },
  { id: "licence-permits-reuse", pillar: "code_rights", core: true, title: "The licence lets anyone copy, modify, sell and fork",
    test: (x) => x.licenceVerdict(),
    claim: "The declared licence permits copying, modification, resale and forking.", gap: "The licence has not been confirmed to permit copying, modification, resale and forking.",
    fix: { action: "Make sure the licence permits copying, modification, resale and forking", effort: "medium", impact: "high", after: ["licence-declared"], detail: "Source-available licences (for example BSL, SSPL, Commons Clause or non-commercial terms) don't meet JRCv1's creation-freedom aspiration." } },
  { id: "dependency-lock", pillar: "code_rights", core: true, title: "Dependencies are pinned in a lockfile",
    test: (x) => {
      const manifests = x.paths(PKG_MANIFESTS);
      if (!manifests.length) return x.complete ? { outcome: "not-applicable", paths: [], why: "No recognised package manifest, so there are no declared dependencies to lock." } : x.absent("");
      const locks = x.paths(LOCKFILES);
      return locks.length ? x.found(locks) : x.absent("A package manifest was found but no lockfile, so a stranger can't rebuild with the same dependency versions.");
    },
    claim: "Dependency versions are pinned in a lockfile.", gap: "Dependency versions are not pinned in a lockfile.",
    fix: { action: "Commit a lockfile for every package manifest", effort: "small", impact: "medium" } },
  { id: "dependency-inventory", pillar: "code_rights", core: false, title: "A dependency or third-party licence inventory exists",
    test: (x) => {
      const p = x.paths(/(^|\/)(sbom[\w.-]*|[\w.-]*\.spdx(\.json)?|[\w.-]*\.cdx\.json|bom\.json|third[-_]?party[\w.-]*|notice(\.\w+)?|licenses\/|dependencies\.md)$/i);
      return p.length ? x.found(p) : x.absent("No SBOM, NOTICE or third-party licence list was found.");
    },
    claim: "A dependency or third-party licence inventory is published.", gap: "No dependency or third-party licence inventory is published.",
    fix: { action: "Publish a dependency licence inventory (an SBOM or a NOTICE file)", effort: "medium", impact: "low", after: ["dependency-lock"] } },

  { id: "readme", pillar: "development", core: true, title: "A README explains the project",
    test: (x) => { const p = x.paths(/^readme(\.\w+)?$/i, true); return p.length ? x.found(p) : x.absent("No README at the repository root."); },
    claim: "A README describes the project.", gap: "There is no README.",
    fix: { action: "Add a README that says what the project is and how to start", effort: "small", impact: "high" } },
  { id: "build-instructions", pillar: "development", core: true, title: "Build or install instructions are written down",
    test: (x) => {
      const docs = x.paths(/^(build|building|install|installing|hacking|development|developing)(\.\w+)?$|^docs?\/(build|building|install|installing|development|developing|getting[-_]started|contributing)[\w.-]*$/i);
      const readme = x.readme();
      if (readme && (BUILD_HEADING.test(readme.text) || RST_HEADING.test(readme.text))) return x.found([readme.path, ...docs], "The README has a build, install or getting-started section.");
      if (docs.length) return x.found(docs);
      const deploy = x.texts("deploy").filter((f) => BUILD_HEADING.test(f.text));
      if (deploy.length) return x.found(deploy.map((f) => f.path), "The deployment document has a build or install section.");
      if (readme === null) return x.complete ? x.absent("No README or build document was found.") : x.notChecked();
      if (readme.unread) return x.notChecked("The README couldn't be read, so its instructions weren't checked.");
      if (readme.truncated || x.unreadRole("deploy")) return x.notChecked("The README or deployment document is too long to read in full, so a build section may be past the part read.");
      return x.absent("The README has no build, install or getting-started heading, and no BUILD or INSTALL document was found.");
    },
    claim: "Build and install instructions are written down.", gap: "Build and install instructions are not written down.",
    fix: { action: "Write down how to build, test and run the project from a fresh clone", effort: "small", impact: "high", after: ["readme"] } },
  { id: "tests", pillar: "development", core: true, title: "Automated tests exist",
    test: (x) => {
      const p = x.paths(/(^|\/)(tests?|specs?|__tests__|testing)\/$|(^|\/)src\/test\/$|(_test\.(go|py|rs|exs?)|\.(test|spec)\.[cm]?[jt]sx?|_spec\.rb|Test\.(java|kt|cs)|Tests?\.swift)$|(^|\/)test_[\w-]+\.py$/);
      return p.length ? x.found(p) : x.absent("No test directory or test files were found by name.");
    },
    claim: "Automated tests are in the repository.", gap: "No automated tests were found.",
    fix: { action: "Add automated tests a stranger can run", effort: "large", impact: "high" } },
  { id: "ci", pillar: "development", core: true, title: "Continuous integration runs the build",
    test: (x) => {
      const p = x.paths(/^(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.ya?ml|\.circleci\/config\.ya?ml|azure-pipelines\.ya?ml|\.travis\.ya?ml|Jenkinsfile|\.buildkite\/[^/]+|\.woodpecker(\.ya?ml|\/[^/]+)|\.forgejo\/workflows\/[^/]+|\.gitea\/workflows\/[^/]+|bitbucket-pipelines\.ya?ml|\.drone\.ya?ml|\.builds\/[^/]+)$/);
      return p.length ? x.found(p) : x.absent("No CI configuration was found. Public CI shows a stranger the exact build and test commands.");
    },
    claim: "Continuous integration builds and tests the project in public.", gap: "No continuous integration configuration is published.",
    fix: { action: "Add a CI workflow that builds and runs the tests", effort: "medium", impact: "medium", after: ["tests"] } },
  { id: "decision-records", pillar: "development", core: false, title: "Design decisions are recorded",
    test: (x) => {
      const p = x.paths(/(^|\/)(adrs?|decisions|rfcs?)\/$|(^|\/)(decisions?|architecture|design|adr-[\w-]+|rfc-[\w-]+)(\.(md|rst|txt))?$/i);
      return p.length ? x.found(p) : x.absent("No decision records, RFCs or architecture notes were found.");
    },
    claim: "Design decisions are recorded in the repository.", gap: "Design decisions are not recorded in the repository.",
    fix: { action: "Start recording significant decisions (a docs/decisions/ folder is enough)", effort: "small", impact: "medium" } },
  { id: "agent-records", pillar: "development", core: false, title: "AI-agent instructions are published, if agents are used",
    test: (x) => {
      const p = x.paths(/^(AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.cursorrules|\.cursor\/rules\/|\.github\/copilot-instructions\.md|CONVENTIONS\.md|\.aider[\w.-]*|\.windsurfrules|\.clinerules)$/i);
      return p.length ? x.found(p) : x.absent("No agent instruction files were found. If AI tools helped build this, JRCv1 asks for their instructions and sanitised records; if none were used, say so in jrc.json.");
    },
    claim: "Instructions for AI agents working on the project are published.", gap: "If AI agents were used, their instructions and records are not published.",
    fix: { action: "Publish AGENTS.md: how a person or an AI agent should work on this project", effort: "small", impact: "low", template: "AGENTS.md" } },

  { id: "data-policy", pillar: "data", core: true, title: "User data handling is documented",
    test: (x) => {
      const p = x.paths(/(^|\/)(privacy|data[-_]?(policy|handling|rights)?|gdpr|user[-_]data)(\.(md|rst|txt|html))?$/i);
      return p.length ? x.found(p) : x.absent("No privacy or data-handling document was found.");
    },
    claim: "How user data is handled is documented.", gap: "How user data is handled is not documented.",
    fix: { action: "Say whether the project holds user data and, if so, how people control it", effort: "small", impact: "high", template: "DATA.md" } },
  { id: "data-export", pillar: "data", core: true, title: "Users can export and migrate their data",
    test: (x) => {
      const p = x.paths(/(^|\/)[\w.-]*((user|account|data|personal)[\w.-]*(export|migrat|takeout|portab)|(export|migrat|portab)[\w.-]*(user|account|data|personal)|takeout|portability)[\w.-]*\.(md|rst|txt)$|(^|\/)lexicons?\/$|\.lexicon\.json$/i);
      return p.length ? x.found(p) : x.absent("No export, migration or AT Protocol lexicon files were found.");
    },
    claim: "User data export and migration are documented.", gap: "User data export and migration are not documented.",
    fix: { action: "Document (and test) how a user exports their data and moves it elsewhere", effort: "large", impact: "high", after: ["data-policy"] } },

  { id: "deploy-docs", pillar: "operations", core: true, title: "Deployment is documented",
    test: (x) => {
      const p = x.paths(/^(\.github\/|docs?\/)?(deploy(ment|ing)?|operations|runbook|self[-_]?host(ing)?|hosting|install(ation)?-server)(\.(md|rst|txt))?$|^docs?\/(deploy|operations|runbook|self[-_]?host)[\w.-]*$/i);
      if (p.length) return x.found(p);
      const readme = x.readme();
      if (readme?.text && DEPLOY_HEADING.test(readme.text)) return x.found([readme.path], "The README has a deployment or self-hosting section.");
      if (readme?.unread || readme?.truncated) return x.notChecked("No deployment document, and the README couldn't be read in full.");
      return x.absent("No deployment, operations or self-hosting document was found. A library with nothing to deploy can mark this not-applicable in jrc.json.");
    },
    claim: "How to deploy and run the project is documented.", gap: "How to deploy and run the project is not documented.",
    fix: { action: "Document how someone else would deploy and run it, with no secret steps", effort: "medium", impact: "high", template: "DEPLOYMENT.md" } },
  { id: "deploy-automation", pillar: "operations", core: false, title: "Deployment is reproducible from configuration",
    test: (x) => {
      const p = x.paths(/(^|\/)(Dockerfile|Containerfile|docker-compose[\w.-]*\.ya?ml|compose\.ya?ml|[\w.-]+\.tf|Chart\.yaml|fly\.toml|netlify\.toml|wrangler\.(toml|jsonc?)|render\.yaml|Procfile|railway\.(json|toml)|app\.yaml|vercel\.json|nixpacks\.toml|kustomization\.ya?ml)$|^(k8s|kubernetes|infra|deploy|helm|ansible|terraform)\/$/);
      return p.length ? x.found(p) : x.absent("No container, infrastructure-as-code or hosting configuration was found.");
    },
    claim: "Deployment configuration is in the repository.", gap: "Deployment configuration is not in the repository.",
    fix: { action: "Commit the deployment configuration (container, IaC or host config)", effort: "medium", impact: "medium", after: ["deploy-docs"] } },
  { id: "security-policy", pillar: "operations", core: true, title: "There is a security reporting policy",
    test: (x) => { const p = x.paths(/^(\.github\/|docs\/)?security(\.(md|rst|txt))?$/i); return p.length ? x.found(p) : x.absent("No SECURITY policy was found, so there's no public way to report a vulnerability."); },
    claim: "A security reporting policy is published.", gap: "No security reporting policy is published.",
    fix: { action: "Add SECURITY.md: how to report a vulnerability and who responds", effort: "small", impact: "medium", template: "SECURITY.md" } },
  { id: "backup-restore", pillar: "operations", core: false, title: "Backup, restore or rollback is described",
    test: (x) => {
      const p = x.paths(/(^|\/)[\w.-]*(backup|restore|disaster[-_]?recovery|rollback)[\w.-]*\.(md|rst|txt)$/i);
      if (p.length) return x.found(p);
      const d = x.texts("deploy").filter((f) => BACKUP_WORDS.test(f.text));
      if (d.length) return x.found(d.map((f) => f.path), "The deployment document mentions backup, restore or rollback.");
      if (x.unreadRole("deploy")) return x.notChecked("A deployment document couldn't be read in full, so a backup or rollback section may be in it.");
      return x.absent("No backup, restore or rollback procedure was found.");
    },
    claim: "Backup, restore or rollback is described.", gap: "No backup, restore or rollback procedure is described.",
    fix: { action: "Describe how to back up, restore and roll back (or say there is no state to back up)", effort: "medium", impact: "medium", after: ["deploy-docs"] } },
  { id: "release-process", pillar: "operations", core: false, title: "Releases are documented",
    test: (x) => {
      const p = x.paths(/^(changelog|changes|history|news|releasing|release[-_]?process|releases?)(\.(md|rst|txt))?$|^\.changeset\/$|^(\.goreleaser\.ya?ml|release-please-config\.json|\.github\/release\.ya?ml)$/i);
      return p.length ? x.found(p) : x.absent("No changelog or release document was found.");
    },
    claim: "Releases and changes are documented.", gap: "Releases and changes are not documented.",
    fix: { action: "Keep a CHANGELOG or document how releases are made", effort: "small", impact: "low", template: "RELEASING.md" } },

  { id: "cost-records", pillar: "economics", core: true, title: "Operating costs are published",
    test: (x) => {
      const p = x.paths(/(^|\/)(costs?|budget|ledger|expenses|quartermaster|transparency[-_]report)[\w.-]*\.(md|json|csv|ya?ml)$|(^|\/)(costs|finances?)\/$/i);
      if (!p.length) return x.absent("No cost report or ledger was found. Costs may be published elsewhere; link them from jrc.json. A project with no running costs can say so.");
      const ledgers = x.texts("costs").filter((f) => f.path.endsWith(".json"));
      for (const f of ledgers) {
        let j = null, bad = false;
        try { j = JSON.parse(f.text); bad = isObj(j) && j.qm !== undefined && validateLedger(j).length > 0; } catch { j = null; }
        if (isObj(j) && j.qm !== undefined && bad) return { outcome: "found", paths: p, why: "Cost records were found, but a file declaring the Quartermaster format doesn't validate.", concern: { code: "C-LEDGER-INVALID", message: "A cost ledger declares the Quartermaster format but fails validation; run qm validate on it." } };
        if (isObj(j) && j.qm !== undefined) return x.found(p, "A valid Quartermaster cost ledger was found.");
      }
      return x.found(p);
    },
    claim: "Operating costs are published in the repository.", gap: "Operating costs are not published in the repository.",
    fix: { action: "Publish what it costs to run, with billed, estimated and donated costs kept apart", effort: "medium", impact: "high", template: "COSTS.md" } },
  { id: "funding-disclosure", pillar: "economics", core: false, title: "Funding sources are disclosed",
    test: (x) => { const p = x.paths(/^(\.github\/)?(funding\.ya?ml|funding\.md|sponsors?\.md|backers\.md)$/i); return p.length ? x.found(p) : x.absent("No funding or sponsorship file was found."); },
    claim: "Funding sources are disclosed.", gap: "Funding sources are not disclosed.",
    fix: { action: "Say how the project is funded, even if the answer is 'it isn't'", effort: "small", impact: "low", after: ["cost-records"] } },

  { id: "contributing", pillar: "governance", core: true, title: "Contribution instructions exist",
    test: (x) => { const p = x.paths(/(^|\/)contributing([-_.][\w.-]*)?\.(md|rst|txt)$|^(\.github\/|docs\/)?contributing$/i); return p.length ? x.found(p) : x.absent("No CONTRIBUTING guide was found."); },
    claim: "Contribution instructions are published.", gap: "Contribution instructions are not published.",
    fix: { action: "Add CONTRIBUTING.md: how to propose a change and how it gets decided", effort: "small", impact: "high", template: "CONTRIBUTING.md" } },
  { id: "governance-doc", pillar: "governance", core: true, title: "Decision-making and stewardship are documented",
    test: (x) => { const p = x.paths(/(^|\/)(governance|maintainers|stewards?|stewardship)([-_.][\w.-]*)?\.(md|rst|txt)$|^(\.github\/|docs\/)?(governance|maintainers|owners)$/i); return p.length ? x.found(p) : x.absent("No GOVERNANCE or MAINTAINERS document was found."); },
    claim: "How decisions are made and who maintains the project is documented.", gap: "How decisions are made and who maintains the project is not documented.",
    fix: { action: "Add GOVERNANCE.md: who decides, how to become a maintainer, what happens if the founder leaves", effort: "small", impact: "high", after: ["contributing"], template: "GOVERNANCE.md" } },
  { id: "multiple-stewards", pillar: "governance", core: false, title: "More than one person can maintain it",
    test: (x) => {
      const owners = x.texts("codeowners");
      if (!owners.length) {
        if (x.unreadRole("codeowners")) return x.notChecked("A CODEOWNERS file exists but couldn't be read.");
        return x.absent("No CODEOWNERS file was found. Without signing in, GitHub doesn't show how many people can merge, so this scan can't tell.");
      }
      const paths = owners.map((f) => f.path);
      const people = new Set(), teams = new Set();
      for (const f of owners) for (const line of f.text.split("\n").slice(0, 5000)) {
        if (line.trim().startsWith("#")) continue;
        for (const m of line.matchAll(/(?:^|\s)@([A-Za-z0-9-]{1,39})(\/[A-Za-z0-9_.-]{1,100})?(?=\s|$)/g)) (m[2] ? teams : people).add(`${m[1]}${m[2] ?? ""}`.toLowerCase());
        for (const m of line.matchAll(/(?:^|\s)[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,}(?=\s|$)/g)) people.add(m[0].trim().toLowerCase());
      }
      if (people.size >= 2 || (teams.size && people.size + teams.size >= 2)) return x.found(paths, `CODEOWNERS names ${people.size} people and ${teams.size} teams.`);
      if (teams.size) return { outcome: "not-checked", paths, why: "CODEOWNERS names a team; how many people are in it isn't public without signing in." };
      if (owners.some((f) => f.truncated)) return x.notChecked("CODEOWNERS is too long to read in full, so its owners couldn't all be counted.");
      if (people.size === 1) return { outcome: "contradicted", paths, why: "CODEOWNERS names a single owner, so approving changes depends on one account." };
      return x.absent("CODEOWNERS names no owners.");
    },
    claim: "More than one person or team can approve changes.", gap: "Approving changes may depend on a single person.",
    fix: { action: "Give a second, independent person the rights to review, merge and release", effort: "medium", impact: "high", after: ["governance-doc"] } },
  { id: "open-proposals", pillar: "governance", core: false, title: "Anyone can propose changes in the open",
    test: (x) => {
      const p = x.paths(/^\.github\/(ISSUE_TEMPLATE\/|PULL_REQUEST_TEMPLATE(\.md|\/))$|^\.github\/pull_request_template\.md$/i);
      if (x.meta?.has_issues || x.meta?.has_discussions) return x.found(p, "Issues or Discussions are open on GitHub.");
      if (p.length) return x.found(p);
      if (x.meta && x.meta.has_issues === false) return x.absent("Issues are turned off on GitHub and no issue or PR templates were found.");
      return x.notChecked("Without repository settings (a local scan) this can't be told from files alone.");
    },
    claim: "Anyone can propose changes through public issues or pull requests.", gap: "There is no open channel for proposing changes.",
    fix: { action: "Turn on issues or discussions so anyone can propose changes", effort: "small", impact: "medium" } },
];

export const CHECK_IDS = CHECKS.map((c) => c.id);
export const CHECK_TEXT = Object.fromEntries(CHECKS.map((c) => [c.id, { title: c.title, claim: c.claim, gap: c.gap }]));

// SPDX expressions: WITH binds tightest, then AND, then OR. Each node is true (free), false (non-free) or null (unknown).
function classifySpdx(expr) {
  if (typeof expr !== "string" || !/^[A-Za-z0-9.+\-() ]{1,80}$/.test(expr)) return { verdict: "unknown" };
  const toks = expr.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const names = [];
  const leaf = () => {
    const t = toks[i++];
    if (t === "(") { const v = or(); if (toks[i++] !== ")") throw new Error("paren"); return v; }
    if (!t || /^(AND|OR|WITH|\))$/.test(t)) throw new Error("token");
    if (toks[i] === "WITH") i += 2;
    if (FREE_SPDX.test(t)) { names.push(t); return true; }
    return NONFREE_SPDX.test(t) ? (names.push(t), false) : null;
  };
  const and = () => { const vs = [leaf()]; while (toks[i] === "AND") { i++; vs.push(leaf()); } return vs.includes(false) ? false : vs.includes(null) ? null : true; };
  const or = () => { const vs = [and()]; while (toks[i] === "OR") { i++; vs.push(and()); } return vs.includes(true) ? true : vs.includes(null) ? null : false; };
  let v;
  try { v = or(); if (i !== toks.length) return { verdict: "unknown" }; } catch { return { verdict: "unknown" }; }
  if (v === true) return { verdict: "free", name: [...new Set(names.filter((n) => FREE_SPDX.test(n)))].join(" / ") };
  if (v === false) return { verdict: "nonfree", name: names.find((n) => NONFREE_SPDX.test(n)) };
  return { verdict: "unknown" };
}

function classifyText(text) {
  const t = text.toLowerCase().replace(/\s+/g, " ").slice(0, 32000);
  // The title area names the licence; riders like Commons Clause restrict it wherever they appear; other mentions don't count.
  const titled = NONFREE_TEXT.find(([, re]) => re.test(t.slice(0, 400)));
  if (titled) return { verdict: "nonfree", name: titled[0] };
  if (/commons clause/.test(t)) return { verdict: "nonfree", name: "Commons Clause" };
  const good = FREE_TEXT.find(([, re]) => re.test(t));
  if (good) return { verdict: "free", name: good[0] };
  const bad = NONFREE_TEXT.find(([, re]) => re.test(t));
  if (bad) return { verdict: "nonfree", name: bad[0] };
  if (/all rights reserved/.test(t)) return { verdict: "nonfree", name: "an all-rights-reserved notice" };
  return { verdict: "unknown" };
}

function packageLicenceFields(files) {
  const out = [];
  for (const [path, f] of files) {
    if (!f.text || path.includes("/")) continue;
    let v = null;
    if (/^(package|composer)\.json$/i.test(path)) {
      try { const j = JSON.parse(f.text); v = typeof j.license === "string" ? j.license : Array.isArray(j.license) && j.license.every((x) => typeof x === "string") ? j.license.join(" OR ") : null; } catch { v = null; }
    } else if (/^(cargo|pyproject)\.toml$/i.test(path)) {
      const m = f.text.match(/^\s*license\s*=\s*(?:"([^"\n]{1,80})"|\{\s*text\s*=\s*"([^"\n]{1,80})")/m);
      v = m ? m[1] ?? m[2] : null;
    }
    if (v) out.push({ path, value: v, ...classifySpdx(v) });
  }
  return out;
}

function context(snap) {
  const tree = snap.tree;
  const complete = Boolean(tree?.complete);
  const entries = tree?.entries ?? [];
  const blobs = new Set(entries.filter((e) => e[1] === "blob").map((e) => e[0]));
  const files = Object.entries(snap.files).filter(([p]) => blobs.has(p)).sort(([a], [b]) => (a < b ? -1 : 1));
  const keyed = entries.map(([p, type]) => (type === "tree" ? `${p}/` : p));
  const x = {
    complete,
    meta: snap.repo_meta,
    linked: 0,
    paths(re, rootOnly = false) {
      const out = [];
      for (let i = 0; i < keyed.length; i++) {
        const k = keyed[i];
        if (rootOnly && entries[i][0].includes("/")) continue;
        if (VENDORED.test(entries[i][0])) continue;
        if (entries[i][1] === "blob" && entries[i][2] === 0) continue;
        if (!re.test(k)) continue;
        if (entries[i][1] === "symlink" || entries[i][1] === "submodule") { x.linked++; continue; }
        if (!proseLike(entries[i][0])) out.push(entries[i][0]);
      }
      return out;
    },
    unreadAt: (re) => entries.some(([p, t, size]) => t === "blob" && size > 0 && re.test(p) && (!snap.files[p] || snap.files[p].truncated)),
    unreadRole: (role) => x.unreadAt(ROLE_FILES[role]),
    found: (paths, why) => ({ outcome: "found", paths, why: why ?? null }),
    absent: (why) => (!tree || !complete ? x.notChecked() : x.linked ? x.notChecked("A matching name exists only as a symlink or submodule, which this scan doesn't follow.") : { outcome: "not-found", paths: [], why }),
    notChecked: (why) => ({ outcome: "not-checked", paths: [], why: why ?? (tree ? "The file list was truncated, so absence can't be concluded." : "The file list couldn't be read, so nothing could be checked.") }),
    readme() {
      const p = x.paths(/^readme(\.\w+)?$/i, true).sort((a, b) => (/\.md$/i.test(b) ? 1 : 0) - (/\.md$/i.test(a) ? 1 : 0))[0];
      if (!p) return null;
      const f = snap.files[p];
      return f?.text !== undefined ? { path: p, text: f.text, truncated: f.truncated } : { path: p, unread: true };
    },
    texts(role) {
      return files.filter(([p, f]) => ROLE_FILES[role].test(p) && typeof f.text === "string").map(([path, f]) => ({ path, text: f.text, truncated: f.truncated }));
    },
    packageLicences: () => packageLicenceFields(files),
    licenceVerdict() {
      const sources = [];
      for (const p of x.paths(LICENCE_FILE, true)) {
        const f = snap.files[p];
        sources.push(f?.text !== undefined ? { path: p, ...classifyText(f.text) } : { path: p, verdict: "unread" });
      }
      for (const f of x.packageLicences()) sources.push(f);
      if (x.meta?.license_spdx && x.meta.license_spdx !== "NOASSERTION") sources.push({ path: null, ...classifySpdx(x.meta.license_spdx), from: "GitHub's licence detection" });
      if (!sources.length) return x.absent("No licence was found, so it can't permit reuse.");
      const paths = sources.map((s) => s.path).filter(Boolean);
      const bad = sources.find((s) => s.verdict === "nonfree");
      if (bad) return { outcome: "contradicted", paths, why: `${bad.path ?? bad.from} reads as ${bad.name}, which restricts use, resale or forking.${sources.some((s) => s.verdict === "free") ? " Another declaration in the repository names a free licence, so the two disagree." : ""}` };
      const good = sources.filter((s) => s.verdict === "free");
      if (good.length) {
        const names = [...new Set(good.map((s) => s.name))];
        const licenceFiles = sources.filter((s) => s.path && !/\.(json|toml)$/i.test(s.path));
        const concern = names.length > 1 && licenceFiles.length === 1 && !good.some((s) => /\//.test(s.name)) ? { code: "C-LICENCE-DIFFERS", message: "Different places in the repository name different licences; make sure they agree or explain the dual licence." } : undefined;
        return { outcome: "found", paths, why: `Recognised as ${names.join(", ")}, which permits copying, modification, resale and forking.`, ...(concern ? { concern } : {}) };
      }
      if (sources.every((s) => s.verdict === "unread")) return x.notChecked("The licence file couldn't be read.");
      return { outcome: "not-checked", paths, why: "The licence wasn't recognised automatically; a person needs to read it." };
    },
  };
  return x;
}

const normalizePath = (rel) => {
  const out = [];
  for (const seg of rel.split(/[\\/]+/)) {
    if (seg === "..") out.pop();
    else if (seg && seg !== ".") out.push(seg);
  }
  return out.join("/");
};

// Evidence probe over a snapshot: a cited file is "present" only if it is in the tree at the snapshot's commit.
export function snapshotProbe(snap) {
  const byPath = new Map((snap.tree?.entries ?? []).map((e) => [e[0], e]));
  const complete = Boolean(snap.tree?.complete);
  return {
    file(rel, sha256) {
      const problem = lexicalPathProblem(rel);
      if (problem) return { result: "invalid", findings: [{ code: problem.startsWith("the whole") ? "E-WEAK-EVIDENCE" : "E-PATH", message: problem }] };
      const p = normalizePath(rel);
      const e = byPath.get(p);
      if (!e) return complete ? { result: "missing", findings: [{ code: "E-MISSING", message: "evidence file is not in the repository at this commit" }] } : { result: "not-checked", findings: [{ severity: "info", code: "I-NOT-CHECKED", message: "the file list was incomplete, so this evidence couldn't be checked" }] };
      if (p === "jrc.json") return { result: "invalid", findings: [{ code: "E-WEAK-EVIDENCE", message: "the manifest can't be evidence for itself" }] };
      if (e[1] === "tree") return sha256 ? { result: "invalid", findings: [{ code: "E-HASH", message: "sha256 given for a directory" }] } : { result: "present-directory" };
      if (e[1] !== "blob") return { result: "not-checked", findings: [{ severity: "info", code: "I-NOT-CHECKED", message: "evidence is a symlink or submodule, which this scan doesn't follow" }] };
      if (e[2] === 0) return { result: "invalid", findings: [{ code: "E-WEAK-EVIDENCE", message: "evidence file is empty" }] };
      if (!sha256) return { result: "present" };
      const f = snap.files[p];
      if (!f) return { result: "present", findings: [{ severity: "info", code: "I-HASH-NOT-READ", message: "the pinned file wasn't downloaded, so its hash wasn't compared" }] };
      return f.sha256 === sha256 ? { result: "verified" } : { result: "hash-mismatch", findings: [{ code: "E-HASH", message: `sha256 mismatch: file at this commit is ${f.sha256}` }] };
    },
  };
}

// JSON paths from a hostile manifest can carry arbitrary keys; anything unusual is replaced, never echoed.
const safeAt = (at) => String(at).split(/(?=[.[])/).map((seg) => (/^(\$|\.[A-Za-z0-9_$-]{1,40}|\[\d{1,4}\])$/.test(seg) ? seg : ".<unusual key>")).join("").slice(0, 120);

function evaluateManifest(snap) {
  const f = snap.files["jrc.json"];
  const inTree = (snap.tree?.entries ?? []).some((e) => e[0] === "jrc.json");
  if (!inTree) return snap.tree?.complete ? { present: false } : { present: false, unknown: true };
  if (!f?.text) return { present: true, readable: false, concerns: [{ code: "C-MANIFEST-UNREAD", pillar: null, severity: "warning", message: "jrc.json exists but couldn't be read, so its claims weren't assessed." }] };
  if (f.truncated) return { present: true, readable: false, concerns: [{ code: "C-MANIFEST-TOO-LARGE", pillar: null, severity: "warning", message: "jrc.json is larger than this scan reads (64 KiB), so its claims weren't assessed." }] };
  let m;
  try { m = JSON.parse(f.text.replace(/^\ufeff/, "")); } catch { return { present: true, readable: false, concerns: [{ code: "C-MANIFEST-JSON", pillar: null, severity: "contradiction", message: "jrc.json is not valid JSON." }] }; }
  const now = snap.source.retrieved_at ? Date.parse(snap.source.retrieved_at) : 0;
  let result;
  try { result = assessManifest(m, { probe: snapshotProbe(snap), now }); }
  catch { return { present: true, readable: false, concerns: [{ code: "C-MANIFEST-UNREAD", pillar: null, severity: "warning", message: "jrc.json has a structure this scan couldn't process, so its claims weren't assessed." }] }; }
  const concerns = [];
  const errors = result.findings.filter((x) => x.severity === "error");
  for (const e of errors.slice(0, 12)) concerns.push({ code: e.code, pillar: e.pillar ?? null, severity: ["E-MISSING", "E-HASH", "E-MISLEADING", "E-INDEPENDENT"].includes(e.code) ? "contradiction" : "warning", at: safeAt(e.at), message: e.message });
  if (!result.schemaOk) return { present: true, readable: true, valid: false, errors: errors.length, concerns, pillars: null };
  const r = buildReport(m, f.sha256, result, "jrc.json");
  const pillars = {};
  for (const { key } of PILLARS) {
    const p = r.pillars[key];
    const good = p.claims.some((c) => c.evidence.some((e) => e.kind === "file" && ["verified", "present", "present-directory"].includes(e.result)));
    pillars[key] = {
      declared: p.declared_status,
      level: p.level,
      claims: p.claims.length,
      ...(p.declared_status === "not-applicable" && p.applicability ? { not_applicable: true } : {}),
      file_evidence: p.claims.flatMap((c) => c.evidence.filter((e) => e.kind === "file").map((e) => e.result)).reduce((a, k) => ({ ...a, [k]: (a[k] ?? 0) + 1 }), {}),
      good_file_evidence: good,
    };
  }
  return { present: true, readable: true, valid: r.summary.valid, errors: errors.length, warnings: r.summary.warnings, manifest_sha256: f.sha256, assessment_kind: m.assessment.kind, concerns, pillars };
}

function pillarStatus(key, checks, manifest, concerns) {
  const mp = manifest.pillars?.[key];
  if (mp?.not_applicable) return { status: "not-applicable", basis: "self-reported", explanation: "The repository's jrc.json declares this pillar not applicable and gives a reason. That's the project's own statement; the scan didn't check it." };
  const core = checks.filter((c) => c.core && c.outcome !== "not-applicable");
  const found = checks.filter((c) => c.outcome === "found");
  const contra = checks.some((c) => c.outcome === "contradicted") || concerns.some((c) => c.severity === "contradiction");
  const coreFound = core.filter((c) => c.outcome === "found").length;
  const counts = `${coreFound} of ${core.length} core checks found${found.length > coreFound ? `, plus ${found.length - coreFound} supporting` : ""}`;
  const fromManifest = mp?.good_file_evidence;
  if (!found.length && !fromManifest) {
    if (core.some((c) => c.outcome === "not-checked")) return { status: "unknown", basis: "unchecked", explanation: `Nothing was found, but some evidence couldn't be checked, so absence can't be concluded (${counts}).` };
    if (key === "data" && !manifest.present) return { status: "unknown", basis: "unchecked", explanation: "A file list can't show whether a project holds user data. Add jrc.json and either evidence this pillar or mark it not-applicable with a reason." };
    return { status: "missing", basis: "missing", explanation: `No evidence was found in the repository (${counts}). That shows it isn't here, not that the project fails the pillar.` };
  }
  if (core.length && coreFound === core.length && !contra) return { status: "evidenced", basis: "observed", explanation: `Every core check found public evidence (${counts}). This shows the files exist, not that they're correct.` };
  const why = contra ? "something in the repository contradicts this pillar; see the concerns" : fromManifest && !found.length ? "only jrc.json's own cited files were found" : "some core evidence is missing";
  return { status: "partially-evidenced", basis: "observed", explanation: `Partly evidenced: ${why} (${counts}).` };
}

function roadmap(checks, manifest, naPillars) {
  const steps = [];
  const add = (s) => steps.push(s);
  if (manifest.unknown) add({ id: "rescan", action: "Re-run the assessment when the whole file list can be read", pillar: null, effort: "small", impact: "high", after: [], why: "Part of the repository couldn't be read, so this scan can't tell what's missing, including whether jrc.json exists." });
  else if (!manifest.present) add({ id: "create-manifest", action: "Add jrc.json from the candidate below, fill in the assessor, and review every claim", pillar: null, effort: "small", impact: "high", after: [], why: "A manifest is how a project states its own claims, gaps and evidence. The candidate is a starting point built from what this scan found.", template: "jrc.json" });
  else if (!manifest.readable || manifest.valid === false) add({ id: "fix-manifest", action: "Fix jrc.json so it passes jrc check", pillar: null, effort: "small", impact: "high", after: [], why: `jrc.json ${manifest.readable ? `has ${manifest.errors} error(s)` : "couldn't be assessed"}; claims that fail checks mislead readers.` });
  checks.forEach((c, order) => {
    if (!["not-found", "contradicted", "not-checked"].includes(c.outcome) || naPillars.has(c.pillar)) return;
    const def = CHECKS.find((d) => d.id === c.id);
    add({ id: c.id, action: c.outcome === "not-checked" ? `Confirm by hand: ${def.title.toLowerCase()}` : def.fix.action, pillar: c.pillar, effort: c.outcome === "not-checked" ? "small" : def.fix.effort, impact: c.outcome === "contradicted" ? "high" : def.fix.impact, after: def.fix.after ?? [], why: c.why, ...(def.fix.detail ? { detail: def.fix.detail } : {}), ...(def.fix.template && c.outcome === "not-found" ? { template: def.fix.template } : {}), contradicted: c.outcome === "contradicted", order });
  });
  add({ id: "publish-report", action: "Run jrc check and publish the report in the repository", pillar: null, effort: "small", impact: "medium", after: ["rescan", "create-manifest", "fix-manifest"], why: "Readers can only check claims they can see." });
  add({ id: "invite-challenge", action: "Ask someone unaffiliated to take the Jolly Roger Challenge", pillar: null, effort: "medium", impact: "high", after: ["publish-report"], why: "This scan and any self-assessment are claims. Independent reproduction is the real test of whether the project could survive without you." });

  const ids = new Set(steps.map((s) => s.id));
  for (const s of steps) s.after = s.after.filter((d) => ids.has(d));
  const done = [];
  const pending = [...steps];
  const phase = { rescan: 0, "create-manifest": 0, "fix-manifest": 0, "publish-report": 2, "invite-challenge": 2 };
  const rank = (s) => [s.contradicted ? 0 : 1, phase[s.id] ?? 1, impactRank[s.impact], effortRank[s.effort], s.order ?? 0];
  const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return a.id < b.id ? -1 : 1; };
  while (pending.length) {
    const ready = pending.filter((s) => s.after.every((d) => done.some((x) => x.id === d))).sort(cmp);
    const next = ready[0] ?? pending.sort(cmp)[0];
    done.push(next);
    pending.splice(pending.indexOf(next), 1);
  }
  return done.map(({ order, contradicted, ...s }, i) => ({ step: i + 1, ...s, priority: contradicted ? "fix first" : s.impact }));
}

export function evaluateSnapshot(snap, { snapshotSha256 } = {}) {
  const x = context(snap);
  const checks = CHECKS.map((def) => {
    x.linked = 0;
    let r;
    try { r = def.test(x); } catch { r = x.notChecked("This check failed on unusual repository content, so it couldn't be completed."); }
    return { id: def.id, pillar: def.pillar, core: def.core, title: def.title, outcome: r.outcome, why: r.why || (r.outcome === "found" ? `Found ${r.paths.length} matching path(s).` : ""), evidence: [...new Set(r.paths)].slice(0, 5), evidence_total: new Set(r.paths).size, ...(r.concern ? { concern: r.concern } : {}) };
  });
  const manifest = evaluateManifest(snap);
  const concerns = [...(manifest.concerns ?? [])];
  for (const c of checks) {
    if (c.concern) concerns.push({ ...c.concern, pillar: c.pillar, severity: "warning" });
    if (c.outcome === "contradicted") concerns.push({ code: "C-CONTRADICTED", pillar: c.pillar, severity: "contradiction", message: `${c.title}: ${c.why}` });
  }
  if (snap.repo_meta?.archived) concerns.push({ code: "C-ARCHIVED", pillar: "governance", severity: "warning", message: "The repository is archived: it no longer accepts changes upstream. A fork can continue it." });
  const pillars = {};
  for (const { key, title, asks } of PILLARS) {
    const pc = checks.filter((c) => c.pillar === key);
    const mp = manifest.pillars?.[key];
    const st = pillarStatus(key, pc, manifest, concerns.filter((c) => c.pillar === key));
    if (mp && mp.declared === "evidenced" && snap.tree?.complete && (st.status === "missing" || st.status === "partially-evidenced")) concerns.push({ code: "C-OVERCLAIM", pillar: key, severity: "contradiction", message: `jrc.json declares this pillar evidenced, but the scan found it ${st.status}.` });
    pillars[key] = { title, question: asks, ...st, checks: pc.map(({ pillar, ...c }) => c), ...(mp ? { manifest: mp } : {}) };
  }
  for (const k of Object.keys(pillars)) pillars[k].concerns = concerns.filter((c) => c.pillar === k).length;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, Object.values(pillars).filter((p) => p.status === s).length]));
  const src = snap.source;
  return {
    jrc_assessment: ASSESSMENT_VERSION,
    tool: TOOL,
    snapshot: { version: SNAPSHOT_VERSION, sha256: snapshotSha256 ?? null, kind: src.kind, repository: src.repository ?? null, name: src.name ?? null, ref: src.ref, commit: src.commit, retrieved_at: src.retrieved_at, file_list_complete: Boolean(snap.tree?.complete), files_read: Object.keys(snap.files).length, skipped_unsafe_paths: snap.skipped_paths, unavailable: snap.unavailable },
    summary: { ...counts, concerns: concerns.length, contradictions: concerns.filter((c) => c.severity === "contradiction").length, manifest: manifest.present ? (manifest.readable ? (manifest.valid ? "valid" : "invalid") : "unreadable") : manifest.unknown ? "unknown" : "absent", basis: "automated scan of public files; not a review" },
    pillars,
    concerns,
    roadmap: roadmap(checks, manifest, new Set(Object.keys(pillars).filter((k) => pillars[k].status === "not-applicable"))),
    manifest: manifest.present ? { readable: manifest.readable, valid: manifest.valid ?? null, errors: manifest.errors ?? null, warnings: manifest.warnings ?? null, sha256: manifest.manifest_sha256 ?? null, assessment_kind: manifest.assessment_kind ?? null } : null,
    disclaimer: ASSESSMENT_DISCLAIMER,
  };
}

const encPath = (p) => p.split("/").map((s) => encodeURIComponent(s).replace(/[()'!*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
export const linkFor = (report, p) => (report.snapshot.repository && report.snapshot.commit ? `${report.snapshot.repository}/blob/${report.snapshot.commit}/${encPath(p)}` : null);
export { canonicalJson, short };
