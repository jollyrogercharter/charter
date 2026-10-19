// Offline proof that a transaction is in a block, and what that does and doesn't establish.
import { fromHex, hex, sha256d, concat } from "../sha256.mjs";
import { addressToScript } from "./address.mjs";
import { checkWork, NETWORKS, parseHeader, parseTx } from "./tx.mjs";

export const PROOF_LIMITS = [
  "Inclusion and proof of work show the transaction is in a block with valid work. They don't show the block is in the best chain unless its hash was confirmed from a source you trust (your own node, or several independent explorers).",
  "A proof covers one transaction. It says nothing about other wallets, other accounts, off-chain money, liabilities or who controls the keys.",
  "An Electrum-style branch doesn't commit to the block's transaction count, so a crafted 64-byte transaction could pose as an inner node (CVE-2012-2459 family); such transactions are rejected here.",
];

// proof: { network, tx_hex, header_hex, merkle: [display-order hex], pos, block_height }. anchors: { [height]: block hash } the verifier confirmed independently.
export function verifyTxProof(proof, { anchors = {}, treasuryAddresses = [], expectTxid } = {}) {
  const checks = [];
  const add = (id, ok, detail) => { checks.push({ id, ok, detail }); return ok; };
  const network = proof?.network;
  if (!NETWORKS[network]) return { ok: false, status: "invalid", checks: [{ id: "network", ok: false, detail: "network must be mainnet, testnet or regtest" }] };
  let tx, header;
  try { tx = parseTx(proof.tx_hex); } catch (e) { return { ok: false, status: "invalid", checks: [{ id: "tx-parse", ok: false, detail: e.message }] }; }
  try { header = parseHeader(proof.header_hex); } catch (e) { return { ok: false, status: "invalid", checks: [{ id: "header-parse", ok: false, detail: e.message }] }; }
  if (expectTxid !== undefined) add("txid", tx.txid === expectTxid, `computed ${tx.txid}`);
  add("not-64-bytes", tx.stripped_size !== 64, "64-byte transactions can masquerade as Merkle nodes");
  const branch = Array.isArray(proof.merkle) ? proof.merkle : [];
  const okBranch = add("branch-shape", Array.isArray(proof.merkle) && branch.length <= 32 && branch.every((h) => /^[0-9a-f]{64}$/.test(h)) && Number.isInteger(proof.pos) && proof.pos >= 0 && proof.pos < 2 ** branch.length, "Merkle branch of at most 32 hashes and a position inside it");
  if (okBranch) {
    let h = fromHex(tx.txid).reverse(), pos = proof.pos;
    for (const sib of branch) {
      const s = fromHex(sib).reverse();
      h = pos & 1 ? sha256d(concat(s, h)) : sha256d(concat(h, s));
      pos >>>= 1;
    }
    add("merkle-inclusion", hex(h.reverse()) === header.merkle_root, `folded root ${hex(h)} vs header ${header.merkle_root}`);
  }
  const work = checkWork(header, network);
  add("proof-of-work", work.meets_target, "header hash is at or below its own target");
  add("network-difficulty", work.within_network_limit, `target no easier than ${network} allows`);
  const anchored = anchors[proof.block_height];
  const anchorOk = anchored !== undefined && anchored === header.hash;
  if (anchored !== undefined) add("anchor", anchorOk, `block ${proof.block_height} hash confirmed by the verifier: ${anchored}`);
  const scripts = new Map();
  for (const a of treasuryAddresses) scripts.set(addressToScript(a, network), a);
  const received = tx.outputs.filter((o) => scripts.has(o.script)).map((o) => ({ n: o.n, address: scripts.get(o.script), value_sats: o.value_sats }));
  const proven = checks.every((c) => c.ok);
  return {
    ok: proven,
    status: !proven ? "invalid" : anchorOk ? "chain-verified" : "proof-valid-unanchored",
    txid: tx.txid, block_hash: header.hash, block_height: proof.block_height ?? null, block_time: header.time, network,
    outputs_to_treasury: received,
    checks,
    limits: PROOF_LIMITS,
  };
}
