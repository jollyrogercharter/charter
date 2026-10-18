import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { PILLAR_KEYS } from "./constants.mjs";
import { validateManifest } from "./validate.mjs";

// Words that imply an authority JRCv1 doesn't have; allowed only when negated nearby.
const MISLEADING = /\b(certified|certification|certifies|accredited|accreditation|endorsed|endorsement|osi[- ]approved|officially approved|guaranteed(?: to be)? (?:compliant|conformant)|fully compliant)\b/i;
const NEGATION = /\b(not|no|never|without|isn't|aren't|wasn't|nor|neither)\b[^.;:]{0,40}$/i;

const PRIVACY = [
  [/[A-Za-z0-9._%+-]+@(?!users\.noreply\.github\.com\b)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/, "email address"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, "GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "API secret key"],
  [/\bxox[abpors]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JSON Web Token"],
  [/(?:^|[\s"'(])\/(?:Users|home)\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\/, "local home-directory path"],
  [/https?:\/\/[^\s/:@]+:[^\s/@]+@/, "credentials embedded in a URL"],
  [/[?&](?:token|access_token|api_key|apikey|key|secret|signature|sig|password|X-Amz-Signature)=[^&\s"]{6,}/i, "secret in a URL query string"],
];

function* strings(v, at = "$") {
  if (typeof v === "string") yield [at, v];
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* strings(v[i], `${at}[${i}]`);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) yield* strings(x, `${at}.${k}`);
}

function misleadingIn(s) {
  const re = new RegExp(MISLEADING.source, "gi");
  for (let m; (m = re.exec(s)); ) if (!NEGATION.test(s.slice(0, m.index))) return m[0];
  return null;
}

function resolveInside(root, rel) {
  if (path.isAbsolute(rel) || /^[A-Za-z]:[\\/]/.test(rel)) return { error: "absolute paths are not allowed; use a path relative to the manifest" };
  const abs = path.resolve(root, rel);
  const realRoot = realpathSync(root);
  if (!existsSync(abs)) {
    const lexical = path.relative(root, abs);
    if (lexical.startsWith("..") || path.isAbsolute(lexical)) return { error: "path escapes the project directory" };
    return { missing: true };
  }
  const real = realpathSync(abs);
  const rr = path.relative(realRoot, real);
  if (rr.startsWith("..") || path.isAbsolute(rr)) return { error: "path resolves outside the project directory" };
  return { abs: real };
}

export function checkManifest(manifest, { root }) {
  const findings = [];
  const add = (severity, code, at, message, pillar) => findings.push({ severity, code, at, message, ...(pillar ? { pillar } : {}) });

  for (const e of validateManifest(manifest)) add("error", "E-SCHEMA", e.at, e.message);
  const schemaOk = !findings.length;

  for (const [at, s] of strings(manifest)) {
    for (const [re, label] of PRIVACY) if (re.test(s)) add("error", "E-PRIVACY", at, `contains what looks like a ${label}; published reports must not carry it`);
    if (/\bREPLACE:/.test(s)) add("warning", "W-PLACEHOLDER", at, "still contains a REPLACE: placeholder");
    if (/\.limitations\[|\.gaps\[/.test(at)) continue;
    const word = misleadingIn(s);
    if (word) add("error", "E-MISLEADING", at, `"${word}" implies an authority JRCv1 doesn't grant; JRCv1 has no certification, endorsement or approval`);
  }

  const evidenceResults = {};
  if (!schemaOk) return { findings, evidenceResults, schemaOk };

  const a = manifest.assessment;
  const today = new Date().toISOString().slice(0, 10);
  if (a.date > today) add("error", "E-DATE", "$.assessment.date", "assessment date is in the future");

  for (const key of PILLAR_KEYS) {
    const p = manifest.pillars[key];
    const at = `$.pillars.${key}`;
    if (p.status === "not-applicable") {
      if (!p.applicability) add("error", "E-NA-REASON", at, "not-applicable needs an applicability reason", key);
      if (p.claims.length) add("warning", "W-NA-CLAIMS", at, "claims on a not-applicable pillar are ignored", key);
    }
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
        if (v.reviewer && v.reviewer.trim().toLowerCase() === a.assessor.trim().toLowerCase()) add("error", "E-INDEPENDENT", `${cat}.verification.reviewer`, "the reviewer is the assessor; that is a self-report", key);
        if (v.reviewed && v.reviewed > today) add("error", "E-DATE", `${cat}.verification.reviewed`, "review date is in the future", key);
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
          else if (r.missing) { add("error", "E-MISSING", eat, `file not found: ${e.path}`, key); result = "missing"; }
          else if (statSync(r.abs).isDirectory()) {
            if (e.sha256) { add("error", "E-HASH", eat, "sha256 given for a directory", key); result = "invalid"; }
            else result = "present";
          } else if (e.sha256) {
            const got = createHash("sha256").update(readFileSync(r.abs)).digest("hex");
            if (got !== e.sha256) { add("error", "E-HASH", eat, `sha256 mismatch for ${e.path}: file is ${got}`, key); result = "hash-mismatch"; }
            else result = "verified";
          } else result = "present";
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
  if (a.kind === "self" && Object.values(manifest.pillars).some((p) => p.claims.some((c) => c.verification.level === "independently-reproduced"))) {
    add("info", "I-MIXED", "$.assessment", "a self-assessment that cites independent reproductions; those reproductions were not checked by this tool");
  }
  return { findings, evidenceResults, schemaOk };
}

export function loadManifest(file) {
  let raw;
  try { raw = readFileSync(file, "utf8"); }
  catch (e) { return { error: `cannot read ${file}: ${e.code ?? e.message}` }; }
  try { return { manifest: JSON.parse(raw), raw }; }
  catch (e) { return { error: `${file} is not valid JSON: ${e.message}`, raw }; }
}
