import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { assessManifest } from "./core.mjs";

export { assessManifest, blocksPublication, privacyScan } from "./core.mjs";

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

// Filesystem probe for the CLI: containment, existence, type, emptiness and optional SHA-256.
export function nodeProbe(root, manifestFile) {
  const manifestReal = manifestFile && existsSync(manifestFile) ? realpathSync(manifestFile) : null;
  const rootReal = realpathSync(root);
  return {
    file(rel, sha256) {
      const r = resolveInside(root, rel);
      if (r.error) return { result: "invalid", findings: [{ code: "E-PATH", message: r.error }] };
      if (r.missing) return { result: "missing", findings: [{ code: "E-MISSING", message: r.dangling ? "evidence is a broken symlink" : "evidence file not found" }] };
      const weak = (message) => ({ result: "invalid", findings: [{ code: "E-WEAK-EVIDENCE", message }] });
      if (manifestReal && r.abs === manifestReal) return weak("the manifest can't be evidence for itself");
      if (r.abs === rootReal) return weak("the whole project directory isn't evidence for a specific claim");
      const st = statSync(r.abs);
      if (st.isDirectory()) return sha256 ? { result: "invalid", findings: [{ code: "E-HASH", message: "sha256 given for a directory" }] } : { result: "present-directory" };
      if (!st.isFile()) return { result: "invalid", findings: [{ code: "E-PATH", message: "evidence must be a regular file or directory" }] };
      if (st.size === 0) return weak("evidence file is empty");
      if (!sha256) return { result: "present" };
      let got;
      try { got = createHash("sha256").update(readFileSync(r.abs)).digest("hex"); }
      catch (err) { return { result: "invalid", findings: [{ code: "E-UNREADABLE", message: `cannot read evidence (${err.code ?? "error"})` }] }; }
      return got === sha256 ? { result: "verified" } : { result: "hash-mismatch", findings: [{ code: "E-HASH", message: `sha256 mismatch: file is ${got}` }] };
    },
  };
}

export function checkManifest(manifest, { root, manifestFile }) {
  return assessManifest(manifest, { probe: nodeProbe(root, manifestFile) });
}

export const sha256Hex = (data) => createHash("sha256").update(data).digest("hex");

export function loadManifest(file) {
  let raw;
  try { raw = readFileSync(file, "utf8"); }
  catch (e) { return { error: `cannot read ${path.basename(file)}: ${e.code ?? e.message}` }; }
  try { return { manifest: JSON.parse(raw.replace(/^\ufeff/, "")), raw }; }
  catch (e) { return { error: `${path.basename(file)} is not valid JSON: ${e.message}`, raw }; }
}

