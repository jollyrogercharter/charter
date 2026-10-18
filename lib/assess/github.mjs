// Reads public GitHub evidence with fixed, credential-free GET requests pinned to one commit. `fetch` and `sha256` are injected.
import { emptySnapshot, fileRecord, filesToRead, LIMITS, sortEntries, unsafePath } from "./snapshot.mjs";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const HOSTS = new Set(["api.github.com", "raw.githubusercontent.com"]);
const TIMEOUT_MS = 15000;

export function parseRepository(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/);
  if (!m || m[2] === "." || m[2] === "..") return null;
  return { owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` };
}

export const validRef = (ref) => typeof ref === "string" && /^[A-Za-z0-9._/-]{1,100}$/.test(ref) && !ref.split("/").some((s) => s === "" || s === "." || s === "..") && !ref.endsWith(".lock");

class FetchProblem extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

async function readCapped(res, cap) {
  if (!res.body?.getReader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > cap) throw new FetchProblem("too-large");
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > cap) { await reader.cancel().catch(() => {}); throw new FetchProblem("too-large"); }
    chunks.push(value);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

function makeGet(fetchImpl, signal, budget) {
  return async (url, cap, accept = "application/vnd.github+json") => {
    if (budget.left-- <= 0) throw new FetchProblem("request-limit");
    if (!HOSTS.has(new URL(url).host)) throw new FetchProblem("host-not-allowed");
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const sig = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let res;
    try {
      res = await fetchImpl(url, { method: "GET", credentials: "omit", redirect: "follow", referrerPolicy: "no-referrer", headers: url.startsWith(API) ? { Accept: accept } : {}, signal: sig });
    } catch (e) {
      if (signal?.aborted) throw signal.reason ?? e;
      throw new FetchProblem(timeout.aborted ? "timeout" : "network");
    }
    if (res.url && !HOSTS.has(new URL(res.url).host)) throw new FetchProblem("redirected-off-github");
    if (res.status === 404) throw new FetchProblem("not-found");
    if ((res.status === 403 || res.status === 429) && res.headers?.get?.("x-ratelimit-remaining") === "0") throw new FetchProblem("rate-limited");
    if (!res.ok) throw new FetchProblem(`http-${res.status}`);
    return readCapped(res, cap);
  };
}

const asJson = (bytes) => { try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new FetchProblem("bad-json"); } };
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

// Never throws for GitHub-side problems: they're recorded in `unavailable`, which the evaluator reports as unknown, not absent.
export async function collectGithubSnapshot(repository, { ref, fetch: fetchImpl, sha256, signal, now = () => new Date(), onProgress = () => {} } = {}) {
  const r = parseRepository(repository);
  if (!r) throw new TypeError("not a GitHub repository URL (expected https://github.com/OWNER/REPO)");
  if (ref !== undefined && ref !== null && !validRef(ref)) throw new TypeError("invalid ref");
  const get = makeGet(fetchImpl, signal, { left: 4 + LIMITS.max_files });
  const snap = emptySnapshot({ kind: "github", repository: r.url, name: r.repo, ref: ref ?? null, commit: null, retrieved_at: now().toISOString().replace(/\.\d{3}Z$/, "Z") });
  const miss = (what, e) => {
    if (!(e instanceof FetchProblem)) throw e;
    snap.unavailable.push({ what, reason: e.reason });
  };

  onProgress({ stage: "metadata" });
  try {
    const m = asJson(await get(`${API}/repos/${r.owner}/${r.repo}`, 256 * 1024));
    const spdx = m.license?.spdx_id;
    snap.repo_meta = {
      default_branch: typeof m.default_branch === "string" && validRef(m.default_branch) ? m.default_branch : null,
      license_spdx: typeof spdx === "string" && /^[A-Za-z0-9.+-]{1,40}$/.test(spdx) ? spdx : null,
      archived: typeof m.archived === "boolean" ? m.archived : null,
      fork: typeof m.fork === "boolean" ? m.fork : null,
      has_issues: typeof m.has_issues === "boolean" ? m.has_issues : null,
      has_discussions: typeof m.has_discussions === "boolean" ? m.has_discussions : null,
    };
    if (m.private === true) { snap.unavailable.push({ what: "repository", reason: "not-public" }); return snap; }
    if (!snap.repo_meta.default_branch && !ref) { snap.unavailable.push({ what: "commit", reason: "no-default-branch" }); return snap; }
  } catch (e) {
    miss("repo-meta", e);
    if (!ref || ["not-found", "rate-limited"].includes(snap.unavailable.at(-1).reason)) return snap;
  }

  const branch = ref ?? snap.repo_meta.default_branch;
  snap.source.ref = branch;
  onProgress({ stage: "commit", ref: branch });
  try {
    const sha = new TextDecoder().decode(await get(`${API}/repos/${r.owner}/${r.repo}/commits/${enc(branch)}`, 1024, "application/vnd.github.sha")).trim();
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new FetchProblem("bad-commit");
    snap.source.commit = sha;
  } catch (e) {
    miss("commit", e);
    return snap;
  }

  let entries;
  onProgress({ stage: "tree", commit: snap.source.commit });
  try {
    const t = asJson(await get(`${API}/repos/${r.owner}/${r.repo}/git/trees/${snap.source.commit}?recursive=1`, LIMITS.max_tree_bytes));
    if (!Array.isArray(t.tree)) throw new FetchProblem("bad-tree");
    entries = [];
    for (const x of t.tree) {
      if (unsafePath(x?.path)) { snap.skipped_paths++; continue; }
      const type = x.type === "tree" ? "tree" : x.type === "commit" ? "submodule" : x.mode === "120000" ? "symlink" : x.type === "blob" ? "blob" : null;
      if (!type) { snap.skipped_paths++; continue; }
      if (entries.length >= LIMITS.max_entries) { t.truncated = true; break; }
      entries.push([x.path, type, type === "blob" && Number.isInteger(x.size) && x.size >= 0 ? x.size : null]);
    }
    snap.tree = { complete: t.truncated !== true, entries: sortEntries(entries) };
  } catch (e) {
    miss("tree", e);
    return snap;
  }

  let manifest = null;
  const wanted = filesToRead(entries, null);
  const readOne = async ({ path, text }) => {
    const size = entries.find((e) => e[0] === path)?.[2] ?? 0;
    if (size > LIMITS.max_file_bytes) { snap.unavailable.push({ what: "file", reason: "too-large" }); return; }
    try {
      const bytes = await get(`${RAW}/${r.owner}/${r.repo}/${snap.source.commit}/${enc(path)}`, LIMITS.max_file_bytes);
      snap.files[path] = await fileRecord(bytes, { text, sha256 });
    } catch (e) { miss("file", e); }
  };
  onProgress({ stage: "files", entries: entries.length, files: wanted.length });
  for (const w of wanted) await readOne(w);
  try { manifest = snap.files["jrc.json"]?.text ? JSON.parse(snap.files["jrc.json"].text) : null; } catch { manifest = null; }
  if (manifest) for (const w of filesToRead(entries, manifest)) if (!snap.files[w.path] && w.role === "pinned") await readOne(w);
  return snap;
}
