// Watch-only monitoring through Esplora-compatible APIs (Blockstream, mempool.space, or your own instance). GET only, no keys.
import { addressToScript } from "../bitcoin/address.mjs";
import { parseHeader, parseTx } from "../bitcoin/tx.mjs";

export const KNOWN_HOSTS = { blockstream: "https://blockstream.info/api", mempool: "https://mempool.space/api" };
const MAX_BODY = 4 * 1024 * 1024;

export function esploraClient({ baseUrl, network = "mainnet", fetch: f = globalThis.fetch }) {
  const base = String(baseUrl).replace(/\/$/, "");
  const u = new URL(base);
  if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") throw new RangeError("explorer URL must be https (or a local node)");
  const prefix = network === "mainnet" ? "" : network === "testnet" ? "/testnet" : "";
  const get = async (path, as = "text") => {
    const res = await f(`${base}${prefix}${path}`, { method: "GET", redirect: "error", credentials: "omit" });
    if (!res.ok) throw new Error(`explorer returned HTTP ${res.status}`);
    const body = await res.text();
    if (body.length > MAX_BODY) throw new RangeError("explorer response too large");
    return as === "json" ? JSON.parse(body) : body.trim();
  };
  const hex = (s, what) => { if (!/^[0-9a-f]+$/.test(s)) throw new RangeError(`explorer sent a malformed ${what}`); return s; };
  return {
    base,
    txHex: async (txid) => hex(await get(`/tx/${hex(txid, "txid")}/hex`), "transaction"),
    merkleProof: (txid) => get(`/tx/${hex(txid, "txid")}/merkle-proof`, "json"),
    status: (txid) => get(`/tx/${hex(txid, "txid")}/status`, "json"),
    header: async (hash) => hex(await get(`/block/${hex(hash, "block hash")}/header`), "header"),
    blockHashAt: async (height) => hex(await get(`/block-height/${Number(height)}`), "block hash"),
    addressTxs: (address) => get(`/address/${encodeURIComponent(address)}/txs`, "json"),
  };
}

// Builds a chain_proof record from one explorer, re-checking everything it sent; the result still needs an independent anchor.
export async function fetchProof(client, txid, { id, source, network = "mainnet" }) {
  const [txHex, proof, status] = await Promise.all([client.txHex(txid), client.merkleProof(txid), client.status(txid)]);
  if (!status.confirmed) throw new Error("transaction isn't confirmed yet");
  const header = await client.header(status.block_hash);
  if (parseTx(txHex).txid !== txid) throw new Error("explorer returned a different transaction");
  if (parseHeader(header).hash !== status.block_hash) throw new Error("explorer returned a header for a different block");
  return { type: "chain_proof", id, network, txid, tx_hex: txHex, header_hex: header, merkle: proof.merkle, pos: proof.pos, block_height: proof.block_height, source };
}

// Anchors only when every source agrees; one dissenting or failing source means no anchor for that height.
export async function confirmAnchors(heights, clients) {
  const anchors = {}, disagreements = [];
  for (const h of heights) {
    const answers = await Promise.allSettled(clients.map((c) => c.blockHashAt(h)));
    const vals = answers.map((a) => (a.status === "fulfilled" ? a.value : null));
    if (vals.every((v) => v && v === vals[0]) && clients.length >= 2) anchors[h] = vals[0];
    else disagreements.push({ height: h, answers: vals });
  }
  return { anchors, disagreements, sources: clients.map((c) => c.base) };
}

// What an explorer reports about treasury addresses. Observations, not proofs: each becomes evidence only after fetchProof and an anchor.
export function observations(txs, addresses, network = "mainnet") {
  const scripts = new Set(addresses.map((a) => addressToScript(a, network)));
  return txs.map((t) => {
    const received = (t.vout ?? []).filter((o) => scripts.has(o.scriptpubkey)).reduce((n, o) => n + o.value, 0);
    const spent = (t.vin ?? []).filter((i) => scripts.has(i.prevout?.scriptpubkey)).reduce((n, i) => n + i.prevout.value, 0);
    return { txid: t.txid, confirmed: Boolean(t.status?.confirmed), block_height: t.status?.block_height ?? null, net_sats: received - spent, fee_sats: t.fee ?? null, basis: "explorer-reported" };
  });
}
