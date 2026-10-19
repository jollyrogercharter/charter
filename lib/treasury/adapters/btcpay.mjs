// BTCPay Server Greenfield API (read-only use): invoices and their payment methods, field names from the official OpenAPI spec.
import { COMMODITIES, convert, isRate } from "../money.mjs";
import { sha256Hex } from "../sha256.mjs";
import { parseDecimal } from "./apple.mjs";

const INVOICE_STATUSES = ["New", "Processing", "Expired", "Invalid", "Settled"];
const PAYMENT_STATUSES = ["Invalid", "Processing", "Settled"];
const unix = (n) => (Number.isInteger(n) && n > 0 && n < 4102444800 ? new Date(n * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : null);

// invoice: GET /api/v1/invoices/{id}; methods: GET /api/v1/invoices/{id}/payment-methods.
export function normalizeInvoice(invoice, methods) {
  if (!invoice || typeof invoice !== "object" || typeof invoice.id !== "string") throw new TypeError("not a Greenfield invoice");
  if (!INVOICE_STATUSES.includes(invoice.status)) throw new RangeError(`unknown invoice status ${String(invoice.status).slice(0, 20)}`);
  if (!(invoice.currency in COMMODITIES)) throw new RangeError(`unsupported invoice currency ${String(invoice.currency).slice(0, 10)}`);
  const payments = [];
  for (const m of Array.isArray(methods) ? methods : []) {
    if (m.paymentMethodId !== "BTC-CHAIN") continue;
    for (const p of m.payments ?? []) {
      if (!PAYMENT_STATUSES.includes(p.status)) throw new RangeError("unknown payment status");
      payments.push({ id: String(p.id).slice(0, 100), received_at: unix(p.receivedDate), value_sats: parseDecimal(p.value, "BTC"), status: p.status, destination: String(p.destination ?? "").slice(0, 100), rate: m.rate ?? null });
    }
  }
  return {
    invoice_id: invoice.id.slice(0, 64), status: invoice.status, additional_status: invoice.additionalStatus ?? null,
    amount: parseDecimal(invoice.amount, invoice.currency), currency: invoice.currency, created_at: unix(invoice.createdTime), payments,
    lightning_skipped: (methods ?? []).filter((m) => m.paymentMethodId !== "BTC-CHAIN" && (m.payments ?? []).length).length,
  };
}

// A settled on-chain invoice becomes income, valued at BTCPay's own locked rate, booked into the treasury once its transaction is proven.
export function btcpayProposal(inv, { source, accounts, kind = "donation", chainProofId, chainSource, simulated }) {
  if (inv.status !== "Settled") return { skipped: `invoice ${inv.invoice_id} is ${inv.status}; only settled invoices are booked` };
  const settled = inv.payments.filter((p) => p.status === "Settled");
  if (!settled.length) return { skipped: `invoice ${inv.invoice_id} has no settled on-chain payments (Lightning isn't handled yet)` };
  const sats = settled.reduce((n, p) => n + p.value_sats, 0);
  // Invoice ids are billing identifiers, so the public journal carries only a hash of one.
  const hash = sha256Hex(inv.invoice_id).slice(0, 16);
  const ref = `BTCPay record, id hash ${hash}`;
  const at = settled.map((p) => p.received_at).sort().at(-1);
  const rate = settled[0].rate;
  const price = rate && isRate(rate) && inv.currency !== "BTC" ? { type: "price", id: `price-btcpay-${hash}`, at, base: "BTC", quote: inv.currency, rate, source, ...(simulated ? { simulated: true } : {}) } : null;
  const value = price ? { amount: convert(sats, "BTC", inv.currency, rate), commodity: inv.currency, price: price.id } : null;
  return {
    price,
    proposal: {
      type: "transaction", id: `btcpay-${hash}`, kind, status: "posted", occurred_at: at,
      description: `BTCPay invoice settled on-chain (${inv.currency} ${inv.amount / 10 ** COMMODITIES[inv.currency]})`,
      privacy: "public", ...(chainProofId ? { chain_proof: chainProofId } : {}),
      postings: [
        { account: accounts.treasury, amount: sats, commodity: "BTC", evidence: chainProofId ? { source: chainSource, ref: settled.map((p) => p.id.split("-")[0]).join(",").slice(0, 200) } : { source, ref }, ...(value ? { value } : {}) },
        { account: accounts.income, amount: -sats, commodity: "BTC", evidence: { source, ref }, ...(value ? { value: { ...value, amount: -value.amount } } : {}) },
      ],
      ...(value && value.amount !== inv.amount ? { note: `BTCPay's rate values the coins at ${value.amount} minor units; the invoice was for ${inv.amount}.` } : {}),
      ...(simulated ? { simulated: true } : {}),
    },
  };
}

// GET-only client. The key comes from the operator's environment at run time; it is never stored, logged or returned.
export function btcpayClient({ baseUrl, apiKey, fetch: f = globalThis.fetch }) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") throw new RangeError("BTCPay base URL must be https");
  const get = async (path) => {
    const res = await f(`${base.href.replace(/\/$/, "")}/api/v1${path}`, { method: "GET", headers: { Authorization: `token ${apiKey}`, Accept: "application/json" }, redirect: "error" });
    if (!res.ok) throw new Error(`BTCPay returned HTTP ${res.status} for ${path.replace(/\/invoices\/[^/]+/, "/invoices/…")}`);
    return res.json();
  };
  const seg = (s) => encodeURIComponent(String(s));
  return {
    listInvoices: (storeId, { skip = 0, take = 50 } = {}) => get(`/stores/${seg(storeId)}/invoices?skip=${Number(skip)}&take=${Math.min(Number(take), 100)}`),
    getInvoice: (invoiceId) => get(`/invoices/${seg(invoiceId)}`),
    getPaymentMethods: (invoiceId) => get(`/invoices/${seg(invoiceId)}/payment-methods`),
  };
}
