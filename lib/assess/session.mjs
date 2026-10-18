// One assessment pipeline for the page, the WebMCP tools and the CLI: resolve a snapshot, evaluate it, derive artifacts.
import { assessmentMarkdown, candidateManifest, challengeLog, checklistMarkdown, githubLinks, prDescription, suggestedFiles, suggestedPatch } from "./artifacts.mjs";
import { evaluateSnapshot } from "./evaluate.mjs";
import { collectGithubSnapshot, parseRepository, validRef } from "./github.mjs";
import { canonicalJson, LIMITS, validateSnapshot } from "./snapshot.mjs";

export class AssessError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}

const RETRYABLE = new Set(["rate-limited", "network", "timeout", "http-403", "http-429", "http-500", "http-502", "http-503", "http-504"]);

export function snapshotProblem(snap) {
  const u = snap.unavailable.find((x) => ["repo-meta", "repository", "commit", "tree"].includes(x.what));
  if (!u) return null;
  if (u.reason === "rate-limited") return new AssessError("RATE_LIMITED", "GitHub's anonymous rate limit (60 requests an hour per IP address) is used up. Try again later, or run jrc assess on a local clone.");
  if (u.what === "tree") return null;
  if (u.reason === "moved") return new AssessError("NOT_FOUND", "GitHub redirected this address, so the repository was probably renamed or moved. Use its current URL.");
  if (["not-found", "not-public", "http-422", "http-409", "no-default-branch"].includes(u.reason)) return new AssessError("NOT_FOUND", "No public GitHub repository at that address, or the branch, tag or commit doesn't exist (or the repository is empty).");
  return null;
}

export function createSession({ fetch, sha256, now }) {
  const cache = new Map();
  const hashText = (t) => sha256(new TextEncoder().encode(t));

  async function resolve({ repository, ref, snapshot }, signal, onProgress) {
    if ((repository === undefined) === (snapshot === undefined)) throw new AssessError("INVALID_INPUT", "Give either repository or snapshot, not both.");
    if (snapshot !== undefined) {
      if (new TextEncoder().encode(JSON.stringify(snapshot)).length > LIMITS.max_snapshot_bytes) throw new AssessError("INPUT_TOO_LARGE", `Snapshots over ${LIMITS.max_snapshot_bytes / 1048576} MiB aren't accepted.`);
      const problems = validateSnapshot(snapshot);
      if (problems.length) throw new AssessError("INVALID_SNAPSHOT", "The snapshot doesn't match the snapshot format.", problems.slice(0, 8));
      return snapshot;
    }
    const r = parseRepository(repository);
    if (!r) throw new AssessError("INVALID_INPUT", "repository must be a public GitHub URL such as https://github.com/OWNER/REPO.");
    if (ref !== undefined && !validRef(ref)) throw new AssessError("INVALID_INPUT", "ref must be a branch, tag or commit name.");
    const key = `${r.url.toLowerCase()}@${ref ?? ""}`;
    if (!cache.has(key)) {
      const p = collectGithubSnapshot(r.url, { ref, fetch, sha256, signal, now, onProgress }).then((s) => {
        if (s.unavailable.some((u) => RETRYABLE.has(u.reason))) cache.delete(key);
        return s;
      }, (e) => { cache.delete(key); throw e; });
      cache.set(key, p);
    }
    const snap = await cache.get(key);
    const problem = snapshotProblem(snap);
    if (problem) throw problem;
    return snap;
  }

  async function assess(input, signal, onProgress = () => {}) {
    const snapshot = await resolve(input, signal, onProgress);
    onProgress({ stage: "evaluate" });
    const snapshotSha256 = await hashText(canonicalJson(snapshot));
    return { snapshot, report: evaluateSnapshot(snapshot, { snapshotSha256 }) };
  }

  return { assess, resolve, clear: () => cache.clear() };
}

// Every downloadable file, keyed by its file name. The CLI writes these; the page offers them; tests compare both.
export function allArtifacts({ snapshot, report }) {
  const files = {
    "jrc-assessment.json": JSON.stringify(report, null, 2) + "\n",
    "JRC-ASSESSMENT.md": assessmentMarkdown(report),
    "jrc.candidate.json": JSON.stringify(candidateManifest(report, snapshot), null, 2) + "\n",
    "ADOPTION-CHECKLIST.md": checklistMarkdown(report),
    "PR-DESCRIPTION.md": prDescription(report, snapshot),
    "CHALLENGE-LOG.md": challengeLog(report),
    "jrc-snapshot.json": JSON.stringify(snapshot, null, 2) + "\n",
  };
  const patch = suggestedPatch(report, snapshot);
  if (patch) files["jrc-suggested-files.patch"] = patch;
  return { files, suggested: suggestedFiles(report, snapshot).map((f) => f.path), links: githubLinks(report, snapshot) };
}
