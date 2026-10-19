// Converts between output scripts and addresses (Base58Check, BIP 173 bech32, BIP 350 bech32m). No key handling.
import { concat, fromHex, hex, sha256d } from "../sha256.mjs";
import { NETWORKS } from "./tx.mjs";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58encode(bytes) {
  let n = BigInt(`0x${hex(bytes) || "0"}`), s = "";
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b) break; s = "1" + s; }
  return s;
}

function b58decode(s) {
  if (s.length > 100) throw new RangeError("address too long");
  let n = 0n;
  for (const c of s) { const i = B58.indexOf(c); if (i < 0) throw new RangeError("invalid base58 character"); n = n * 58n + BigInt(i); }
  let h = n.toString(16); if (h.length % 2) h = "0" + h;
  const body = n === 0n ? new Uint8Array(0) : fromHex(h);
  const zeros = s.match(/^1*/)[0].length;
  return concat(new Uint8Array(zeros), body);
}

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function polymod(values) {
  let chk = 1;
  for (const v of values) { const top = chk >>> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i]; }
  return chk >>> 0;
}
const expand = (hrp) => [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];
const CONST = { bech32: 1, bech32m: 0x2bc830a3 };

function convert(data, from, to, pad) {
  let acc = 0, bits = 0; const out = [];
  for (const v of data) { acc = (acc << from) | v; bits += from; while (bits >= to) { bits -= to; out.push((acc >>> bits) & ((1 << to) - 1)); } }
  if (pad) { if (bits) out.push((acc << (to - bits)) & ((1 << to) - 1)); } else if (bits >= from || ((acc << (to - bits)) & ((1 << to) - 1))) throw new RangeError("invalid padding");
  return out;
}

function segwitEncode(hrp, version, program) {
  const data = [version, ...convert(program, 8, 5, true)];
  const mod = polymod([...expand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ (version === 0 ? CONST.bech32 : CONST.bech32m);
  return `${hrp}1${[...data, ...Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31)].map((d) => CHARSET[d]).join("")}`;
}

function segwitDecode(addr, hrp) {
  if (addr.length > 90 || (addr !== addr.toLowerCase() && addr !== addr.toUpperCase())) throw new RangeError("invalid bech32 address");
  const a = addr.toLowerCase(), sep = a.lastIndexOf("1");
  if (a.slice(0, sep) !== hrp) throw new RangeError("address is for another network");
  const data = [...a.slice(sep + 1)].map((c) => { const i = CHARSET.indexOf(c); if (i < 0) throw new RangeError("invalid bech32 character"); return i; });
  if (data.length < 7) throw new RangeError("invalid bech32 address");
  const version = data[0], check = polymod([...expand(hrp), ...data]);
  if (check !== (version === 0 ? CONST.bech32 : CONST.bech32m)) throw new RangeError("bad bech32 checksum");
  const program = convert(data.slice(1, -6), 5, 8, false);
  if (version > 16 || program.length < 2 || program.length > 40 || (version === 0 && program.length !== 20 && program.length !== 32)) throw new RangeError("invalid witness program");
  return { version, program: new Uint8Array(program) };
}

export function scriptToAddress(scriptHex, network = "mainnet") {
  const n = NETWORKS[network], s = fromHex(scriptHex);
  const b58 = (prefix, h) => { const p = concat(new Uint8Array([prefix]), h); return b58encode(concat(p, sha256d(p).subarray(0, 4))); };
  if (s.length === 25 && s[0] === 0x76 && s[1] === 0xa9 && s[2] === 0x14 && s[23] === 0x88 && s[24] === 0xac) return b58(n.p2pkh, s.subarray(3, 23));
  if (s.length === 23 && s[0] === 0xa9 && s[1] === 0x14 && s[22] === 0x87) return b58(n.p2sh, s.subarray(2, 22));
  if (s.length >= 4 && s.length <= 42 && (s[0] === 0 || (s[0] >= 0x51 && s[0] <= 0x60)) && s[1] === s.length - 2) return segwitEncode(n.hrp, s[0] === 0 ? 0 : s[0] - 0x50, s.subarray(2));
  return null;
}

export function addressToScript(address, network = "mainnet") {
  const n = NETWORKS[network];
  if (typeof address !== "string") throw new TypeError("address must be a string");
  const hrp = /^(bc|tb|bcrt)1/i.exec(address)?.[1].toLowerCase();
  if (hrp && hrp !== n.hrp) throw new RangeError("address is for another network");
  if (hrp) {
    const { version, program } = segwitDecode(address, n.hrp);
    return hex(concat(new Uint8Array([version === 0 ? 0 : 0x50 + version, program.length]), program));
  }
  const raw = b58decode(address);
  if (raw.length !== 25 || hex(sha256d(raw.subarray(0, 21)).subarray(0, 4)) !== hex(raw.subarray(21))) throw new RangeError("bad base58check address");
  if (raw[0] === n.p2pkh) return `76a914${hex(raw.subarray(1, 21))}88ac`;
  if (raw[0] === n.p2sh) return `a914${hex(raw.subarray(1, 21))}87`;
  throw new RangeError("address is for another network");
}
