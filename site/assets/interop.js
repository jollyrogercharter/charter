// Page controls for debates, contribution matching, hash verification, cost comparison and AT Protocol records.
// Each control calls executor(tool), exactly the path an agent's WebMCP call takes. Output is built with textContent only.
import { executor } from "/assets/webmcp.js";
import { TOOLS } from "/js/lib/capabilities/tools.mjs";

const run = (name, input) => executor(TOOLS.find((t) => t.name === name))(input, { signal: new AbortController().signal });
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else n.setAttribute(k, v);
  for (const k of kids) if (k) n.append(k);
  return n;
};
const announce = (region, text) => { region.textContent = ""; setTimeout(() => { region.textContent = text; }, 50); };
const errorBox = (r) => el("div", { class: "notice", role: "alert" }, el("p", { text: `${r.error?.code ?? "ERROR"}: ${r.error?.message ?? "Something went wrong."}` }));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function download(name, text, type = "application/json") {
  const a = el("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name, text: `Download ${name}` });
  return a;
}

function finder(root) {
  const out = root.querySelector("[data-results]");
  const live = root.querySelector("[data-live]");
  root.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const r = await run("find_opportunities", { skills: f.getAll("skills"), interests: f.getAll("interests") });
    out.replaceChildren();
    if (!r.ok) { out.append(errorBox(r)); announce(live, "Choose at least one skill or interest."); return; }
    const list = el("ol");
    for (const m of r.matches) list.append(el("li", {}, el("a", { href: m.where, text: m.title }), el("span", { text: ` (effort: ${m.effort}; matched ${m.matched_skills} skill(s), ${m.matched_interests} interest(s))` })));
    out.append(el("p", { text: `${r.matches_total} match(es). ${r.note}` }), list);
    announce(live, `${r.matches_total} matching opportunities.`);
  });
}

function verifier(root) {
  const out = root.querySelector("[data-results]");
  const live = root.querySelector("[data-live]");
  root.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = [...e.target.elements.files.files].slice(0, 50);
    if (!files.length) { announce(live, "Choose one or more files first."); return; }
    announce(live, "Hashing in your browser…");
    const items = [];
    for (const file of files) items.push({ sha256: hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())) });
    const r = await run("verify_hashes", { items });
    out.replaceChildren();
    if (!r.ok) { out.append(errorBox(r)); return; }
    const tbody = el("tbody");
    r.results.forEach((x, i) => tbody.append(el("tr", {}, el("td", { text: files[i].name }), el("td", { text: x.result === "match" ? `match: ${x.matches}` : "no match" }), el("td", { class: "hash", text: items[i].sha256 }))));
    out.append(el("div", { class: "table-scroll" }, el("table", {}, el("thead", {}, el("tr", {}, el("th", { scope: "col", text: "Your file" }), el("th", { scope: "col", text: "Result" }), el("th", { scope: "col", text: "SHA-256" }))), tbody)), el("p", { text: r.note }));
    announce(live, `${r.matched} of ${files.length} file(s) match a published digest.`);
  });
}

function comparer(root) {
  const out = root.querySelector("[data-results]");
  const live = root.querySelector("[data-live]");
  const form = root.querySelector("form");
  const parse = (name) => { try { return JSON.parse(form.elements[name].value); } catch (err) { throw new Error(`${name}: not valid JSON (${err.message})`); } };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const action = e.submitter?.value ?? "compare";
    out.replaceChildren();
    let a, b;
    try { a = parse("a"); b = parse("b"); } catch (err) { out.append(errorBox({ error: { code: "INVALID_JSON", message: err.message } })); return; }
    const horizon = Number(form.elements.horizon.value);
    const mig = form.elements.migration.value.trim();
    const model = { current: a, proposed: b, horizon_months: horizon, ...(mig ? { migration: { one_time_cost: Number(mig), assumption: form.elements.migration_assumption.value || "not stated" } } : {}) };
    const r = action === "compare" ? await run("compare_infrastructure_costs", { a, b })
      : action === "savings" ? await run("estimate_savings", model)
      : await run("prepare_cost_reduction_pr", { ...model, title: form.elements.title.value || "Reduce hosting cost" });
    if (!r.ok) { out.append(errorBox(r), ...(r.error?.details ? [el("pre", { text: JSON.stringify(r.error.details, null, 2) })] : [])); announce(live, "The input needs fixing."); return; }
    if (action === "pr") {
      out.append(el("h3", { text: r.title }), el("pre", { text: r.body }), download("PR-DESCRIPTION.md", r.body, "text/markdown"), el("p", { text: r.note }));
    } else {
      const { ok, tool, tools_version, data_commit, ...rest } = r;
      out.append(el("pre", { text: JSON.stringify(rest, null, 2) }));
    }
    announce(live, action === "compare" ? `Cheaper recurring: ${r.cheaper_recurring}.` : action === "savings" ? (r.verdict ?? "Some costs are unknown.") : "PR description prepared.");
  });
}

function recorder(root) {
  const out = root.querySelector("[data-results]");
  const live = root.querySelector("[data-live]");
  root.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const exported = await run("export_atproto_record", { kind: "contribution", created_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), contribution: { kind: f.kind.value, title: f.title.value, subject: f.subject.value, ...(f.url.value ? { url: f.url.value } : {}), ...(f.summary.value ? { summary: f.summary.value } : {}), ai_assisted: f.ai.checked } });
    out.replaceChildren();
    if (!exported.ok) { out.append(errorBox(exported)); return; }
    const prep = await run("prepare_atproto_publication", { record: exported.record });
    if (!prep.ok) { out.append(errorBox(prep)); return; }
    const req = JSON.stringify(prep.request_body, null, 2);
    out.append(el("pre", { text: req }), download("record-request.json", req), el("ol", {}, ...prep.steps.map((s) => el("li", { text: s }))), el("p", { text: prep.note }));
    announce(live, "Record prepared. Nothing was published.");
  });
}

for (const [sel, fn] of [["[data-jrc-finder]", finder], ["[data-jrc-verify]", verifier], ["[data-jrc-compare]", comparer], ["[data-jrc-record]", recorder]]) {
  for (const root of document.querySelectorAll(sel)) { root.hidden = false; fn(root); }
}
for (const n of document.querySelectorAll("[data-jrc-nojs]")) n.hidden = true;
