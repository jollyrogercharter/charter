// Builds and checks records for the proposed org.jollyrogercharter.* Lexicons, and prepares (never performs) publication.
import { PILLAR_KEYS } from "../jrc/constants.mjs";
import { privacyScan } from "../jrc/core.mjs";

export const NSIDS = { assessment: "org.jollyrogercharter.assessment", adoption: "org.jollyrogercharter.adoption", contribution: "org.jollyrogercharter.contribution" };
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
// Syntax plus semantics, as the atproto spec asks: real calendar dates, valid times, and no "-00:00" offset.
function validDatetime(s) {
  const m = DATETIME.exec(s);
  if (!m || m[8] === "-00:00") return false;
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || se > 59) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate() && !Number.isNaN(Date.parse(s));
}
const URI = /^[a-z][a-z0-9+.-]*:\S+$/i;
const AT_URI = /^at:\/\/[A-Za-z0-9._:%-]+(\/[A-Za-z0-9.-]+(\/[A-Za-z0-9._~:@!$&'()*+,;=-]+)?)?$/;
const bytes = (s) => new TextEncoder().encode(s).length;
const graphemes = (s) => (typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].length : [...s].length);

function resolveRef(lexicons, ref, fromId) {
  const r = ref.replace(/^lex:/, "");
  const [id, name] = r.startsWith("#") ? [fromId, r.slice(1)] : r.split("#");
  const doc = lexicons[id];
  return doc ? { def: doc.defs[name ?? "main"], id } : null;
}

// Validates the Lexicon subset these schemas use. Tests check it agrees with @atproto/lexicon.
export function validateRecord(lexicons, nsid, record) {
  const errors = [];
  const doc = lexicons[nsid];
  if (!doc) return [{ at: "$", message: `unknown lexicon ${nsid}` }];
  if (record?.$type !== nsid) errors.push({ at: "$.$type", message: `must be ${nsid}` });
  const walk = (def, v, at, fromId) => {
    if (def.type === "ref") {
      const r = resolveRef(lexicons, def.ref, fromId);
      return r ? walk(r.def, v, at, r.id) : errors.push({ at, message: `unresolved ref ${def.ref}` });
    }
    if (def.type === "object") {
      if (v === null || typeof v !== "object" || Array.isArray(v)) return errors.push({ at, message: "must be an object" });
      for (const k of def.required ?? []) if (v[k] === undefined) errors.push({ at: `${at}.${k}`, message: "is required" });
      for (const [k, sub] of Object.entries(def.properties ?? {})) if (v[k] !== undefined) walk(sub, v[k], `${at}.${k}`, fromId);
      return;
    }
    if (def.type === "array") {
      if (!Array.isArray(v)) return errors.push({ at, message: "must be an array" });
      if (def.maxLength !== undefined && v.length > def.maxLength) errors.push({ at, message: `at most ${def.maxLength} items` });
      return v.forEach((x, i) => walk(def.items, x, `${at}[${i}]`, fromId));
    }
    if (def.type === "string") {
      if (typeof v !== "string") return errors.push({ at, message: "must be a string" });
      if (def.maxLength !== undefined && bytes(v) > def.maxLength) errors.push({ at, message: `at most ${def.maxLength} UTF-8 bytes` });
      if (def.minLength !== undefined && bytes(v) < def.minLength) errors.push({ at, message: `at least ${def.minLength} UTF-8 bytes` });
      if (def.maxGraphemes !== undefined && graphemes(v) > def.maxGraphemes) errors.push({ at, message: `at most ${def.maxGraphemes} graphemes` });
      if (def.format === "datetime" && !validDatetime(v)) errors.push({ at, message: "must be an atproto datetime" });
      if (def.format === "uri" && !URI.test(v)) errors.push({ at, message: "must be a URI" });
      if (def.format === "at-uri" && !AT_URI.test(v)) errors.push({ at, message: "must be an at:// URI" });
      return;
    }
    if (def.type === "integer") {
      if (!Number.isInteger(v)) return errors.push({ at, message: "must be an integer" });
      if (def.minimum !== undefined && v < def.minimum) errors.push({ at, message: `at least ${def.minimum}` });
      if (def.maximum !== undefined && v > def.maximum) errors.push({ at, message: `at most ${def.maximum}` });
      return;
    }
    if (def.type === "boolean" && typeof v !== "boolean") errors.push({ at, message: "must be true or false" });
  };
  walk(doc.defs.main.record, record, "$", nsid);
  return errors;
}

// From an adoption-journey report (lib/assess/evaluate.mjs). independenceVerified is always false: a scan can't establish it.
export function assessmentRecord(report, { createdAt, reportUri, reportSha256 } = {}) {
  return {
    $type: NSIDS.assessment,
    subject: { repository: report.snapshot.repository, ...(report.snapshot.commit ? { commit: report.snapshot.commit } : {}), ...(report.manifest?.sha256 ? { manifestSha256: report.manifest.sha256 } : {}) },
    standard: "JRCv1/0.1",
    kind: "automated-scan",
    pillars: PILLAR_KEYS.map((k) => ({ pillar: k, status: report.pillars[k].status, concerns: report.pillars[k].concerns ?? 0 })),
    tool: { name: report.tool.name, version: report.tool.version },
    ...(reportUri ? { reportUri } : {}),
    ...(reportSha256 ? { reportSha256 } : {}),
    independenceVerified: false,
    createdAt: createdAt ?? report.snapshot.retrieved_at,
  };
}

export function adoptionRecord({ repository, commit, manifestUri, manifestSha256, assessment, statement, declaredAt, createdAt }) {
  return {
    $type: NSIDS.adoption,
    subject: { repository, ...(commit ? { commit } : {}), ...(manifestSha256 ? { manifestSha256 } : {}) },
    standard: "JRCv1/0.1",
    ...(manifestUri ? { manifestUri } : {}),
    ...(assessment ? { assessment } : {}),
    ...(statement ? { statement } : {}),
    declaredAt,
    createdAt: createdAt ?? declaredAt,
  };
}

export function contributionRecord({ kind, title, subject, url, summary, aiAssisted, createdAt }) {
  return { $type: NSIDS.contribution, kind, title, subject, ...(url ? { url } : {}), ...(summary ? { summary } : {}), ...(aiAssisted !== undefined ? { aiAssisted } : {}), createdAt };
}

// Returns what the user's own client would send. No token, no network, no PDS chosen for them.
export function preparePublication(lexicons, record) {
  const nsid = record?.$type;
  if (!Object.values(NSIDS).includes(nsid)) return { error: { code: "INVALID_INPUT", message: `record.$type must be one of ${Object.values(NSIDS).join(", ")}` } };
  const problems = validateRecord(lexicons, nsid, record);
  if (problems.length) return { error: { code: "INVALID_RECORD", message: "The record doesn't match the proposed Lexicon.", problems: problems.slice(0, 8) } };
  const leaks = privacyScan(record);
  if (leaks.length) return { error: { code: "PRIVATE_DATA", message: `Remove private data before publishing: ${[...new Set(leaks.map((l) => l.kind))].join(", ")}.` } };
  const body = { repo: "YOUR_DID_OR_HANDLE", collection: nsid, record };
  return {
    record_valid: true,
    collection: nsid,
    xrpc_method: "com.atproto.repo.createRecord",
    request_body: body,
    steps: [
      "Use your own AT Protocol account; any PDS works. Nothing here chooses one for you.",
      "Sign in with your own client (an app password or OAuth session) and send the request body to your PDS.",
      "Your PDS assigns the record key and returns the at:// URI and CID; keep them.",
      "Records are public and can be copied by others; deleting one later doesn't remove copies.",
    ],
    curl_example: "curl -X POST \"$PDS/xrpc/com.atproto.repo.createRecord\" -H \"Authorization: Bearer $ACCESS_JWT\" -H \"Content-Type: application/json\" --data @record-request.json",
    lexicon_status: "Proposed. The org.jollyrogercharter Lexicons are not yet published under jollyrogercharter.org's _lexicon DNS record, so other apps can't resolve the schema yet.",
    note: "Prepared only. Nothing was published, no credentials were requested, and no PDS was contacted.",
  };
}
