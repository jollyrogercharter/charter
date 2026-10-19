// Apple App Store Connect Financial reports (FINANCIAL, tab-separated, MM/DD/YYYY), per Apple's published field reference.
import { COMMODITIES } from "../money.mjs";

// Apple's page spaces some names ("ISRC / ISBN", "Sale or Return") and older files didn't, so headers are matched without spaces or case.
const FIELDS = {
  startdate: "start_date", enddate: "end_date", upc: "upc", "isrc/isbn": "isrc_isbn", vendoridentifier: "vendor_identifier", quantity: "quantity",
  partnershare: "partner_share", extendedpartnershare: "extended_partner_share", partnersharecurrency: "partner_share_currency",
  saleorreturn: "sale_or_return", salesorreturn: "sale_or_return", appleidentifier: "apple_identifier", "artist/show/developer/author": "developer",
  title: "title", "label/studio/network/developer/publisher": "label", grid: "grid", producttypeidentifier: "product_type", "isan/otheridentifier": "isan_other",
  countryofsale: "country_of_sale", "pre-orderflag": "preorder", promocode: "promo_code", customerprice: "customer_price", customercurrency: "customer_currency",
};
const REQUIRED = ["start_date", "end_date", "quantity", "partner_share", "extended_partner_share", "partner_share_currency", "sale_or_return", "customer_price", "customer_currency", "vendor_identifier"];
const MAX_ROWS = 100000;
const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseDecimal(s, currency) {
  const d = COMMODITIES[currency];
  if (d === undefined) throw new RangeError(`unsupported currency ${currency}`);
  const m = /^(-)?(\d{1,13})(?:\.(\d{0,18}?)0*)?$/.exec(String(s).trim());
  if (!m || (m[3] ?? "").length > d) throw new RangeError(`"${String(s).slice(0, 20)}" isn't an amount with at most ${d} decimals`);
  const v = Number(m[2]) * 10 ** d + Number((m[3] ?? "").padEnd(d, "0") || 0);
  if (!Number.isSafeInteger(v)) throw new RangeError("amount too large");
  return m[1] && v ? -v : v;
}

const isoDate = (s) => { const m = DATE.exec(s); if (!m) return null; const iso = `${m[3]}-${m[1]}-${m[2]}`; return Number.isNaN(Date.parse(iso)) ? null : iso; };

export function parseFinancialReport(text) {
  if (typeof text !== "string") throw new TypeError("report must be text (gunzip it first)");
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) throw new RangeError("empty report");
  if (lines.length > MAX_ROWS) throw new RangeError(`reports over ${MAX_ROWS} lines aren't accepted`);
  const header = lines[0].split("\t").map((h) => FIELDS[h.replace(/\s+/g, "").toLowerCase()] ?? null);
  const missing = REQUIRED.filter((f) => !header.includes(f));
  if (missing.length) throw new RangeError(`not an Apple Financial report: missing ${missing.join(", ")}`);
  const rows = [], footer = [], issues = [];
  lines.slice(1).forEach((line, i) => {
    const cells = line.split("\t");
    const lineNo = i + 2;
    if (!DATE.test(cells[0] ?? "")) { footer.push({ line: lineNo, cells: cells.slice(0, 4) }); return; }
    if (cells.length !== header.length) { issues.push({ line: lineNo, issue: `expected ${header.length} fields, got ${cells.length}` }); return; }
    const r = Object.fromEntries(header.map((k, j) => [k, cells[j]]).filter(([k]) => k));
    try {
      const cur = r.partner_share_currency, ccur = r.customer_currency;
      const row = {
        line: lineNo, start_date: isoDate(r.start_date), end_date: isoDate(r.end_date), product: r.vendor_identifier, product_type: r.product_type ?? null, country: r.country_of_sale ?? null,
        kind: r.sale_or_return, quantity: Number(r.quantity), partner_share: parseDecimal(r.partner_share, cur), extended_partner_share: parseDecimal(r.extended_partner_share, cur), currency: cur,
        customer_price: parseDecimal(r.customer_price, ccur), customer_currency: ccur,
      };
      if (!row.start_date || !row.end_date) throw new RangeError("dates must be MM/DD/YYYY");
      if (!Number.isInteger(row.quantity)) throw new RangeError("quantity must be an integer");
      if (!["S", "R"].includes(row.kind)) throw new RangeError("Sale or Return must be S or R");
      // A row that doesn't add up is listed, never booked.
      if (row.extended_partner_share !== row.quantity * row.partner_share) { issues.push({ line: lineNo, issue: `Extended Partner Share ${r.extended_partner_share} isn't Quantity x Partner Share; not booked` }); return; }
      if ((row.kind === "R") !== (row.quantity < 0)) { issues.push({ line: lineNo, issue: "Sale or Return disagrees with the sign of Quantity; not booked" }); return; }
      rows.push(row);
    } catch (e) { issues.push({ line: lineNo, issue: e.message }); }
  });
  return { rows, footer, issues, note: "Apple documents no footer rows; any trailing lines are listed under footer and never used for totals." };
}

// One entry per fiscal period and currency, refunds netted in, so a single refund isn't a separate, guessable record.
// Apple doesn't split tax from commission, so neither do we. salt() must return 32 random bytes as hex (journal.newSalt).
export function appleProposals(report, { source, accounts, simulated, salt, splitRefunds = false }) {
  if (typeof salt !== "function") throw new TypeError("appleProposals needs salt(): aggregated records are salted so they can be withheld safely");
  const groups = new Map();
  for (const r of report.rows) {
    if (r.customer_currency !== r.currency) continue;
    const key = `${r.end_date}|${r.currency}${splitRefunds ? `|${r.kind}` : ""}`;
    const g = groups.get(key) ?? { end: r.end_date, start: r.start_date, currency: r.currency, kind: splitRefunds && r.kind === "R" ? "refund" : "sale", sold: 0, refunded: 0, proceeds: 0, customer: 0, lines: [] };
    if (r.kind === "S") g.sold += r.quantity; else g.refunded += Math.abs(r.quantity);
    g.proceeds += r.extended_partner_share;
    // The sign comes from Quantity alone, whichever sign Apple prints on a return's Customer Price.
    g.customer += r.quantity * Math.abs(r.customer_price);
    g.lines.push(r.line);
    groups.set(key, g);
  }
  const skipped = report.rows.filter((r) => r.customer_currency !== r.currency).map((r) => r.line);
  const proposals = [...groups.values()].map((g) => {
    const ref = `report lines ${g.lines.join(",")}`.slice(0, 200);
    const sign = g.kind === "refund" ? "refunds" : "sales";
    return {
      type: "transaction", id: `apple-${g.end}-${g.currency.toLowerCase()}-${sign}`, kind: g.kind, status: "posted",
      occurred_at: `${g.end}T23:59:59Z`, description: `App Store ${sign}, fiscal period ${g.start} to ${g.end}, ${g.currency}${g.refunded && g.kind === "sale" ? ", refunds netted in" : ""}`,
      privacy: "aggregated", count: g.kind === "refund" ? g.refunded : g.sold, salt: salt(),
      postings: [
        { account: accounts.income, amount: -g.customer, commodity: g.currency, evidence: { source, ref } },
        { account: accounts.commission, amount: g.customer - g.proceeds, commodity: g.currency, evidence: { source, ref } },
        { account: accounts.receivable, amount: g.proceeds, commodity: g.currency, evidence: { source, ref } },
      ],
      note: "Customer price includes any tax Apple collected and remitted; Apple's report doesn't separate that tax from its commission. count is units sold, not distinct customers.",
      ...(simulated ? { simulated: true } : {}),
    };
  });
  return { proposals, skipped_cross_currency_lines: skipped, issues: report.issues };
}
