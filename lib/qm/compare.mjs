// Infrastructure cost comparison and savings estimates from supplied, documented assumptions. Pure; money is integer cents.
import { privacyScan } from "../jrc/core.mjs";
import { site } from "../jrc/site-config.mjs";
import { CATEGORIES, summarize } from "./expenses.mjs";

// Round half away from zero to whole cents, once per line item; recurring totals are kept in yearly cents so nothing drifts.
const toCents = (amount) => Math.sign(amount) * Math.round(Math.abs(amount) * 100);
const money = (cents, currency) => (cents === null ? null : { amount: cents / 100, currency });
const listed = (all) => ({ assumptions: all.slice(0, 20), ...(all.length > 20 ? { assumptions_truncated: true, assumptions_total: all.length } : {}) });
const monthlyOf = (yearlyCents) => (yearlyCents === null ? null : Math.round(yearlyCents / 12));

function lineCents(item) {
  if (item.unit_cost === null) return null;
  return toCents(item.unit_cost * item.quantity);
}

// An unknown item only makes the totals for its own period unknown: a one-time unknown doesn't hide a known monthly bill.
export function costConfiguration(config) {
  let yearly = 0, oneTime = 0;
  const unknownRecurring = [], unknownOneTime = [];
  const lines = config.items.map((it) => {
    const c = lineCents(it);
    if (c === null) (it.period === "one-time" ? unknownOneTime : unknownRecurring).push(it.id);
    else if (it.period === "one-time") oneTime += c;
    else yearly += it.period === "monthly" ? c * 12 : c;
    return { id: it.id, period: it.period, cost: money(c, config.currency), basis: c === null ? "missing" : "estimate" };
  });
  return {
    name: config.name,
    yearly_cents: unknownRecurring.length ? null : yearly,
    one_time_cents: unknownOneTime.length ? null : oneTime,
    unknown_items: [...unknownRecurring, ...unknownOneTime],
    lines,
  };
}

function leakProblem(value) {
  const leaks = privacyScan(value);
  return leaks.length ? { code: "PRIVATE_DATA", message: `Remove private data first: ${[...new Set(leaks.map((l) => l.kind))].join(", ")}.` } : null;
}

function inputProblems(...configs) {
  const leak = leakProblem(configs);
  if (leak) return leak;
  const currencies = new Set(configs.map((c) => c.currency));
  if (currencies.size > 1) return { code: "CURRENCY_MISMATCH", message: "Both configurations must use the same currency; this tool doesn't convert currencies." };
  for (const c of configs) {
    // $100bn per line keeps every total well inside exact integer range.
    if (c.items.some((i) => Math.abs(lineCents(i) ?? 0) > 1e13)) return { code: "INVALID_INPUT", message: `Configuration "${c.name}" has a line over 100,000,000,000; amounts that large can't be added exactly.` };
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
  const side = (c, name) => ({ name, monthly: money(monthlyOf(c.yearly_cents), cur), yearly: money(c.yearly_cents, cur), one_time: money(c.one_time_cents, cur), unknown_items: c.unknown_items });
  const rec = ca.yearly_cents !== null && cb.yearly_cents !== null;
  const one = ca.one_time_cents !== null && cb.one_time_cents !== null;
  return {
    currency: cur,
    a: side(ca, a.name),
    b: side(cb, b.name),
    difference_b_minus_a: { yearly: rec ? money(cb.yearly_cents - ca.yearly_cents, cur) : null, monthly: rec ? money(monthlyOf(cb.yearly_cents - ca.yearly_cents), cur) : null, one_time: one ? money(cb.one_time_cents - ca.one_time_cents, cur) : null },
    cheaper_recurring: rec ? (cb.yearly_cents < ca.yearly_cents ? b.name : cb.yearly_cents > ca.yearly_cents ? a.name : "equal") : "indeterminate",
    basis: "estimate",
    ...listed([...a.items, ...b.items].map((i) => ({ config: a.items.includes(i) ? a.name : b.name, id: i.id, assumption: i.assumption, ...(i.source ? { source: i.source } : {}) }))),
    note: `Estimates from the assumptions you supplied; nothing was measured or billed. Recurring costs are summed in yearly whole cents; monthly figures are that total divided by 12 and rounded. One-time costs are kept separate.${rec && one ? "" : " Some totals are unknown because an item's cost is unknown; unknown is never treated as zero."}`,
  };
}

export function estimateSavings(model, extra = {}) {
  const problem = leakProblem([model, extra]) ?? inputProblems(model.current, model.proposed);
  if (problem) return { error: problem };
  const cur = model.current.currency;
  const cc = costConfiguration(model.current), cp = costConfiguration(model.proposed);
  // No stated migration cost is unknown, not zero; callers say 0 when there is none.
  const migration = typeof model.migration?.one_time_cost === "number" ? toCents(model.migration.one_time_cost) : null;
  const assumptions = [
    ...model.current.items.map((i) => ({ config: "current", id: i.id, assumption: i.assumption })),
    ...model.proposed.items.map((i) => ({ config: "proposed", id: i.id, assumption: i.assumption })),
    ...(model.migration ? [{ config: "migration", id: "migration", assumption: model.migration.assumption }] : []),
  ];
  if (cc.yearly_cents === null || cp.yearly_cents === null || migration === null || cp.one_time_cents === null) {
    return { savings: null, basis: "missing", unknown: { current: cc.unknown_items, proposed: cp.unknown_items, migration: migration === null }, ...listed(assumptions), note: "Some costs are unknown, so savings can't be estimated. Unknown is never treated as zero." };
  }
  const yearlySaving = cc.yearly_cents - cp.yearly_cents;
  const upfront = migration + cp.one_time_cents;
  const horizon = model.horizon_months;
  // Rounded once, at the end: savings over N months = yearly saving x N / 12.
  const net = Math.round((yearlySaving * horizon) / 12) - upfront;
  const breakEven = yearlySaving > 0 ? Math.max(0, Math.ceil((upfront * 12) / yearlySaving)) : null;
  return {
    currency: cur,
    monthly_saving: money(monthlyOf(yearlySaving), cur),
    yearly_saving: money(yearlySaving, cur),
    upfront_cost: money(upfront, cur),
    horizon_months: horizon,
    net_saving_over_horizon: money(net, cur),
    break_even_month: breakEven !== null && breakEven <= horizon ? breakEven : null,
    verdict: net > 0 ? "saves money over the horizon" : net < 0 ? "costs more over the horizon" : "breaks even over the horizon",
    basis: "estimate",
    ...listed(assumptions),
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
  const est = estimateSavings(model, { title, risks, tests, measurement });
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
    ...[["current", model.current], ["proposed", model.proposed]].flatMap(([k, c]) => c.items.map((i) => `- ${k} / ${i.id}: ${i.assumption}`)),
    `- migration: ${model.migration.assumption}`,
    ...risks.map((r) => `- Risk: ${r}`), "",
    "## Tests", "", "- [ ] `npm ci && npm test` passes", ...tests.map((t) => `- [ ] ${t}`), "",
    "## After merging", "", measurement ?? "_(How and when will we compare the real bill with this estimate? Who updates `launch/costs.json`?)_", "",
    "No infrastructure change is deployed automatically. A maintainer applies it after review.",
  ].join("\n");
  return {
    title: `cost: ${title}`, body, estimate: { net_saving_over_horizon: est.net_saving_over_horizon, break_even_month: est.break_even_month ?? null, basis: est.basis },
    how_to_submit: "Create a branch with your change, push it to your fork, and open a pull request with this body (template: propose-a-saving).",
    compare_link: `${site.repoUrl}/compare?template=propose-a-saving.md`,
    note: "Prepared only. No branch, PR or infrastructure change was made.",
  };
}
