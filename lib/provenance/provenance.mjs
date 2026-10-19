// Provenance capabilities over the published manifest. Pure: callers supply the manifest and any locally computed hashes.
const HEX64 = /^[0-9a-f]{64}$/;

export function manifestPart(m, { part = "summary", offset = 0, limit = 12 } = {}) {
  if (part === "files") {
    const files = m.files.slice(offset, offset + limit);
    return { part, preservation_commit: m.preservation_commit, total: m.files.length, offset, files, ...(offset + limit < m.files.length ? { next_offset: offset + limit } : {}), basis: "verified" };
  }
  if (part === "timestamp") return { part, ...timestampStatus(m) };
  if (part === "limitations") return { part, limitations: m.limitations, basis: "self-reported" };
  return {
    part: "summary", schema_version: m.schema_version, preservation_commit: m.preservation_commit, hashed_at_utc: m.hashed_at_utc,
    files: m.files.length, received_package: m.received_package ? { file: m.received_package.file, sha256: m.received_package.sha256, in_repository: m.received_package.in_repository } : null,
    timestamp_state: m.timestamp_state, founding_transcript: m.founding_transcript.state,
    parts: ["summary", "files", "timestamp", "limitations"],
    basis: "verified",
  };
}

// Compares hashes the caller computed locally (or supplied) with the published digests. It can't see the caller's files.
export function verifyHashes(m, items) {
  const byPath = new Map(m.files.map((f) => [f.path, f.sha256]));
  if (m.received_package) byPath.set(m.received_package.file, m.received_package.sha256);
  const bySha = new Map(m.files.map((f) => [f.sha256, f.path]));
  const results = items.map(({ path, sha256 }) => {
    const h = sha256.toLowerCase();
    if (!HEX64.test(h)) return { path: path ?? null, result: "invalid-hash" };
    if (path !== undefined) {
      if (!byPath.has(path)) return { path, result: bySha.has(h) ? "matches-other-file" : "unknown-path", ...(bySha.has(h) ? { matches: bySha.get(h) } : {}) };
      return { path, result: byPath.get(path) === h ? "match" : "mismatch" };
    }
    return { path: null, result: bySha.has(h) ? "match" : "no-match", ...(bySha.has(h) ? { matches: bySha.get(h) } : {}) };
  });
  return {
    results,
    matched: results.filter((r) => r.result === "match").length,
    basis: "verified",
    note: "A match shows your bytes equal the bytes the project hashed at its preservation commit. It doesn't show who wrote them, when, or that they're true. A mismatch means the bytes differ: even one changed character, or different line endings.",
  };
}

// absent / pending / verified, and *who* verified it. Project-run checks are never called independent.
export function timestampStatus(m) {
  const s = m.timestamp_state;
  const state = s === "verified" ? "verified" : s === "pending" ? "pending" : "absent";
  return {
    state,
    artifact: m.timestamped_artifact ? { path: m.timestamped_artifact.path, sha256: m.timestamped_artifact.sha256, proof: m.opentimestamps_proof_path } : null,
    ...(state === "verified"
      ? {
          attested_no_later_than_utc: m.bitcoin_attestation_time_utc,
          block: m.bitcoin_attestation?.earliest_block_height ?? null,
          verified_by: "the project",
          method: m.verification_method,
          independently_reverified: false,
          how_to_reverify: "ots verify with your own Bitcoin node, or python provenance/check-ots.py (public explorers)",
        }
      : { note: state === "pending" ? "Submitted to calendars but not yet in a Bitcoin block. A pending proof is not a timestamp." : "No timestamp proof exists." }),
    basis: state === "verified" ? "verified" : "missing",
  };
}

const LIMITS = {
  digest: ["Shows bytes are unchanged since hashing; nothing about authorship, truth or date.", "Line-ending or encoding changes produce a different digest even if the text looks the same."],
  timestamp: ["Shows the digest list existed no later than the Bitcoin block time, which can differ from real time by about two hours.", "Says nothing about when the ideas originated, who had them, or whether anyone was first.", "The project's own verification used public block explorers, so it trusts them; check with your own node for independence."],
  "git-history": ["Git history can be rewritten; commit dates are set by whoever commits.", "The preservation commit is only as trustworthy as the copies of it that others hold."],
  transcript: ["No transcript of the founding conversation is published. FOUNDING-ARCHIVE.md is an edited summary, not a transcript.", "When one is published, it will be a human-reviewed public edition with documented redactions, not the raw account export."],
  "self-assessment": ["jrc.json is written by the project (largely by an AI agent) about itself.", "jrc checks structure and local files, not whether statements are true. No independent reproduction exists yet."],
  "agent-review": ["Reviews recorded in transparency/ were done by AI agents working for the project, not independent auditors."],
};

export function evidenceLimitations(evidence) {
  const keys = evidence ? [evidence] : Object.keys(LIMITS);
  return { limitations: Object.fromEntries(keys.map((k) => [k, LIMITS[k]])), kinds: Object.keys(LIMITS), basis: "self-reported" };
}
export const EVIDENCE_KINDS = Object.keys(LIMITS);
