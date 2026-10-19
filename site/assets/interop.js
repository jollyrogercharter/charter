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
const errorText = (r) => `${r.error?.code ?? "ERROR"}: ${r.error?.message ?? "Something went wrong."}`;
const errorBox = (r) => el("div", { class: "notice", role: "alert" }, el("p", { text: errorText(r) }));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const safeHref = (u) => { try { return new URL(u).protocol === "https:" ? u : null; } catch { return null; } };
const scrollable = (label, child) => el("div", { class: "table-scroll", tabindex: "0", role: "region", "aria-label": label }, child);
const block = (label, text) => el("pre", { tabindex: "0", "aria-label": label, text });

// Shared submit handling: busy state, one error path, stale output cleared, focus moved to the results heading.
function wire(root, handler) {
  const out = root.querySelector("[data-results]");
  const live = root.querySelector("[data-live]");
  const form = root.querySelector("form");
  let urls = [];
  const download = (name, text, type = "application/json") => {
    const href = URL.createObjectURL(new Blob([text], { type }));
    urls.push(href);
    return el("a", { href, download: name, text: `Download ${name}` });
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const buttons = [...form.querySelectorAll("button, input[type=submit]")];
    for (const u of urls) URL.revokeObjectURL(u);
    urls = [];
    out.replaceChildren();
    live.textContent = "";
    form.setAttribute("aria-busy", "true");
    for (const b of buttons) b.disabled = true;
    let nodes, message;
    try {
      ({ nodes, message } = await handler(e, { download, status: (t) => announce(live, t) }));
    } catch (err) {
      const r = err?.jrc ?? { error: { code: "ERROR", message: String(err?.message ?? err) } };
      nodes = [errorBox(r), ...(r.error?.details ? [block("Error details", JSON.stringify(r.error.details, null, 2))] : [])];
      message = errorText(r);
    } finally {
      form.removeAttribute("aria-busy");
      for (const b of buttons) b.disabled = false;
    }
    const heading = el("h3", { tabindex: "-1", text: "Result" });
    out.append(heading, ...nodes);
    heading.focus();
    announce(live, message);
  });
}
const need = (r) => { if (!r.ok) throw Object.assign(new Error(errorText(r)), { jrc: r }); return r; };

function finder(root) {
  wire(root, async (e) => {
    const f = new FormData(e.target);
    const r = need(await run("find_opportunities", { skills: f.getAll("skills"), interests: f.getAll("interests") }));
    const list = el("ol");
    for (const m of r.matches) {
      const href = safeHref(m.where);
      list.append(el("li", {}, href ? el("a", { href, text: m.title }) : el("span", { text: m.title }), el("span", { text: ` (effort: ${m.effort}; matched ${m.matched_skills} skill(s), ${m.matched_interests} interest(s))` })));
    }
    return { nodes: [el("p", { text: `${r.matches_total} match(es). ${r.note}` }), list], message: `${r.matches_total} matching opportunities.` };
  });
}

function verifier(root) {
  wire(root, async (e, { status }) => {
    const chosen = [...e.target.elements.files.files];
    if (!chosen.length) throw new Error("Choose one or more files first.");
    if (!globalThis.crypto?.subtle) throw new Error("This browser can't compute SHA-256 here (it needs a secure https page). Use jrc provenance verify instead.");
    const files = chosen.slice(0, 50);
    status("Hashing in your browser…");
    const items = [];
    for (const file of files) items.push({ sha256: hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())) });
    const r = need(await run("verify_hashes", { items }));
    const tbody = el("tbody");
    r.results.forEach((x, i) => tbody.append(el("tr", {}, el("th", { scope: "row", text: files[i].name }), el("td", { text: x.result === "match" ? `match: ${x.matches}` : "no match" }), el("td", { class: "hash", text: items[i].sha256 }))));
    const table = el("table", {}, el("caption", { text: "Your files compared with the published digests" }), el("thead", {}, el("tr", {}, el("th", { scope: "col", text: "Your file" }), el("th", { scope: "col", text: "Result" }), el("th", { scope: "col", text: "SHA-256" }))), tbody);
    const skipped = chosen.length > 50 ? [el("p", { class: "notice", text: `Only the first 50 of ${chosen.length} files were checked.` })] : [];
    return { nodes: [...skipped, scrollable("Hash results", table), el("p", { text: r.note })], message: `${r.matched} of ${files.length} file(s) match a published digest.` };
  });
}

function comparer(root) {
  const form = root.querySelector("form");
  const parse = (name) => { try { return JSON.parse(form.elements[name].value); } catch (err) { throw new Error(`${name}: not valid JSON (${err.message})`); } };
  wire(root, async (e, { download }) => {
    const action = e.submitter?.value ?? "compare";
    const a = parse("a"), b = parse("b");
    const horizon = Number(form.elements.horizon.value);
    const mig = form.elements.migration.value.trim();
    const model = { current: a, proposed: b, horizon_months: horizon, migration: { one_time_cost: mig === "" ? null : Number(mig), assumption: form.elements.migration_assumption.value || (mig === "" ? "unknown" : "not stated") } };
    const r = need(action === "compare" ? await run("compare_infrastructure_costs", { a, b })
      : action === "savings" ? await run("estimate_savings", model)
      : await run("prepare_cost_reduction_pr", { ...model, title: form.elements.title.value || "Reduce hosting cost" }));
    if (action === "pr") return { nodes: [el("h4", { text: r.title }), block("PR description", r.body), download("PR-DESCRIPTION.md", r.body, "text/markdown"), el("p", { text: r.note })], message: "PR description prepared." };
    const { ok, tool, tools_version, data_commit, ...rest } = r;
    return { nodes: [block(action === "compare" ? "Comparison" : "Savings estimate", JSON.stringify(rest, null, 2))], message: action === "compare" ? `Cheaper recurring: ${r.cheaper_recurring}.` : (r.verdict ?? "Some costs are unknown.") };
  });
}

function recorder(root) {
  wire(root, async (e, { download }) => {
    const f = e.target.elements;
    const exported = need(await run("export_atproto_record", { kind: "contribution", created_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), contribution: { kind: f.kind.value, title: f.title.value, subject: f.subject.value, ...(f.url.value ? { url: f.url.value } : {}), ...(f.summary.value ? { summary: f.summary.value } : {}), ai_assisted: f.ai.checked } }));
    const prep = need(await run("prepare_atproto_publication", { record: exported.record }));
    const req = JSON.stringify(prep.request_body, null, 2);
    return { nodes: [block("Request body", req), download("record-request.json", req), el("ol", {}, ...prep.steps.map((s) => el("li", { text: s }))), el("p", { text: prep.note })], message: "Record prepared. Nothing was published." };
  });
}

for (const [sel, fn] of [["[data-jrc-finder]", finder], ["[data-jrc-verify]", verifier], ["[data-jrc-compare]", comparer], ["[data-jrc-record]", recorder]]) {
  for (const root of document.querySelectorAll(sel)) { root.hidden = false; fn(root); }
}
for (const n of document.querySelectorAll("[data-jrc-nojs]")) n.hidden = true;
