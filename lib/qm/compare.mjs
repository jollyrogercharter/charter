// Infrastructure cost comparison and savings estimates from supplied, documented assumptions. Pure; money is integer cents.
import { privacyScan } from "../jrc/core.mjs";
import { CATEGORIES, summarize } from "./expenses.mjs";

const PER_MONTH = { monthly: 1, yearly: 1 / 12 };
// Round half away from zero to whole cents, once per line item; totals are sums of rounded lines.
const toCents = (amount) => Math.sign(amount) * Math.round(Math.abs(amount) * 100);
const money = (cents, currency) => (cents === null ? null : { amount: cents / 100, currency });

function lineCents(item) {
  if (item.unit_cost === null) return null;
  return toCents(item.unit_cost * item.quantity);
}

export function costConfiguration(config) {
  let monthly = 0, oneTime = 0;
  const unknown = [];
  const lines = config.items.map((it) => {
    const c = lineCents(it);
    if (c === null) unknown.push(it.id);
    else if (it.period === "one-time") oneTime += c;
    else monthly += Math.round(c * PER_MONTH[it.period]);
    return { id: it.id, period: it.period, cost: money(c, config.currency), basis: c === null ? "missing" : "estimate" };
  });
  return { name: config.name, monthly_cents: unknown.length ? null : monthly, known_monthly_cents: monthly, one_time_cents: unknown.length ? null : oneTime, known_one_time_cents: oneTime, unknown_items: unknown, lines };
}

function inputProblems(...configs) {
  const leaks = privacyScan(configs);
  if (leaks.length) return { code: "PRIVATE_DATA", message: `Remove private data first: ${[...new Set(leaks.map((l) => l.kind))].join(", ")}.` };
  const currencies = new Set(configs.map((c) => c.currency));
  if (currencies.size > 1) return { code: "CURRENCY_MISMATCH", message: "Both configurations must use the same currency; this tool doesn't convert currencies." };
  for (const c of configs) {
    const ids = c.items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) return { code: "INVALID_INPUT", message: `Configuration "${c.name}" repeats an item id.` };
  }
  return null;
}

export function compareConfigurations(a, b) {
  const problem = inputProblems(a, b);
  if (problem) return { error: problem };
  const ca = costConfiguration(a), cb = costConfiguration(b);
  const cur = a.currency;
  const known = ca.monthly_cents !== null && cb.monthly_cents !== null;
  return {
    currency: cur,
    a: { name: a.name, monthly: money(ca.monthly_cents, cur), yearly: money(ca.monthly_cents === null ? null : ca.monthly_cents * 12, cur), one_time: money(ca.one_time_cents, cur), unknown_items: ca.unknown_items },
    b: { name: b.name, monthly: money(cb.monthly_cents, cur), yearly: money(cb.monthly_cents === null ? null : cb.monthly_cents * 12, cur), one_time: money(cb.one_time_cents, cur), unknown_items: cb.unknown_items },
    difference_b_minus_a: known ? { monthly: money(cb.monthly_cents - ca.monthly_cents, cur), yearly: money((cb.monthly_cents - ca.monthly_cents) * 12, cur), one_time: money(cb.one_time_cents - ca.one_time_cents, cur) } : null,
    cheaper_recurring: known ? (cb.monthly_cents < ca.monthly_cents ? b.name : cb.monthly_cents > ca.monthly_cents ? a.name : "equal") : "indeterminate",
    basis: "estimate",
    assumptions: [...a.items, ...b.items].map((i) => ({ config: a.items.includes(i) ? a.name : b.name, id: i.id, assumption: i.assumption, ...(i.source ? { source: i.source } : {}) })).slice(0, 20),
    note: known ? "Estimates from the assumptions you supplied; nothing was measured or billed. Yearly = monthly x 12; one-time costs are kept separate." : "At least one item has an unknown cost, so totals and the difference can't be computed. Unknown is never treated as zero.",
  };
}

export function estimateSavings(model) {
  const problem = inputProblems(model.current, model.proposed);
  if (problem) return { error: problem };
  const cur = model.current.currency;
  const cc = costConfiguration(model.current), cp = costConfiguration(model.proposed);
  const migration = model.migration?.one_time_cost === null ? null : toCents(model.migration?.one_time_cost ?? 0);
  const assumptions = [
    ...model.current.items.map((i) => ({ config: "current", id: i.id, assumption: i.assumption })),
    ...model.proposed.items.map((i) => ({ config: "proposed", id: i.id, assumption: i.assumption })),
    ...(model.migration ? [{ config: "migration", id: "migration", assumption: model.migration.assumption }] : []),
  ];
  if (cc.monthly_cents === null || cp.monthly_cents === null || migration === null || cp.one_time_cents === null) {
    return { savings: null, basis: "missing", unknown: { current: cc.unknown_items, proposed: cp.unknown_items, migration: migration === null }, assumptions: assumptions.slice(0, 20), note: "Some costs are unknown, so savings can't be estimated. Unknown is never treated as zero." };
  }
  const monthlySaving = cc.monthly_cents - cp.monthly_cents;
  const upfront = migration + cp.one_time_cents;
  const horizon = model.horizon_months;
  const net = monthlySaving * horizon - upfront;
  let breakEven = null;
  if (monthlySaving > 0) breakEven = Math.max(0, Math.ceil(upfront / monthlySaving));
  return {
    currency: cur,
    monthly_saving: money(monthlySaving, cur),
    upfront_cost: money(upfront, cur),
    horizon_months: horizon,
    net_saving_over_horizon: money(net, cur),
    break_even_month: breakEven !== null && breakEven <= horizon ? breakEven : null,
    verdict: net > 0 ? "saves money over the horizon" : net < 0 ? "costs more over the horizon" : "breaks even over the horizon",
    basis: "estimate",
    assumptions: assumptions.slice(0, 20),
    note: "A projection from your assumptions, not a measurement. Cash savings only; it says nothing about reliability, security, accessibility or the human time a change takes. Check the real bills afterwards.",
  };
}

export function explainCosts(ledger, { category } = {}) {
  const s = summarize(ledger);
  const rules = {
    cash: "Money actually paid or billed, from an invoice or a provider's own figures. The only category that's added up into 'known cash spending'.",
    forecast: "Expected future spending, such as a renewal. Shown separately because it hasn't happened and may change.",
    reserve: "Money set aside but not spent. Reporting it as spending would double-count it when it's used.",
    "donated-labor": "Unpaid contributor time. Recorded in hours; given a price only with a published valuation method, because there's no agreed hourly rate.",
    "user-attention": "Time people spend because of the software (setup, waiting, fixing things). A real cost to them, but not the project's money.",
  };
  const cats = category ? [category] : Object.keys(CATEGORIES);
  return {
    principle: "The five categories are never added together. Unknown amounts are null, never zero. Noncash time stays in hours unless a method is cited.",
    categories: Object.fromEntries(cats.map((k) => {
      const c = s.categories[k];
      return [k, { meaning: rules[k], entries: c.entries, known_amount: c.entries > c.unknown_amounts ? c.known_amount : null, unknown_amounts: c.unknown_amounts }];
    })),
    this_project: s.statement,
    basis: "self-reported",
    currency: ledger.currency,
    as_of_utc: ledger.as_of_utc,
  };
}

// A reviewable PR body following .github/PULL_REQUEST_TEMPLATE/propose-a-saving.md. Nothing is opened or applied.
export function costReductionPr(model, { title, risks = [], tests = [], measurement }) {
  const est = estimateSavings(model);
  if (est.error) return est;
  const cmp = compareConfigurations(model.current, model.proposed);
  const f = (m) => (m === null || m === undefined ? "unknown" : `${m.currency} ${m.amount.toFixed(2)}`);
  const body = [
    `## Proposed saving`, "", `**${title}**`, "",
    `## Cost, before and after`, "",
    "| | Before | After | Source / method |", "|---|---:|---:|---|",
    `| Monthly cash cost | ${f(cmp.a.monthly)} | ${f(cmp.b.monthly)} | Estimates from the assumptions below |`,
    `| One-time cost (migration, setup) | \u2014 | ${f(est.upfront_cost)} | ${model.migration?.assumption ?? "none stated"} |`,
    `| Net over ${model.horizon_months} months | | ${f(est.net_saving_over_horizon)} | ${est.basis} |`, "",
    "Unknown is an acceptable answer; it is never written as 0.", "",
    "## Assumptions and risks", "",
    ...(est.assumptions ?? []).map((a) => `- ${a.config} / ${a.id}: ${a.assumption}`),
    ...risks.map((r) => `- Risk: ${r}`), "",
    "## Tests", "", "- [ ] `npm ci && npm test` passes", ...tests.map((t) => `- [ ] ${t}`), "",
    "## After merging", "", measurement ?? "_(How and when will we compare the real bill with this estimate? Who updates `launch/costs.json`?)_", "",
    "No infrastructure change is deployed automatically. A maintainer applies it after review.",
  ].join("\n");
  return {
    title: `cost: ${title}`, body, estimate: { net_saving_over_horizon: est.net_saving_over_horizon, break_even_month: est.break_even_month ?? null, basis: est.basis },
    how_to_submit: "Create a branch with your change, push it to your fork, and open a pull request with this body (template: propose-a-saving).",
    compare_link: "https://github.com/jollyrogercharter/charter/compare?template=propose-a-saving.md",
    note: "Prepared only. No branch, PR or infrastructure change was made.",
  };
}
