// Watch-only monitoring through Esplora-compatible APIs (Blockstream, mempool.space, or your own instance). GET only, no keys.
import { addressToScript } from "../bitcoin/address.mjs";
import { parseHeader, parseTx } from "../bitcoin/tx.mjs";

export const KNOWN_HOSTS = {
  blockstream: "https://blockstream.info/api", mempool: "https://mempool.space/api",
  "blockstream-testnet": "https://blockstream.info/testnet/api", "mempool-testnet": "https://mempool.space/testnet/api",
};
const TIMEOUT_MS = 20000;
const MAX_BODY = 4 * 1024 * 1024;

// baseUrl is the explorer's API root for the network you mean (for testnet, a testnet URL such as blockstream-testnet).
export function esploraClient({ baseUrl, network = "mainnet", fetch: f = globalThis.fetch }) {
  const u = new URL(String(baseUrl));
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !local) throw new RangeError("explorer URL must be https (or a local node)");
  if (network === "regtest" && !local) throw new RangeError("regtest has no public explorer; point at your own node");
  if (network === "testnet" !== /testnet|signet/.test(u.pathname + u.hostname)) throw new RangeError(`that explorer URL doesn't look like a ${network} API`);
  const base = u.href.replace(/\/$/, "");
  const get = async (path, as = "text") => {
    const res = await f(`${base}${path}`, { method: "GET", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`explorer returned HTTP ${res.status}`);
    // Read at most MAX_BODY bytes instead of buffering whatever the server sends.
    let body = "";
    if (res.body?.getReader) {
      const reader = res.body.getReader(), dec = new TextDecoder();
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BODY) { await reader.cancel(); throw new RangeError("explorer response too large"); }
        body += dec.decode(value, { stream: true });
      }
    } else {
      body = await res.text();
      if (body.length > MAX_BODY) throw new RangeError("explorer response too large");
    }
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
  if (!Array.isArray(proof.merkle) || proof.merkle.length > 32 || !proof.merkle.every((h) => /^[0-9a-f]{64}$/.test(h)) || !Number.isSafeInteger(proof.pos) || proof.pos < 0 || !Number.isSafeInteger(proof.block_height) || proof.block_height !== status.block_height) throw new Error("explorer sent a malformed Merkle proof");
  return { type: "chain_proof", id, network, txid, tx_hex: txHex, header_hex: header, merkle: proof.merkle, pos: proof.pos, block_height: proof.block_height, source };
}

// Anchors only when every source agrees; one dissenting or failing source means no anchor for that height.
export async function confirmAnchors(heights, allClients) {
  // The same explorer written two ways is still one source.
  const clients = [...new Map(allClients.map((c) => [new URL(c.base).host, c])).values()];
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
