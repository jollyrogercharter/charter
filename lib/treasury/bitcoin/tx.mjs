// Parses Bitcoin transactions and block headers from raw bytes. Read-only: nothing here builds, signs or broadcasts.
import { concat, fromHex, hex, sha256d } from "../sha256.mjs";

const MAX_TX_BYTES = 400000;

class Reader {
  constructor(bytes) { this.b = bytes; this.o = 0; }
  take(n) {
    if (n < 0 || this.o + n > this.b.length) throw new RangeError("truncated transaction");
    const out = this.b.subarray(this.o, this.o + n);
    this.o += n;
    return out;
  }
  u8() { return this.take(1)[0]; }
  u32() { const t = this.take(4); return (t[0] | (t[1] << 8) | (t[2] << 16) | (t[3] << 24)) >>> 0; }
  u64() { const t = this.take(8); let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(t[i]); return v; }
  varint() {
    const f = this.u8();
    if (f < 0xfd) return f;
    if (f === 0xfd) { const t = this.take(2); const v = t[0] | (t[1] << 8); if (v < 0xfd) throw new RangeError("non-canonical varint"); return v; }
    if (f === 0xfe) { const v = this.u32(); if (v < 0x10000) throw new RangeError("non-canonical varint"); return v; }
    throw new RangeError("varint too large for a transaction");
  }
  bytes() { return this.take(this.varint()); }
}

// Display order for txids and block hashes is the reverse of the internal byte order.
export const reverseHex = (h) => hex(fromHex(h).reverse());

export function parseTx(input) {
  const bytes = typeof input === "string" ? fromHex(input) : input;
  if (bytes.length > MAX_TX_BYTES) throw new RangeError("transaction too large");
  const r = new Reader(bytes);
  const version = r.u32();
  let segwit = false;
  let nIn = r.varint();
  if (nIn === 0) {
    if (r.u8() !== 1) throw new RangeError("bad segwit flag");
    segwit = true;
    nIn = r.varint();
  }
  if (nIn === 0 || nIn > 10000) throw new RangeError("bad input count");
  const inputs = [];
  for (let i = 0; i < nIn; i++) inputs.push({ prev_txid: hex(r.take(32).slice().reverse()), vout: r.u32(), script_sig: hex(r.bytes()), sequence: r.u32() });
  const nOut = r.varint();
  if (nOut === 0 || nOut > 10000) throw new RangeError("bad output count");
  const outputs = [];
  for (let i = 0; i < nOut; i++) {
    const value = r.u64();
    if (value > 2100000000000000n) throw new RangeError("output value exceeds the 21 million BTC supply");
    outputs.push({ n: i, value_sats: Number(value), script: hex(r.bytes()) });
  }
  const afterOutputs = r.o;
  if (segwit) for (const inp of inputs) { const n = r.varint(); inp.witness = Array.from({ length: n }, () => hex(r.bytes())); }
  // Bitcoin Core rejects the segwit encoding when every witness is empty ("superfluous witness record").
  if (segwit && inputs.every((i) => !i.witness.length)) throw new RangeError("segwit marker with no witness data");
  const locktimeAt = r.o;
  const locktime = r.u32();
  if (r.o !== bytes.length) throw new RangeError("trailing bytes after transaction");
  // txid hashes the serialization without the segwit marker, flag and witnesses.
  const stripped = segwit ? concat(bytes.subarray(0, 4), bytes.subarray(6, afterOutputs), bytes.subarray(locktimeAt)) : bytes;
  return { version, segwit, inputs, outputs, locktime, size: bytes.length, stripped_size: stripped.length, txid: hex(sha256d(stripped).reverse()), wtxid: hex(sha256d(bytes).reverse()) };
}

export function parseHeader(input) {
  const bytes = typeof input === "string" ? fromHex(input) : input;
  if (bytes.length !== 80) throw new RangeError("a block header is exactly 80 bytes");
  const r = new Reader(bytes);
  return {
    version: r.u32(),
    prev_block: hex(r.take(32).slice().reverse()),
    merkle_root: hex(r.take(32).slice().reverse()),
    time: r.u32(),
    bits: r.u32(),
    nonce: r.u32(),
    hash: hex(sha256d(bytes).reverse()),
  };
}

export function targetFromBits(bits) {
  const exp = bits >>> 24, mant = BigInt(bits & 0x007fffff);
  if (bits & 0x00800000) throw new RangeError("negative compact target");
  return exp <= 3 ? mant >> (8n * BigInt(3 - exp)) : mant << (8n * BigInt(exp - 3));
}

export const NETWORKS = {
  mainnet: { pow_limit_bits: 0x1d00ffff, hrp: "bc", p2pkh: 0x00, p2sh: 0x05 },
  testnet: { pow_limit_bits: 0x1d00ffff, hrp: "tb", p2pkh: 0x6f, p2sh: 0xc4 },
  regtest: { pow_limit_bits: 0x207fffff, hrp: "bcrt", p2pkh: 0x6f, p2sh: 0xc4 },
};

// Proof of work: the header hash meets its own target, and that target is no easier than the network allows.
export function checkWork(header, network) {
  const target = targetFromBits(header.bits);
  const limit = targetFromBits(NETWORKS[network].pow_limit_bits);
  return { meets_target: target > 0n && BigInt(`0x${header.hash}`) <= target, within_network_limit: target <= limit };
}
