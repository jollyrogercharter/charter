// Registers the site's read-only JRC tools with WebMCP (document.modelContext) when the browser supports it; otherwise does nothing.
import { runTool, TOOLS } from "/js/lib/capabilities/tools.mjs";
import { configureSite } from "/js/lib/jrc/site-config.mjs";
import { createSession } from "/js/lib/assess/session.mjs";

const DATA_URL = "/webmcp/data.json";
const metaContent = (n) => globalThis.document?.querySelector?.(`meta[name="${n}"]`)?.content;
configureSite({ repoUrl: metaContent("jrc:repo-url"), siteUrl: metaContent("jrc:site-url") });
let bundlePromise = null;

const abortError = (signal) => signal.reason ?? new DOMException("The operation was aborted.", "AbortError");

function untilAborted(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// One same-origin, credential-free fetch per page; a failed load is retried on the next call.
function loadBundle(signal) {
  bundlePromise ??= fetch(DATA_URL, { credentials: "omit" })
    .then((r) => {
      if (!r.ok) throw new Error(`could not load ${DATA_URL} (${r.status})`);
      return r.json();
    })
    .then((b) => {
      if (b?.bundle_version !== "2" || !b.charter || !b.status || !b.ledger || !Array.isArray(b.debates) || !b.opportunities || !b.lexicons) throw new Error(`${DATA_URL} is not a version-2 data bundle`);
      return b;
    })
    .catch((e) => {
      bundlePromise = null;
      throw e;
    });
  return untilAborted(bundlePromise, signal);
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Shared with the /adopt/ page, so a person and an agent assessing the same repository reuse one snapshot.
export const session = createSession({ fetch: (url, opts) => globalThis.fetch(url, opts), sha256: async (bytes) => hex(await crypto.subtle.digest("SHA-256", bytes)) });

// Chrome before 155 could pass input as a JSON string; accept both forms.
function normalizeInput(input) {
  if (typeof input !== "string") return input ?? {};
  if (input.trim() === "") return {};
  try { return JSON.parse(input); } catch { return input; }
}

export function executor(tool) {
  return async (input, options) => {
    const signal = options?.signal;
    try {
      return await runTool(tool, normalizeInput(input), { signal, loadBundle, sha256, session });
    } catch (e) {
      if (signal?.aborted || e?.name === "AbortError") throw e;
      return { ok: false, tool: tool.name, error: { code: "TOOL_FAILED", message: String(e?.message ?? e) } };
    }
  };
}

export async function registerJrcTools(modelContext, { signal } = {}) {
  const outcome = { registered: [], failed: [], controllers: new Map() };
  if (signal?.aborted) {
    outcome.failed = TOOLS.map((t) => ({ name: t.name, error: "AbortError", message: "registration signal was already aborted" }));
    return outcome;
  }
  await Promise.all(TOOLS.map(async (tool) => {
    const controller = new AbortController();
    // The listener is removed when this tool's own controller aborts, so long-lived outer signals don't accumulate listeners.
    signal?.addEventListener("abort", () => controller.abort(signal.reason), { once: true, signal: controller.signal });
    try {
      await modelContext.registerTool(
        { name: tool.name, title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations, execute: executor(tool) },
        { signal: controller.signal },
      );
      outcome.registered.push(tool.name);
      outcome.controllers.set(tool.name, controller);
    } catch (e) {
      outcome.failed.push({ name: tool.name, error: e?.name ?? "Error", message: String(e?.message ?? e) });
    }
  }));
  outcome.registered.sort();
  return outcome;
}

export async function init(doc = globalThis.document) {
  const root = doc?.documentElement;
  const mc = doc?.modelContext;
  if (!mc || typeof mc.registerTool !== "function") {
    if (root) root.dataset.webmcp = "unsupported";
    return { supported: false };
  }
  const outcome = await registerJrcTools(mc);
  if (root) root.dataset.webmcp = outcome.failed.length ? (outcome.registered.length ? "partial" : "failed") : "registered";
  if (outcome.failed.length) console.warn("WebMCP: some JRC tools could not be registered", outcome.failed);
  return { supported: true, ...outcome };
}

if (globalThis.document && !globalThis.__JRC_WEBMCP_NO_AUTO_INIT__) init();
