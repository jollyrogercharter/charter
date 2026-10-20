// Node-only: builds the same snapshot from a working tree. Never follows symlinks and never runs anything in the tree.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { emptySnapshot, fileRecord, filesToRead, LIMITS, sortEntries, unsafePath } from "./snapshot.mjs";

const SKIP = new Set([".git", "node_modules"]);
const sha256 = async (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function collectLocalSnapshot(dir, { now = () => new Date(), commit = null } = {}) {
  const root = path.resolve(dir);
  const snap = emptySnapshot({ kind: "local", name: path.basename(root), ref: null, commit, retrieved_at: now().toISOString().replace(/\.\d{3}Z$/, "Z") });
  const entries = [];
  let complete = true;
  const walk = (rel) => {
    let list;
    try { list = readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { complete = false; return; }
    list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const d of list) {
      if (SKIP.has(d.name)) continue;
      const p = rel ? `${rel}/${d.name}` : d.name;
      if (unsafePath(p)) { snap.skipped_paths++; continue; }
      if (entries.length >= LIMITS.max_entries) { complete = false; return; }
      let st;
      try { st = lstatSync(path.join(root, p)); } catch { complete = false; continue; }
      if (st.isSymbolicLink()) entries.push([p, "symlink", null]);
      else if (st.isDirectory()) { entries.push([p, "tree", null]); walk(p); }
      else if (st.isFile()) entries.push([p, "blob", st.size]);
      else snap.skipped_paths++;
    }
  };
  walk("");
  snap.tree = { complete, entries: sortEntries(entries) };

  const readOne = async ({ path: p, text }) => {
    const size = entries.find((e) => e[0] === p)?.[2] ?? 0;
    if (size > LIMITS.max_file_bytes) { snap.unavailable.push({ what: "file", reason: "too-large" }); return; }
    try { snap.files[p] = await fileRecord(new Uint8Array(readFileSync(path.join(root, p))), { text, sha256 }); }
    catch { snap.unavailable.push({ what: "file", reason: "unreadable" }); }
  };
  for (const w of filesToRead(entries, null)) await readOne(w);
  let manifest = null;
  try { manifest = snap.files["jrc.json"]?.text ? JSON.parse(snap.files["jrc.json"].text) : null; } catch { manifest = null; }
  if (manifest) for (const w of filesToRead(entries, manifest)) if (!snap.files[w.path] && w.role === "pinned") await readOne(w);
  return snap;
}
