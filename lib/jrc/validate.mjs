// Structural validation mirroring spec/jrc-0.1.schema.json; the test suite checks both agree.
import { ASSESSMENT_KINDS, EVIDENCE_KINDS, PILLAR_KEYS, SPEC_VERSION, STATUSES, VERIFICATION_LEVELS } from "./constants.mjs";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v, min = 1) => typeof v === "string" && [...v.trim()].length >= min;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;

function isUri(v, httpsOnly = false) {
  if (!isStr(v) || !/^https?:\/\/\S+$/.test(v)) return false;
  try {
    const u = new URL(v);
    return httpsOnly ? u.protocol === "https:" : ["https:", "http:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function isDate(v) {
  if (typeof v !== "string" || !DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

function only(obj, allowed, at, errors) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push({ at: `${at}.${k}`, message: "unknown property" });
}

function evidence(e, at, errors) {
  if (!isObj(e)) return errors.push({ at, message: "must be an object" });
  if (!EVIDENCE_KINDS.includes(e.kind)) return errors.push({ at: `${at}.kind`, message: `must be one of ${EVIDENCE_KINDS.join(", ")}` });
  const fields = { file: ["kind", "path", "sha256", "note"], url: ["kind", "url", "note"], command: ["kind", "command", "expect", "note"] }[e.kind];
  only(e, fields, at, errors);
  if (e.kind === "file") {
    if (!isStr(e.path)) errors.push({ at: `${at}.path`, message: "required string" });
    if (e.sha256 !== undefined && !(typeof e.sha256 === "string" && HEX64.test(e.sha256))) errors.push({ at: `${at}.sha256`, message: "must be 64 lowercase hex characters" });
  }
  if (e.kind === "url" && !isUri(e.url)) errors.push({ at: `${at}.url`, message: "must be an http(s) URL" });
  if (e.kind === "command") {
    if (!isStr(e.command)) errors.push({ at: `${at}.command`, message: "required string" });
    if (e.expect !== undefined && !isStr(e.expect)) errors.push({ at: `${at}.expect`, message: "must be a non-empty string" });
  }
  if (e.note !== undefined && !isStr(e.note)) errors.push({ at: `${at}.note`, message: "must be a non-empty string" });
}

function claim(c, at, errors) {
  if (!isObj(c)) return errors.push({ at, message: "must be an object" });
  only(c, ["id", "statement", "evidence", "verification"], at, errors);
  if (!(typeof c.id === "string" && ID.test(c.id))) errors.push({ at: `${at}.id`, message: "required, lowercase letters, digits and hyphens" });
  if (!isStr(c.statement, 3)) errors.push({ at: `${at}.statement`, message: "required string" });
  if (!Array.isArray(c.evidence)) errors.push({ at: `${at}.evidence`, message: "required array (may be empty)" });
  else c.evidence.forEach((e, i) => evidence(e, `${at}.evidence[${i}]`, errors));
  const v = c.verification;
  if (!isObj(v)) return errors.push({ at: `${at}.verification`, message: "required object" });
  only(v, ["level", "reviewer", "reviewed", "report"], `${at}.verification`, errors);
  if (!VERIFICATION_LEVELS.includes(v.level)) errors.push({ at: `${at}.verification.level`, message: `must be one of ${VERIFICATION_LEVELS.join(", ")}` });
  if (v.reviewer !== undefined && !isStr(v.reviewer)) errors.push({ at: `${at}.verification.reviewer`, message: "must be a non-empty string" });
  if (v.reviewed !== undefined && !isDate(v.reviewed)) errors.push({ at: `${at}.verification.reviewed`, message: "must be a YYYY-MM-DD date" });
  if (v.report !== undefined && !isUri(v.report)) errors.push({ at: `${at}.verification.report`, message: "must be an http(s) URL" });
}

function pillar(p, at, errors) {
  if (!isObj(p)) return errors.push({ at, message: "must be an object" });
  only(p, ["status", "applicability", "claims", "gaps", "candidates"], at, errors);
  if (!STATUSES.includes(p.status)) errors.push({ at: `${at}.status`, message: `must be one of ${STATUSES.join(", ")}` });
  if (p.applicability !== undefined && !isStr(p.applicability, 10)) errors.push({ at: `${at}.applicability`, message: "must explain applicability in at least 10 characters" });
  if (!Array.isArray(p.claims)) errors.push({ at: `${at}.claims`, message: "required array (may be empty)" });
  else {
    p.claims.forEach((c, i) => claim(c, `${at}.claims[${i}]`, errors));
    const ids = p.claims.map((c) => c?.id);
    ids.forEach((id, i) => { if (id && ids.indexOf(id) !== i) errors.push({ at: `${at}.claims[${i}].id`, message: `duplicate id "${id}"` }); });
  }
  for (const k of ["gaps", "candidates"]) {
    if (p[k] === undefined) continue;
    if (!Array.isArray(p[k]) || !p[k].every((g) => isStr(g))) errors.push({ at: `${at}.${k}`, message: "must be an array of non-empty strings" });
  }
}

export function validateManifest(m) {
  const errors = [];
  if (!isObj(m)) return [{ at: "$", message: "manifest must be a JSON object" }];
  only(m, ["$schema", "jrc", "project", "assessment", "pillars", "limitations"], "$", errors);
  if (m.$schema !== undefined && !isUri(m.$schema)) errors.push({ at: "$.$schema", message: "must be a URL" });
  if (m.jrc !== SPEC_VERSION) errors.push({ at: "$.jrc", message: `must be "${SPEC_VERSION}" for this tool` });
  const pr = m.project;
  if (!isObj(pr)) errors.push({ at: "$.project", message: "required object" });
  else {
    only(pr, ["name", "repository", "homepage", "description"], "$.project", errors);
    if (!isStr(pr.name)) errors.push({ at: "$.project.name", message: "required string" });
    for (const k of ["repository", "homepage"]) if (pr[k] !== undefined && !isUri(pr[k])) errors.push({ at: `$.project.${k}`, message: "must be an http(s) URL" });
    if (pr.description !== undefined && !isStr(pr.description)) errors.push({ at: "$.project.description", message: "must be a non-empty string" });
  }
  const a = m.assessment;
  if (!isObj(a)) errors.push({ at: "$.assessment", message: "required object" });
  else {
    only(a, ["kind", "assessor", "date", "commit", "method"], "$.assessment", errors);
    if (!ASSESSMENT_KINDS.includes(a.kind)) errors.push({ at: "$.assessment.kind", message: `must be one of ${ASSESSMENT_KINDS.join(", ")}` });
    if (!isStr(a.assessor)) errors.push({ at: "$.assessment.assessor", message: "required string (a name, handle or role)" });
    if (!isDate(a.date)) errors.push({ at: "$.assessment.date", message: "required YYYY-MM-DD date" });
    if (a.commit !== undefined && !(typeof a.commit === "string" && /^[0-9a-f]{7,64}$/.test(a.commit))) errors.push({ at: "$.assessment.commit", message: "must be a hex commit id" });
    if (a.method !== undefined && !isStr(a.method)) errors.push({ at: "$.assessment.method", message: "must be a non-empty string" });
  }
  if (!isObj(m.pillars)) errors.push({ at: "$.pillars", message: "required object" });
  else {
    only(m.pillars, PILLAR_KEYS, "$.pillars", errors);
    for (const k of PILLAR_KEYS) {
      if (m.pillars[k] === undefined) errors.push({ at: `$.pillars.${k}`, message: "required pillar (use status not-started if you have nothing yet)" });
      else pillar(m.pillars[k], `$.pillars.${k}`, errors);
    }
  }
  if (m.limitations !== undefined && !(Array.isArray(m.limitations) && m.limitations.every((l) => isStr(l)))) errors.push({ at: "$.limitations", message: "must be an array of non-empty strings" });
  return errors;
}
