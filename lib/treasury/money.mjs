// Integer minor units (cents, sats) and decimal-string rates, evaluated with BigInt so no float ever touches money.
export const COMMODITIES = { USD: 2, EUR: 2, GBP: 2, JPY: 0, CAD: 2, AUD: 2, CHF: 2, BTC: 8 };
const RATE = /^\d{1,15}(\.\d{1,12})?$/;

export const isRate = (s) => typeof s === "string" && RATE.test(s) && /[1-9]/.test(s);

function scaled(rate) {
  const [i, f = ""] = rate.split(".");
  return { n: BigInt(i + f), d: 10n ** BigInt(f.length) };
}

// Rounds half away from zero.
function divRound(num, den) {
  const neg = (num < 0n) !== (den < 0n);
  const a = num < 0n ? -num : num, b = den < 0n ? -den : den;
  const q = (a * 2n + b) / (b * 2n);
  return neg ? -q : q;
}

// Converts an amount in one commodity's minor units to another's, at `rate` units of quote per one unit of base.
export function convert(amount, from, to, rate) {
  if (!Number.isSafeInteger(amount)) throw new RangeError("amount must be a safe integer of minor units");
  if (!isRate(rate)) throw new RangeError("rate must be a positive decimal string");
  const { n, d } = scaled(rate);
  const num = BigInt(amount) * n * 10n ** BigInt(COMMODITIES[to]);
  const den = d * 10n ** BigInt(COMMODITIES[from]);
  const out = divRound(num, den);
  if (out > BigInt(Number.MAX_SAFE_INTEGER) || out < -BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("converted amount out of range");
  return Number(out);
}

// Effective rate (quote per base unit) from two minor-unit amounts, as a decimal string with `places` decimals.
export function effectiveRate(quoteAmount, quote, baseAmount, base, places = 2) {
  if (!baseAmount) return null;
  const num = BigInt(quoteAmount) * 10n ** BigInt(COMMODITIES[base] + places);
  const den = BigInt(baseAmount) * 10n ** BigInt(COMMODITIES[quote]);
  const v = divRound(num, den);
  const s = (v < 0n ? -v : v).toString().padStart(places + 1, "0");
  return `${v < 0n ? "-" : ""}${s.slice(0, s.length - places)}${places ? "." + s.slice(-places) : ""}`;
}

export function format(amount, commodity) {
  if (amount === null || amount === undefined) return "unknown";
  const d = COMMODITIES[commodity];
  const neg = amount < 0, s = String(Math.abs(amount)).padStart(d + 1, "0");
  return `${neg ? "-" : ""}${d ? `${s.slice(0, s.length - d)}.${s.slice(-d)}` : s} ${commodity}`;
}
