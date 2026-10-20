// Evidence snapshot: everything an assessment may look at, pinned to one commit. Pure, so collectors and evaluators can share it.
import { CONTROL } from "../jrc/core.mjs";

export const SNAPSHOT_VERSION = "0.1";
export const LIMITS = {
  max_entries: 50000,
  max_files: 24,
  max_file_bytes: 256 * 1024,
  max_text_bytes: 64 * 1024,
  max_path_chars: 300,
  max_tree_bytes: 8 * 1024 * 1024,
  max_snapshot_bytes: 4 * 1024 * 1024,
};
const ENTRY_TYPES = ["blob", "tree", "symlink", "submodule"];

export const LICENCE_FILE = /^(?:(?:licen[cs]e|copying|unlicense)(?:\.(?:md|markdown|txt|rst))?|(?:LICEN[CS]E|COPYING)[-_][A-Za-z0-9.-]+?(?<!\.(?:js|mjs|cjs|ts|py|rb|go|rs|java|sh|json|ya?ml|toml)))$/i;
export const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Format, private-use, unassigned, tag, variation-selector and filler characters can hide text in a name.
const HIDDEN = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}ᅟᅠㅤﾠ]/u;

export const validRef = (ref) => typeof ref === "string" && /^[A-Za-z0-9._/-]{1,100}$/.test(ref) && !ref.split("/").some((s) => s === "" || s === "." || s === "..") && !ref.endsWith(".lock");

// Repository text is untrusted: paths that could hide or forge text are dropped, never shown.
export function unsafePath(p) {
  if (typeof p !== "string" || !p || [...p].length > LIMITS.max_path_chars) return "too long or empty";
  if (CONTROL.test(p) || HIDDEN.test(p)) return "control, zero-width, bidirectional or other hidden characters";
  if (p.startsWith("/") || p.split("/").some((s) => s === "" || s === "." || s === "..")) return "not a clean relative path";
  return null;
}

export function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

const ROOT_TEXT = [
  [/^readme\.(md|markdown)$/i, "readme"],
  [/^readme(\.(rst|txt|adoc))?$/i, "readme"],
  [LICENCE_FILE, "licence"],
  [/^(package\.json|cargo\.toml|pyproject\.toml|composer\.json)$/i, "package"],
  [/^jrc\.json$/, "manifest"],
];
const ANY_TEXT = [
  [/^(\.github\/|docs\/)?contributing(\.(md|rst|txt))?$/i, "contributing"],
  [/^(\.github\/|docs\/)?governance(\.(md|rst|txt))?$/i, "governance"],
  [/^(\.github\/|docs\/)?codeowners$/i, "codeowners"],
  [/^(\.github\/|docs?\/)?(deploy(ment|ing)?|operations|runbook|self[-_]?host(ing)?)(\.(md|rst|txt))?$/i, "deploy"],
  [/^([\w-]+\/)?(costs?|budget|ledger|expenses)(\.(json|md|csv))$/i, "costs"],
];

// Which files' contents to read. Same choice for every collector, so GitHub and local snapshots of one tree agree.
export function filesToRead(entries, manifest) {
  const blobs = entries.filter((e) => e[1] === "blob" && (e[2] ?? 0) > 0);
  const picked = new Map();
  const roleCount = {};
  const take = (p, role) => {
    if (picked.has(p) || picked.size >= LIMITS.max_files) return;
    if ((roleCount[role] = (roleCount[role] ?? 0) + 1) > (role === "licence" || role === "package" || role === "costs" ? 3 : 1)) return;
    picked.set(p, role);
  };
  for (const [re, role] of ROOT_TEXT) for (const [p] of blobs) if (!p.includes("/") && re.test(p)) take(p, role);
  for (const [re, role] of ANY_TEXT) for (const [p] of blobs) if (re.test(p)) take(p, role);
  if (isObj(manifest?.pillars)) {
    const byPath = new Map(blobs.map((e) => [e[0], e]));
    for (const p of Object.values(manifest.pillars)) for (const c of Array.isArray(p?.claims) ? p.claims : []) for (const ev of Array.isArray(c?.evidence) ? c.evidence : []) {
      const rel = typeof ev?.path === "string" ? ev.path.replace(/^\.\//, "") : null;
      if (ev?.kind === "file" && typeof ev.sha256 === "string" && rel && byPath.has(rel)) take(rel, "pinned");
    }
  }
  return [...picked].map(([path, role]) => ({ path, role, text: role !== "pinned" }));
}

// Shared by collectors: hash full bytes, keep a bounded UTF-8 prefix for the evaluator.
export async function fileRecord(bytes, { text, sha256 }) {
  const rec = { bytes: bytes.length, sha256: await sha256(bytes) };
  if (text) {
    rec.text = new TextDecoder("utf-8").decode(bytes.subarray(0, LIMITS.max_text_bytes));
    rec.truncated = bytes.length > LIMITS.max_text_bytes;
  }
  return rec;
}

export function emptySnapshot(source) {
  return { jrc_snapshot: SNAPSHOT_VERSION, source, repo_meta: null, tree: null, files: {}, skipped_paths: 0, unavailable: [] };
}

export function sortEntries(entries) {
  return entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

const isHex = (v, n) => typeof v === "string" && new RegExp(`^[0-9a-f]{${n}}$`).test(v);

// Snapshots can arrive from users or agents, so every field is checked before evaluation.
export function validateSnapshot(s) {
  const errors = [];
  const err = (at, message) => { if (errors.length < 20) errors.push({ at, message }); };
  if (!isObj(s)) return [{ at: "$", message: "snapshot must be an object" }];
  if (s.jrc_snapshot !== SNAPSHOT_VERSION) err("$.jrc_snapshot", `must be "${SNAPSHOT_VERSION}"`);
  const src = s.source;
  if (!isObj(src) || !["github", "local"].includes(src.kind)) err("$.source.kind", "must be github or local");
  else {
    if (src.kind === "github" && !(typeof src.repository === "string" && /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(src.repository) && !/\/\.{1,2}$/.test(src.repository))) err("$.source.repository", "must be https://github.com/OWNER/REPO");
    if (src.kind === "local" && src.repository !== undefined) err("$.source.repository", "a local snapshot has no repository URL");
    for (const k of Object.keys(src)) if (!["kind", "repository", "name", "ref", "commit", "retrieved_at"].includes(k)) err(`$.source.${k}`, "unknown property");
    if (src.commit !== null && !isHex(src.commit, 40)) err("$.source.commit", "must be a 40-character commit id or null");
    if (src.ref !== null && !validRef(src.ref)) err("$.source.ref", "invalid ref");
    if (src.retrieved_at !== null && !(typeof src.retrieved_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(src.retrieved_at))) err("$.source.retrieved_at", "must be a UTC timestamp or null");
    if (src.name !== undefined && !(typeof src.name === "string" && !unsafePath(src.name) && !src.name.includes("/"))) err("$.source.name", "invalid name");
  }
  if (s.repo_meta !== null) {
    const m = s.repo_meta;
    if (!isObj(m)) err("$.repo_meta", "must be an object or null");
    else for (const [k, v] of Object.entries(m)) {
      if (["archived", "fork", "has_issues", "has_discussions"].includes(k)) { if (typeof v !== "boolean" && v !== null) err(`$.repo_meta.${k}`, "must be boolean or null"); }
      else if (k === "license_spdx") { if (v !== null && !(typeof v === "string" && /^[A-Za-z0-9.+-]{1,40}$/.test(v))) err(`$.repo_meta.${k}`, "invalid SPDX id"); }
      else if (k === "default_branch") { if (v !== null && !validRef(v)) err(`$.repo_meta.${k}`, "invalid branch"); }
      else err(`$.repo_meta.${k}`, "unknown property");
    }
  }
  const paths = new Set();
  if (s.tree !== null) {
    const t = s.tree;
    if (!isObj(t) || typeof t.complete !== "boolean" || !Array.isArray(t.entries)) err("$.tree", "must be { complete, entries } or null");
    else if (t.entries.length > LIMITS.max_entries) err("$.tree.entries", `more than ${LIMITS.max_entries} entries`);
    else t.entries.forEach((e, i) => {
      if (!Array.isArray(e) || e.length !== 3 || unsafePath(e[0]) || !ENTRY_TYPES.includes(e[1]) || !(e[2] === null || (Number.isInteger(e[2]) && e[2] >= 0))) err(`$.tree.entries[${i}]`, "must be [safe path, type, size|null]");
      else if (paths.has(e[0])) err(`$.tree.entries[${i}]`, "duplicate path");
      else paths.add(e[0]);
    });
  }
  if (!isObj(s.files)) err("$.files", "must be an object");
  else {
    if (Object.keys(s.files).length > LIMITS.max_files) err("$.files", `more than ${LIMITS.max_files} files`);
    for (const [p, f] of Object.entries(s.files)) {
      if (!paths.has(p)) err(`$.files`, "a file isn't in the tree");
      else if (!isObj(f) || !Number.isInteger(f.bytes) || !isHex(f.sha256, 64)) err(`$.files`, "file records need bytes and sha256");
      else if (f.text !== undefined && (typeof f.text !== "string" || f.text.length > LIMITS.max_text_bytes || typeof f.truncated !== "boolean")) err(`$.files`, "file text too long or malformed");
      else if (Object.keys(f).some((k) => !["bytes", "sha256", "text", "truncated"].includes(k))) err(`$.files`, "unknown file property");
    }
  }
  if (!Number.isInteger(s.skipped_paths) || s.skipped_paths < 0) err("$.skipped_paths", "must be a non-negative integer");
  if (!Array.isArray(s.unavailable) || s.unavailable.length > 40 || !s.unavailable.every((u) => isObj(u) && /^[a-z-]{1,40}$/.test(u.what ?? "") && /^[a-z0-9-]{1,40}$/.test(u.reason ?? "") && Object.keys(u).length === 2)) err("$.unavailable", "must be a short list of { what, reason } codes");
  for (const k of Object.keys(s)) if (!["jrc_snapshot", "source", "repo_meta", "tree", "files", "skipped_paths", "unavailable"].includes(k)) err(`$.${k}`, "unknown property");
  return errors;
}
