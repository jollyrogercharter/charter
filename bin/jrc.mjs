#!/usr/bin/env node
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { challengeMarkdown } from "../lib/jrc/challenge.mjs";
import { checkManifest, loadManifest } from "../lib/jrc/check.mjs";
import { TOOL } from "../lib/jrc/constants.mjs";
import { initManifest } from "../lib/jrc/init.mjs";
import { buildReport, reportBadge, reportMarkdown } from "../lib/jrc/report.mjs";

const USAGE = `jrc ${TOOL.version} — offline JRCv1 (draft) conformance tool

Usage:
  jrc init [dir] [--name NAME] [--stdout]     Create a starter jrc.json (never overwrites)
  jrc check [manifest] [--json]               Validate a manifest and its local evidence
  jrc report [manifest] [--format md|json|badge] [--out DIR]
                                              Write a reproducible assessment report
  jrc challenge [--out FILE] [--project NAME] [--repository URL]
                                              Print or write a Jolly Roger Challenge log template

manifest defaults to ./jrc.json; evidence paths resolve relative to its directory.
Exit codes: 0 ok (incomplete is fine) · 1 invalid manifest or evidence · 2 usage error.
jrc never fetches URLs or runs commands listed in a manifest.`;

const fail = (msg, code = 2) => { process.stderr.write(`jrc: ${msg}\n`); return code; };

function load(manifestArg) {
  const file = path.resolve(manifestArg ?? "jrc.json");
  const { manifest, raw, error } = loadManifest(file);
  return { file, manifest, raw, error, root: path.dirname(file) };
}

function printFindings(findings) {
  for (const f of findings) process.stderr.write(`${f.severity.padEnd(7)} ${f.code.padEnd(18)} ${f.at}: ${f.message}\n`);
}

export function main(argv) {
  const [cmd, ...rest] = argv;
  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        name: { type: "string" }, stdout: { type: "boolean" }, json: { type: "boolean" },
        format: { type: "string" }, out: { type: "string" }, project: { type: "string" }, repository: { type: "string" },
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
    if (!existsSync(dir)) return fail(`directory not found: ${dir}`);
    const text = JSON.stringify(initManifest(dir, { name: o.name }), null, 2) + "\n";
    if (o.stdout) { process.stdout.write(text); return 0; }
    const target = path.join(dir, "jrc.json");
    if (existsSync(target)) return fail(`${target} already exists; jrc init never overwrites. Use --stdout to print a fresh template.`, 1);
    writeFileSync(target, text, { flag: "wx" });
    process.stdout.write(`Created ${target}. Edit claims and evidence, then run: jrc check ${path.relative(process.cwd(), target) || "jrc.json"}\n`);
    return 0;
  }

  if (cmd === "check" || cmd === "report") {
    const { file, manifest, raw, error, root } = load(pos[0]);
    if (error) return fail(error, 1);
    const result = checkManifest(manifest, { root });
    const errors = result.findings.filter((f) => f.severity === "error");
    if (cmd === "check") {
      if (o.json) process.stdout.write(JSON.stringify(result.findings, null, 2) + "\n");
      else printFindings(result.findings);
      if (!o.json) {
        if (!result.schemaOk) process.stdout.write(`${path.basename(file)}: INVALID (schema errors)\n`);
        else {
          const r = buildReport(manifest, raw, result, path.basename(file));
          const s = r.summary;
          process.stdout.write(`${path.basename(file)}: ${errors.length ? "INVALID" : "valid"} — ${s.evidenced_pillars}/${s.applicable_pillars} applicable pillars evidenced, ${s.partial_pillars} partly, ${s.exploring_pillars} exploring (${s.basis}); ${errors.length} errors, ${s.warnings} warnings\n`);
        }
      }
      return errors.length ? 1 : 0;
    }
    if (!result.schemaOk) { printFindings(result.findings); return fail("cannot report on a manifest that fails schema validation", 1); }
    const r = buildReport(manifest, raw, result, path.relative(root, file) || path.basename(file));
    const outputs = { json: JSON.stringify(r, null, 2) + "\n", md: reportMarkdown(r), badge: reportBadge(r) };
    const names = { json: "jrc-report.json", md: "JRC-REPORT.md", badge: "jrc-badge.svg" };
    if (o.out) {
      mkdirSync(o.out, { recursive: true });
      for (const k of Object.keys(names)) writeFileSync(path.join(o.out, names[k]), outputs[k]);
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
    if (!o.out) { process.stdout.write(text); return 0; }
    if (existsSync(o.out)) return fail(`${o.out} already exists; not overwriting`, 1);
    writeFileSync(o.out, text, { flag: "wx" });
    process.stdout.write(`Wrote ${o.out}\n`);
    return 0;
  }

  return fail(`unknown command "${cmd}"\n\n${USAGE}`);
}

const invoked = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (invoked) process.exitCode = main(process.argv.slice(2));
