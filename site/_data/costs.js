import { readFileSync } from "node:fs";
import { CATEGORIES, summarize, validateLedger } from "../../lib/qm/expenses.mjs";

export default () => {
  const ledger = JSON.parse(readFileSync("launch/costs.json", "utf8"));
  const errors = validateLedger(ledger);
  if (errors.length) throw new Error(`launch/costs.json is invalid; refusing to publish it:\n${errors.map((e) => `${e.at}: ${e.message}`).join("\n")}`);
  const sources = Object.fromEntries(ledger.sources.map((s) => [s.id, s]));
  return { ...ledger, summary: summarize(ledger), categories: CATEGORIES, sourceById: sources };
};
