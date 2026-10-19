#!/usr/bin/env node
// MCP server over stdio for the JRC capabilities: protocol 2026-07-28 (stateless, per-request _meta) plus legacy initialize.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { capabilityManifest } from "../lib/capabilities/manifest.mjs";
import { nodeContext } from "../lib/capabilities/node-runtime.mjs";
import { runTool, TOOLS, TOOLS_VERSION } from "../lib/capabilities/tools.mjs";

export const MODERN = ["2026-07-28"];
// Legacy revisions are served only after `initialize`; batches (2025-03-26) aren't supported, so that revision isn't offered.
export const LEGACY = ["2025-11-25", "2025-06-18"];
const SERVER_INFO = { name: "jolly-roger-charter", title: "Jolly Roger Charter (JRCv1) tools", version: TOOLS_VERSION };
const INSTRUCTIONS = "Read-only and prepare-only tools for the draft Jolly Roger Charter: charter, status, costs, provenance, debates, repository assessment and AT Protocol record preparation. Nothing here posts, publishes or signs in. Results label every fact's basis; null means unknown. JRCv1 is a draft standard, not a certification.";
const META = { "io.modelcontextprotocol/serverInfo": SERVER_INFO };

const manifest = capabilityManifest();
const byName = new Map(manifest.capabilities.map((c) => [c.name, c]));
export const mcpTools = () => TOOLS.map((t) => ({
  name: t.name,
  title: t.title,
  description: t.description,
  inputSchema: t.inputSchema,
  annotations: { title: t.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: byName.get(t.name).network !== "none" },
}));

const rpcError = (id, code, message, data) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } });

export function createServer({ ctx = nodeContext(), log = () => {} } = {}) {
  let legacy = null;
  const inflight = new Map();

  async function handle(msg) {
    if (Array.isArray(msg)) return rpcError(null, -32600, "Batches are not supported");
    if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(null, -32600, "Invalid request");
    const { id, method } = msg;
    if (id !== undefined && !(typeof id === "string" || Number.isInteger(id))) return rpcError(null, -32600, "Request id must be a string or integer");
    const params = msg.params ?? {};
    if (id === undefined) {
      if (method === "notifications/cancelled" && inflight.has(params?.requestId)) inflight.get(params.requestId).abort();
      return null;
    }
    if (method === "initialize") {
      const requested = params.protocolVersion;
      legacy = LEGACY.includes(requested) ? requested : LEGACY[0];
      if (requested === "2025-03-26") log("client requested 2025-03-26; offering 2025-11-25 (batches aren't supported)");
      return { jsonrpc: "2.0", id, result: { protocolVersion: legacy, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: `${INSTRUCTIONS} This server also supports protocol ${MODERN.join(", ")}.` } };
    }
    const meta = params._meta ?? {};
    const modernVersion = meta["io.modelcontextprotocol/protocolVersion"];
    let modern = false;
    if (modernVersion !== undefined || !legacy) {
      const caps = meta["io.modelcontextprotocol/clientCapabilities"];
      if (typeof modernVersion !== "string" || caps === null || typeof caps !== "object" || Array.isArray(caps)) {
        return rpcError(id, -32602, "Missing required _meta fields: io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities");
      }
      if (!MODERN.includes(modernVersion)) return rpcError(id, -32022, `Unsupported protocol version. Per-request versions: ${MODERN.join(", ")}; legacy clients can use initialize (${LEGACY.join(", ")}).`, { supported: MODERN, requested: String(modernVersion).slice(0, 40) });
      modern = true;
    }
    const ok = (result) => ({ jsonrpc: "2.0", id, result: modern ? { resultType: "complete", ...result, _meta: META } : result });
    // The tool list and discovery answer only change when the server is upgraded, so they're cacheable for an hour.
    const cacheable = modern ? { ttlMs: 3600000, cacheScope: "public" } : {};

    if (method === "server/discover") return ok({ supportedVersions: MODERN, capabilities: { tools: {} }, instructions: `${INSTRUCTIONS} Legacy clients may instead send initialize (${LEGACY.join(", ")}).`, ...cacheable });
    if (method === "ping") return ok({});
    if (method === "tools/list") {
      if (params.cursor !== undefined) return rpcError(id, -32602, "Invalid cursor: this server returns every tool in one page");
      return ok({ tools: mcpTools(), ...cacheable });
    }
    if (method === "tools/call") {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (typeof params.name !== "string" || !tool) return rpcError(id, -32602, typeof params.name === "string" ? `Unknown tool: ${params.name.slice(0, 60)}` : "params.name must be a string");
      const args = params.arguments ?? {};
      if (args === null || typeof args !== "object" || Array.isArray(args)) return rpcError(id, -32602, "arguments must be an object");
      if (inflight.has(id)) return rpcError(id, -32600, "A request with this id is already in progress");
      const controller = new AbortController();
      inflight.set(id, controller);
      try {
        const result = await runTool(tool, args, { ...ctx, signal: controller.signal });
        if (controller.signal.aborted) return null;
        return ok({ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok });
      } catch (e) {
        // Cancelled requests get no response, as both protocol eras require.
        if (e?.name === "AbortError" || controller.signal.aborted) return null;
        log(`tool ${tool.name} failed: ${e?.message ?? e}`);
        return ok({ content: [{ type: "text", text: JSON.stringify({ ok: false, tool: tool.name, error: { code: "TOOL_FAILED", message: String(e?.message ?? e).slice(0, 200) } }) }], isError: true });
      } finally {
        if (inflight.get(id) === controller) inflight.delete(id);
      }
    }
    return rpcError(id, -32601, `Method not found: ${method.slice(0, 60)}`);
  }

  return { handle };
}

const MAX_LINE = 2 * 1024 * 1024;

// Splits stdin into lines without ever buffering more than MAX_LINE bytes; oversized lines are dropped as they stream.
export async function* boundedLines(stream, max = MAX_LINE) {
  let parts = [], size = 0, skipping = false;
  for await (const chunk of stream) {
    let start = 0;
    for (let nl = chunk.indexOf(10); ; nl = chunk.indexOf(10, start)) {
      const end = nl === -1 ? chunk.length : nl;
      if (!skipping) {
        size += end - start;
        if (size > max) { skipping = true; parts = []; } else parts.push(chunk.subarray(start, end));
      }
      if (nl === -1) break;
      yield skipping ? null : Buffer.concat(parts).toString("utf8").replace(/\r$/, "");
      parts = []; size = 0; skipping = false; start = nl + 1;
    }
  }
  if (!skipping && size) yield Buffer.concat(parts).toString("utf8");
}

async function serve() {
  const server = createServer({ log: (m) => process.stderr.write(`jrc-mcp: ${m}\n`) });
  const write = (o) => { if (o) process.stdout.write(JSON.stringify(o) + "\n"); };
  for await (const line of boundedLines(process.stdin)) {
    if (line === null) { write(rpcError(null, -32600, "Message too large")); continue; }
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { write(rpcError(null, -32700, "Parse error")); continue; }
    server.handle(msg).then(write, (e) => write(rpcError(msg?.id, -32603, "Internal error", String(e?.message ?? e).slice(0, 200))));
  }
}

const invoked = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (invoked) serve();
