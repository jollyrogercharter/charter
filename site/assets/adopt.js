// Wires the /adopt/ form to the same session and modules the WebMCP tools use. Rendering lives in adopt-view.mjs.
import { session } from "/assets/webmcp.js";
import { allArtifacts } from "/js/lib/assess/session.mjs";
import { challengeChecks } from "/js/lib/assess/artifacts.mjs";
import { assessJrcManifest, generateAdoptionPlan } from "/js/lib/capabilities/capabilities.mjs";
import { reportMarkdown } from "/js/lib/jrc/report.mjs";
import { challengeHtml, downloadsHtml, errorHtml, manifestHtml, progressHtml, reportHtml, reproduceHtml, roadmapHtml } from "/assets/adopt-view.mjs";

const $ = (sel) => document.querySelector(sel);
const form = $("#adopt-form");
const progress = $("#adopt-progress");
const results = $("#adopt-results");
const announce = $("#adopt-announce");
let current = { files: {}, controller: null };

const say = (text) => { announce.textContent = ""; setTimeout(() => { announce.textContent = text; }, 50); };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256Text = async (t) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));

function mode() { return form.elements.source.value; }
function showPanel() {
  for (const p of form.querySelectorAll("[data-panel]")) p.hidden = p.dataset.panel !== mode();
}

async function readJsonInput(textEl, fileEl, maxBytes) {
  const file = fileEl.files?.[0];
  const text = file ? (file.size > maxBytes ? null : await file.text()) : textEl?.value ?? "";
  if (text === null) throw Object.assign(new Error(`That file is larger than ${Math.round(maxBytes / 1024)} KiB.`), { code: "INPUT_TOO_LARGE" });
  if (!text.trim()) throw Object.assign(new Error("Paste JSON or choose a file first."), { code: "INVALID_INPUT" });
  try { return JSON.parse(text.replace(/^\ufeff/, "")); } catch (err) { throw Object.assign(new Error(`That isn't valid JSON: ${err.message}`), { code: "INVALID_JSON" }); }
}

function render(html, files, focus = true) {
  current.files = files;
  results.innerHTML = html;
  results.setAttribute("aria-busy", "false");
  if (focus) results.querySelector("#results-heading")?.focus();
}

async function runRepository(input, signal) {
  const events = [];
  const onProgress = (ev) => { events.push(ev); progress.innerHTML = progressHtml(events); };
  const result = await session.assess(input, signal, onProgress);
  events.push({ stage: "done" });
  progress.innerHTML = progressHtml(events);
  const { files, links } = allArtifacts(result);
  const r = result.report;
  render(reportHtml(r) + roadmapHtml(r) + challengeHtml(challengeChecks(r)) + downloadsHtml(files, links) + reproduceHtml(r), files);
  const s = r.summary;
  say(`Assessment finished: ${s.evidenced} pillars evidenced, ${s["partially-evidenced"]} partly, ${s.missing} with no evidence found, ${s.unknown} unknown. ${s.concerns} concerns.`);
}

async function runManifest(manifest) {
  progress.innerHTML = "";
  const text = JSON.stringify(manifest);
  const a = assessJrcManifest(manifest, { sha256: await sha256Text(text) });
  const plan = generateAdoptionPlan(a);
  const files = a._report ? { "jrc-report.json": JSON.stringify(a._report, null, 2) + "\n", "JRC-REPORT.md": reportMarkdown(a._report) } : {};
  render(manifestHtml(a, plan) + (Object.keys(files).length ? downloadsHtml(files) : ""), files);
  say(a.summary ? `Manifest assessed: ${a.summary.evidenced_pillars} of ${a.summary.applicable_pillars} pillars evidenced, ${a.summary.errors} errors.` : "The manifest doesn't match the schema.");
}

form.addEventListener("change", (ev) => { if (ev.target.name === "source") showPanel(); });
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  current.controller?.abort();
  const controller = (current.controller = new AbortController());
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  results.setAttribute("aria-busy", "true");
  results.innerHTML = "";
  say("Assessing…");
  try {
    if (mode() === "repository") {
      const ref = form.elements.ref.value.trim();
      await runRepository({ repository: form.elements.repository.value.trim(), ...(ref ? { ref } : {}) }, controller.signal);
      const url = new URL(location.href);
      url.searchParams.set("repo", form.elements.repository.value.trim());
      if (ref) url.searchParams.set("ref", ref); else url.searchParams.delete("ref");
      history.replaceState(null, "", url);
    } else if (mode() === "manifest") {
      await runManifest(await readJsonInput(form.elements.manifest, form.elements.manifestFile, 64 * 1024));
    } else {
      progress.innerHTML = "";
      await runRepository({ snapshot: await readJsonInput(null, form.elements.snapshotFile, 4 * 1024 * 1024) }, controller.signal);
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
    render(errorHtml(err), {}, false);
    say(`Couldn't assess: ${err.message}`);
  } finally {
    button.disabled = false;
  }
});

results.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-download], button[data-copy]");
  if (!btn) return;
  const names = Object.keys(current.files);
  const name = names[Number(btn.dataset.download ?? btn.dataset.copy)];
  const text = current.files[name];
  if (text === undefined) return;
  if (btn.dataset.download !== undefined) {
    const url = URL.createObjectURL(new Blob([text], { type: name.endsWith(".json") ? "application/json" : "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say(`Downloaded ${name}.`);
  } else {
    try { await navigator.clipboard.writeText(text); say(`Copied ${name}.`); }
    catch { say("Copying isn't allowed here; use Download instead."); }
  }
});

const params = new URLSearchParams(location.search);
if (params.get("repo")) form.elements.repository.value = params.get("repo").slice(0, 200);
if (params.get("ref")) form.elements.ref.value = params.get("ref").slice(0, 100);
showPanel();
form.dataset.ready = "true";
