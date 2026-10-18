#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { challengeMarkdown } from "../lib/jrc/challenge.mjs";
import { blocksPublication, checkManifest, loadManifest, sha256Hex } from "../lib/jrc/check.mjs";
import { TOOL } from "../lib/jrc/constants.mjs";
import { initManifest } from "../lib/jrc/init.mjs";
import { buildReport, reportBadge, reportMarkdown } from "../lib/jrc/report.mjs";
import { collectLocalSnapshot } from "../lib/assess/local.mjs";
import { allArtifacts, AssessError, createSession } from "../lib/assess/session.mjs";
import { parseRepository } from "../lib/assess/github.mjs";

const USAGE = `jrc ${TOOL.version} \u2014 offline JRCv1 (draft) conformance tool

Usage:
  jrc init [dir] [--name NAME] [--stdout]     Create a starter jrc.json (never overwrites)
  jrc check [manifest] [--json]               Validate a manifest and its local evidence
  jrc report [manifest] [--format md|json|badge] [--out DIR]
                                              Write a reproducible assessment report
  jrc challenge [--out FILE] [--project NAME] [--repository URL]
                                              Print or write a Jolly Roger Challenge log template
  jrc assess [dir|github-url] [--ref REF] [--snapshot FILE] [--save-snapshot FILE] [--out DIR] [--format md|json]
                                              Scan a repository's public evidence and plan adoption

manifest defaults to ./jrc.json; evidence paths resolve relative to its directory.
Exit codes: 0 ok (incomplete is fine) \u00b7 1 invalid manifest or evidence \u00b7 2 usage error.
jrc never fetches URLs or runs commands listed in a manifest, and never runs repository code.
jrc assess reads api.github.com and raw.githubusercontent.com only when given a GitHub URL.`;

const safe = (s) => String(s).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\u2066-\u2069]/g, "\uFFFD");
const fail = (msg, code = 2) => { process.stderr.write(`jrc: ${safe(msg)}\n`); return code; };
const lexists = (p) => { try { lstatSync(p); return true; } catch { return false; } };

function writeNew(file, text) {
  if (lexists(file)) return `${file} already exists; not overwriting`;
  try { writeFileSync(file, text, { flag: "wx" }); } catch (e) { return `cannot write ${file}: ${e.code ?? e.message}`; }
  return null;
}

function load(manifestArg) {
  const file = path.resolve(manifestArg ?? "jrc.json");
  const { manifest, raw, error } = loadManifest(file);
  return { file, manifest, raw, error, root: path.dirname(file) };
}

function printFindings(findings) {
  for (const f of findings) process.stderr.write(`${f.severity.padEnd(7)} ${f.code.padEnd(18)} ${safe(f.at)}: ${safe(f.message)}\n`);
}

export async function main(argv) {
  try {
    if (argv[0] === "assess") return await assess(argv.slice(1));
    return run(argv);
  } catch (e) {
    return fail(`unexpected error: ${e.code ?? e.message}`, 1);
  }
}

function run(argv) {
  const [cmd, ...rest] = argv;
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        name: { type: "string" }, stdout: { type: "boolean" }, json: { type: "boolean" },
        format: { type: "string" }, out: { type: "string" }, project: { type: "string" }, repository: { type: "string" },
        ref: { type: "string" }, snapshot: { type: "string" }, "save-snapshot": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (e) {
    return fail(e.message);
  }
  const { values: o, positionals: pos } = parsed;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h" || o.help) { process.stdout.write(USAGE + "\n"); return cmd ? 0 : 2; }
  if (cmd === "--version" || cmd === "version") { process.stdout.write(`${TOOL.version}\n`); return 0; }

  if (cmd === "init") {
    const dir = path.resolve(pos[0] ?? ".");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return fail(`not a directory: ${dir}`);
    const text = JSON.stringify(initManifest(dir, { name: o.name }), null, 2) + "\n";
    if (o.stdout) { process.stdout.write(text); return 0; }
    const target = path.join(dir, "jrc.json");
    if (lexists(target)) return fail(`${target} already exists; jrc init never overwrites. Use --stdout to print a fresh template.`, 1);
    const err = writeNew(target, text);
    if (err) return fail(err, 1);
    process.stdout.write(`Created ${target}. Edit claims and evidence, then run: jrc check ${path.relative(process.cwd(), target) || "jrc.json"}\n`);
    return 0;
  }

  if (cmd === "check" || cmd === "report") {
    const { file, manifest, raw, error, root } = load(pos[0]);
    if (error) {
      if (o.json) process.stdout.write(JSON.stringify([{ severity: "error", code: "E-LOAD", at: "$", message: error }], null, 2) + "\n");
      return fail(error, 1);
    }
    const result = checkManifest(manifest, { root, manifestFile: file });
    const errors = result.findings.filter((f) => f.severity === "error");
    if (cmd === "check") {
      if (o.json) process.stdout.write(JSON.stringify(result.findings, null, 2) + "\n");
      else printFindings(result.findings);
      if (!o.json) {
        if (!result.schemaOk) process.stdout.write(`${path.basename(file)}: INVALID (schema errors)\n`);
        else {
          const r = buildReport(manifest, sha256Hex(raw), result, path.basename(file));
          const s = r.summary;
          process.stdout.write(`${path.basename(file)}: ${errors.length ? "INVALID" : "valid"} \u2014 ${s.evidenced_pillars}/${s.applicable_pillars} applicable pillars evidenced, ${s.partial_pillars} partly, ${s.exploring_pillars} exploring (${s.basis}); ${errors.length} errors, ${s.warnings} warnings\n`);
        }
      }
      return errors.length ? 1 : 0;
    }
    if (!result.schemaOk) { printFindings(result.findings); return fail("cannot report on a manifest that fails schema validation", 1); }
    if (blocksPublication(result.findings)) {
      printFindings(result.findings.filter((f) => f.code === "E-PRIVACY" || f.code === "E-CONTROL"));
      return fail("refusing to write a report that would publish private data or hidden characters; fix the manifest first", 1);
    }
    const r = buildReport(manifest, sha256Hex(raw), result, path.relative(root, file) || path.basename(file));
    const outputs = { json: JSON.stringify(r, null, 2) + "\n", md: reportMarkdown(r), badge: reportBadge(r) };
    const names = { json: "jrc-report.json", md: "JRC-REPORT.md", badge: "jrc-badge.svg" };
    if (o.out !== undefined) {
      if (!o.out) return fail("--out needs a directory");
      if (lexists(o.out) && !lstatSync(o.out).isDirectory()) return fail(`--out ${o.out} exists and is not a directory`);
      try { mkdirSync(o.out, { recursive: true }); } catch (e) { return fail(`cannot create ${o.out}: ${e.code ?? e.message}`, 1); }
      for (const k of Object.keys(names)) {
        const target = path.join(o.out, names[k]);
        if (lexists(target) && lstatSync(target).isSymbolicLink()) return fail(`${target} is a symlink; refusing to write through it`, 1);
        try { writeFileSync(target, outputs[k]); } catch (e) { return fail(`cannot write ${target}: ${e.code ?? e.message}`, 1); }
      }
      process.stdout.write(`Wrote ${Object.values(names).map((n) => path.join(o.out, n)).join(", ")}\n`);
    } else {
      const fmt = o.format ?? "md";
      if (!outputs[fmt]) return fail(`unknown --format ${fmt} (md, json, badge)`);
      process.stdout.write(outputs[fmt]);
    }
    if (errors.length) printFindings(errors);
    return errors.length ? 1 : 0;
  }

  if (cmd === "challenge") {
    const text = challengeMarkdown({ project: o.project, repository: o.repository });
    if (o.out === undefined) { process.stdout.write(text); return 0; }
    if (!o.out) return fail("--out needs a file name");
    const err = writeNew(o.out, text);
    if (err) return fail(err, 1);
    process.stdout.write(`Wrote ${o.out}\n`);
    return 0;
  }

  return fail(`unknown command "${cmd}"\n\n${USAGE}`);
}

async function assess(rest) {
  let parsed;
  try {
    parsed = parseArgs({ args: rest, allowPositionals: true, options: { ref: { type: "string" }, snapshot: { type: "string" }, "save-snapshot": { type: "string" }, out: { type: "string" }, format: { type: "string" } } });
  } catch (e) {
    return fail(e.message);
  }
  const { values: o, positionals: pos } = parsed;
  if (pos.length > 1) return fail("assess takes one directory or GitHub URL");
  if (o.snapshot && pos.length) return fail("give a target or --snapshot, not both");
  const fmt = o.format ?? "md";
  if (!["md", "json"].includes(fmt)) return fail(`unknown --format ${fmt} (md, json)`);
  const session = createSession({ fetch: globalThis.fetch, sha256: async (b) => sha256Hex(b) });
  let input;
  if (o.snapshot) {
    const { manifest: snapshot, error } = loadManifest(path.resolve(o.snapshot));
    if (error) return fail(error, 1);
    input = { snapshot };
  } else if (pos[0] && /^(https?:\/\/)?(www\.)?github\.com\//i.test(pos[0]) && parseRepository(pos[0])) {
    input = { repository: pos[0], ...(o.ref ? { ref: o.ref } : {}) };
  } else {
    const dir = path.resolve(pos[0] ?? ".");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return fail(`not a directory or GitHub URL: ${pos[0] ?? "."}`);
    if (o.ref) return fail("--ref only applies to GitHub URLs");
    input = { snapshot: await collectLocalSnapshot(dir) };
  }
  let result;
  try { result = await session.assess(input); }
  catch (e) {
    if (!(e instanceof AssessError)) throw e;
    for (const d of e.details ?? []) process.stderr.write(`error   ${safe(d.at)}: ${safe(d.message)}\n`);
    return fail(e.message, 1);
  }
  const { files } = allArtifacts(result);
  if (o["save-snapshot"]) {
    const err = writeNew(o["save-snapshot"], files["jrc-snapshot.json"]);
    if (err) return fail(err, 1);
  }
  if (o.out !== undefined) {
    if (!o.out) return fail("--out needs a directory");
    if (lexists(o.out) && !lstatSync(o.out).isDirectory()) return fail(`--out ${o.out} exists and is not a directory`);
    try { mkdirSync(o.out, { recursive: true }); } catch (e) { return fail(`cannot create ${o.out}: ${e.code ?? e.message}`, 1); }
    const existing = Object.keys(files).map((n) => path.join(o.out, n)).filter(lexists);
    if (existing.length) return fail(`refusing to overwrite ${existing.join(", ")}; choose an empty --out directory`, 1);
    for (const [name, text] of Object.entries(files)) {
      const err = writeNew(path.join(o.out, name), text);
      if (err) return fail(err, 1);
    }
    process.stdout.write(`Wrote ${Object.keys(files).length} files to ${o.out}. Nothing was published; review them before using any.\n`);
  } else {
    process.stdout.write(fmt === "json" ? files["jrc-assessment.json"] : files["JRC-ASSESSMENT.md"]);
  }
  return 0;
}

const invoked = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (invoked) process.exitCode = await main(process.argv.slice(2));
