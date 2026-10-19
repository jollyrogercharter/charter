// Canonical JSON and an RFC 6962-style Merkle tree: leaves hash as 0x00||data and nodes as 0x01||left||right.
import { concat, fromHex, hex, sha256 } from "./sha256.mjs";

// Sorted keys, no whitespace, integers only: money is in minor units and rates are strings, so floats never appear.
export function canonical(v) {
  if (v === null || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v) || Object.is(v, -0)) throw new TypeError(`canonical JSON allows only safe integers, got ${v}`);
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v.normalize("NFC"));
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (typeof v === "object") {
    return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  throw new TypeError(`canonical JSON can't encode ${typeof v}`);
}

const LEAF = new Uint8Array([0]);
const NODE = new Uint8Array([1]);
export const leafHash = (bytes) => sha256(concat(LEAF, bytes));
export const nodeHash = (l, r) => sha256(concat(NODE, l, r));
export const recordLeaf = (record) => hex(leafHash(new TextEncoder().encode(canonical(record))));

const split = (n) => { let k = 1; while (k * 2 < n) k *= 2; return k; };

function root(leaves) {
  if (leaves.length === 1) return leaves[0];
  const k = split(leaves.length);
  return nodeHash(root(leaves.slice(0, k)), root(leaves.slice(k)));
}

export function merkleRoot(leafHexes) {
  if (!leafHexes.length) return hex(sha256(new Uint8Array(0)));
  return hex(root(leafHexes.map(fromHex)));
}

// The audit path for leaf m, bottom-up, as in RFC 6962 section 2.1.1.
function path(m, leaves) {
  if (leaves.length === 1) return [];
  const k = split(leaves.length);
  return m < k ? [...path(m, leaves.slice(0, k)), root(leaves.slice(k))] : [...path(m - k, leaves.slice(k)), root(leaves.slice(0, k))];
}

export function inclusionProof(leafHexes, index) {
  if (!Number.isInteger(index) || index < 0 || index >= leafHexes.length) throw new RangeError("leaf index out of range");
  return { index, tree_size: leafHexes.length, leaf: leafHexes[index], path: path(index, leafHexes.map(fromHex)).map(hex) };
}

// RFC 9162 section 2.1.3.2 verification: recompute the root from the leaf and its path.
export function verifyInclusion({ index, tree_size, leaf, path: p }, expectedRoot) {
  if (!Number.isInteger(index) || !Number.isInteger(tree_size) || index < 0 || index >= tree_size || !Array.isArray(p)) return false;
  let fn = index, sn = tree_size - 1, r = fromHex(leaf);
  for (const h of p) {
    if (sn === 0) return false;
    const node = fromHex(h);
    if (fn % 2 === 1 || fn === sn) {
      r = nodeHash(node, r);
      if (fn % 2 === 0) while (fn % 2 === 0 && fn !== 0) { fn >>= 1; sn >>= 1; }
    } else r = nodeHash(r, node);
    fn >>= 1; sn >>= 1;
  }
  return sn === 0 && hex(r) === expectedRoot;
}
