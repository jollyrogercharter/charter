import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { PILLAR_KEYS } from "./constants.mjs";
import { validateManifest } from "./validate.mjs";

// Control, bidi-override, zero-width and line-separator characters: banned from manifests outright.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\u2060-\u2064\u2066-\u2069\ufeff]/;
const PROSE = /^\$\.(project\.(name|description)|assessment\.(assessor|method)|limitations\[\d+\]|pillars\.\w+\.(applicability|gaps\[\d+\]|claims\[\d+\]\.(statement|verification\.reviewer|evidence\[\d+\]\.note)))$/;

const MISLEADING = /\b(certif(?:ied|ication|icate|ies|y)|accredit(?:ed|ation)|endors(?:ed|ement|es)|officially|awarded|independently\s+audited|audited\s+by|guaranteed(?:\s+to\s+be)?\s+(?:compliant|conformant)|fully\s+(?:compliant|conformant))\b/gi;
const NEGATION = /\b(not|no|never|nobody|none|without|isn'?t|aren'?t|wasn'?t|hasn'?t|haven'?t|nor|neither)\s+(?:\S+\s+){0,2}$/i;

const PRIVACY = [
  [/[A-Za-z0-9._%+-]+@(?!users\.noreply\.github\.com\b)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b(?!:)/, "email address"],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/, "GitHub token"],
  [/\b(?:sk|rk|pk)[-_](?:live|test|proj)?[-_]?[A-Za-z0-9]{20,}/, "API secret key"],
  [/\b(?:npm_[A-Za-z0-9]{30,}|glpat-[A-Za-z0-9_-]{16,}|xox[abpors]-[A-Za-z0-9-]{10,})/, "registry or chat token"],
  [/\bAKIA[0-9A-Z]{16}\b|aws_secret_access_key\s*[:=]/i, "AWS credential"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/, "private key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JSON Web Token"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{16,}|\b(?:password|passwd|pwd)\s*[:=]\s*\S{4,}/i, "credential"],
  [/(?:^|[^\w.-])(?:\/Users\/(?!Shared\b)[^\s/:"'`)]+|\/home\/(?!runner\b)[^\s/:"'`)]+|\/root\/|[A-Za-z]:[\\/]Users[\\/][^\\/\s]+|~\/\.(?:ssh|aws|gnupg|config)\b)/, "local home-directory path"],
  [/https?:\/\/[^\s/:@]+:[^\s/@]+@/, "credentials embedded in a URL"],
  [/[?&#](?:token|access_token|id_token|api_key|apikey|key|secret|signature|sig|password|auth|code|X-Amz-Signature)=[^&\s"#]{4,}/i, "secret in a URL"],
];

const normalize = (s) => s.normalize("NFKC").replace(/[\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/g, "");

function strings(root) {
  const out = [];
  const stack = [[root, "$"]];
  while (stack.length) {
    const [v, at] = stack.pop();
    if (typeof v === "string") out.push([at, v]);
    else if (Array.isArray(v)) for (let i = v.length - 1; i >= 0; i--) stack.push([v[i], `${at}[${i}]`]);
    else if (v && typeof v === "object") for (const k of Object.keys(v).reverse()) stack.push([v[k], `${at}.${k}`]);
  }
  return out;
}

function misleadingIn(s) {
  const t = normalize(s);
  for (const m of t.matchAll(MISLEADING)) if (!NEGATION.test(t.slice(0, m.index))) return m[0];
  return null;
}

const outside = (rel) => rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);

function resolveInside(root, rel) {
  if (path.isAbsolute(rel) || /^[A-Za-z]:[\\/]/.test(rel) || rel.includes("\0")) return { error: "absolute or invalid paths are not allowed; use a path relative to the manifest" };
  const abs = path.resolve(root, rel);
  if (outside(path.relative(root, abs))) return { error: "path is outside the project directory" };
  let lst;
  try { lst = lstatSync(abs); } catch { return { missing: true }; }
  let real;
  try { real = realpathSync(abs); } catch { return { missing: true, dangling: lst.isSymbolicLink() }; }
  if (outside(path.relative(realpathSync(root), real))) return { error: "path is outside the project directory" };
  return { abs: real };
}

export function checkManifest(manifest, { root, manifestFile }) {
  const findings = [];
  const add = (severity, code, at, message, pillar) => findings.push({ severity, code, at, message, ...(pillar ? { pillar } : {}) });

  for (const e of validateManifest(manifest)) add("error", "E-SCHEMA", e.at, e.message);
  const schemaOk = !findings.length;

  for (const [at, s] of strings(manifest)) {
    if (/[\t\n\r]/.test(s) && /\.(name|assessor|reviewer|reviewed|date|commit|id|path|url|sha256)$/.test(at)) add("error", "E-CONTROL", at, "line breaks or tabs aren't allowed in names, identifiers, paths or URLs");
    else if (CONTROL.test(s)) add("error", "E-CONTROL", at, "contains control, zero-width or bidirectional-override characters, which can hide or forge text in reports");
    if (s.split(/\s+/).some((w) => /\p{Script=Latin}/u.test(w) && /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(w))) add("error", "E-CONFUSABLE", at, "mixes Latin with Cyrillic or Greek letters inside one word, which can disguise text");
    if (/\bREPLACE:/.test(s)) add("warning", "W-PLACEHOLDER", at, "still contains a REPLACE: placeholder");
    const n = normalize(s);
    for (const [re, label] of PRIVACY) if (re.test(n)) add("error", "E-PRIVACY", at, `contains what looks like a ${label}; reports must not carry it`);
    if (PROSE.test(at)) {
      const word = misleadingIn(s);
      if (word) add("error", "E-MISLEADING", at, `"${word}" implies an authority JRCv1 doesn't grant; it has no certification, endorsement or award`);
    }
  }

  const evidenceResults = {};
  if (!schemaOk) return { findings, evidenceResults, schemaOk };

  const a = manifest.assessment;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (a.date > tomorrow) add("error", "E-DATE", "$.assessment.date", "assessment date is in the future");
  const who = (s) => normalize(s).toLowerCase().replace(/^@/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const assessor = who(a.assessor);
  const projectName = who(manifest.project.name);
  if (a.kind === "independent" && (assessor === projectName || assessor.includes(projectName) || projectName.includes(assessor))) {
    add("error", "E-INDEPENDENT", "$.assessment.assessor", "an independent assessment can't be made by the project itself");
  }
  const manifestReal = manifestFile && existsSync(manifestFile) ? realpathSync(manifestFile) : null;

  let applicable = 0;
  for (const key of PILLAR_KEYS) {
    const p = manifest.pillars[key];
    const at = `$.pillars.${key}`;
    if (p.status === "not-applicable") {
      if (!p.applicability) add("error", "E-NA-REASON", at, "not-applicable needs an applicability reason", key);
      if (p.claims.length) add("warning", "W-NA-CLAIMS", at, "claims on a not-applicable pillar are ignored", key);
    } else applicable++;
    if (p.status === "evidenced" && (!p.claims.length || p.claims.some((c) => !c.evidence.length))) {
      add("error", "E-EVIDENCED-EMPTY", at, "status is evidenced but a claim has no evidence (or there are no claims)", key);
    }
    if (p.status === "not-started" && p.claims.length) add("warning", "W-STATUS", at, "status is not-started but claims are listed", key);

    p.claims.forEach((c, ci) => {
      const cat = `${at}.claims[${ci}]`;
      const v = c.verification;
      if (v.level === "independently-reproduced") {
        const missing = ["reviewer", "reviewed", "report"].filter((k) => !v[k]);
        if (missing.length) add("error", "E-INDEPENDENT", `${cat}.verification`, `independently-reproduced needs ${missing.join(", ")}`, key);
        if (v.reviewer) {
          const r = who(v.reviewer);
          if (r === assessor || r === projectName) add("error", "E-INDEPENDENT", `${cat}.verification.reviewer`, "the reviewer is the assessor or the project itself; that is a self-report", key);
          else if (r.includes(assessor) || assessor.includes(r) || r.includes(projectName)) add("warning", "W-INDEPENDENT", `${cat}.verification.reviewer`, "the reviewer's name overlaps the assessor's or the project's; make sure they are unaffiliated", key);
        }
        if (v.reviewed && v.reviewed > tomorrow) add("error", "E-DATE", `${cat}.verification.reviewed`, "review date is in the future", key);
        if (v.report && manifest.project.homepage && v.report.startsWith(manifest.project.homepage)) add("warning", "W-INDEPENDENT", `${cat}.verification.report`, "the review report is hosted on the project's own site", key);
      } else if (v.reviewer || v.report) {
        add("warning", "W-REVIEWER", `${cat}.verification`, "a reviewer is named but the level is self-reported", key);
      }
      if (!c.evidence.length && p.status !== "not-applicable") add("info", "I-NO-EVIDENCE", cat, "claim has no evidence yet", key);

      c.evidence.forEach((e, ei) => {
        const eat = `${cat}.evidence[${ei}]`;
        let result;
        if (e.kind === "file") {
          const r = resolveInside(root, e.path);
          if (r.error) { add("error", "E-PATH", eat, r.error, key); result = "invalid"; }
          else if (r.missing) { add("error", "E-MISSING", eat, r.dangling ? "evidence is a broken symlink" : "evidence file not found", key); result = "missing"; }
          else {
            const st = statSync(r.abs);
            if (manifestReal && r.abs === manifestReal) { add("error", "E-WEAK-EVIDENCE", eat, "the manifest can't be evidence for itself", key); result = "invalid"; }
            else if (r.abs === realpathSync(root)) { add("error", "E-WEAK-EVIDENCE", eat, "the whole project directory isn't evidence for a specific claim", key); result = "invalid"; }
            else if (st.isDirectory()) {
              if (e.sha256) { add("error", "E-HASH", eat, "sha256 given for a directory", key); result = "invalid"; }
              else result = "present-directory";
            } else if (!st.isFile()) { add("error", "E-PATH", eat, "evidence must be a regular file or directory", key); result = "invalid"; }
            else if (st.size === 0) { add("error", "E-WEAK-EVIDENCE", eat, "evidence file is empty", key); result = "invalid"; }
            else if (e.sha256) {
              let got;
              try { got = createHash("sha256").update(readFileSync(r.abs)).digest("hex"); }
              catch (err) { add("error", "E-UNREADABLE", eat, `cannot read evidence (${err.code ?? "error"})`, key); result = "invalid"; }
              if (got && got !== e.sha256) { add("error", "E-HASH", eat, `sha256 mismatch: file is ${got}`, key); result = "hash-mismatch"; }
              else if (got) result = "verified";
            } else result = "present";
          }
        } else if (e.kind === "url") {
          if (!e.url.startsWith("https://")) add("warning", "W-HTTP", eat, "plain http evidence can be altered in transit", key);
          result = "not-fetched";
        } else {
          result = "not-run";
        }
        evidenceResults[eat] = result;
      });
    });
  }
  if (!applicable) add("warning", "W-ALL-NA", "$.pillars", "every pillar is not-applicable; the report will show 0 of 0");
  if (a.kind === "self" && Object.values(manifest.pillars).some((p) => p.claims.some((c) => c.verification.level === "independently-reproduced"))) {
    add("info", "I-MIXED", "$.assessment", "a self-assessment that cites independent reproductions; those reproductions were not checked by this tool");
  }
  return { findings, evidenceResults, schemaOk };
}

// Shared with Quartermaster: returns [{ at, kind }] for every string that looks private or hides text.
export function privacyScan(value) {
  const hits = [];
  for (const [at, s] of strings(value)) {
    if (CONTROL.test(s)) hits.push({ at, kind: "hidden or control characters" });
    const n = normalize(s);
    for (const [re, label] of PRIVACY) if (re.test(n)) hits.push({ at, kind: label });
  }
  return hits;
}

export function loadManifest(file) {
  let raw;
  try { raw = readFileSync(file, "utf8"); }
  catch (e) { return { error: `cannot read ${path.basename(file)}: ${e.code ?? e.message}` }; }
  try { return { manifest: JSON.parse(raw.replace(/^\ufeff/, "")), raw }; }
  catch (e) { return { error: `${path.basename(file)} is not valid JSON: ${e.message}`, raw }; }
}

export const blocksPublication = (findings) => findings.some((f) => f.severity === "error" && (f.code === "E-PRIVACY" || f.code === "E-CONTROL"));
