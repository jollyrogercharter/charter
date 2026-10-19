#!/usr/bin/env node
// MCP server over stdio for the JRC capabilities: protocol 2026-07-28 (stateless, per-request _meta) plus legacy initialize.
import { realpathSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { capabilityManifest } from "../lib/capabilities/manifest.mjs";
import { nodeContext } from "../lib/capabilities/node-runtime.mjs";
import { runTool, TOOLS, TOOLS_VERSION } from "../lib/capabilities/tools.mjs";

export const MODERN = ["2026-07-28"];
export const LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26"];
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
    if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(msg?.id, -32600, "Invalid request");
    const { id, method } = msg;
    const params = msg.params ?? {};
    if (id === undefined) {
      if (method === "notifications/cancelled" && inflight.has(params.requestId)) inflight.get(params.requestId).abort();
      return null;
    }
    if (method === "initialize") {
      const requested = params.protocolVersion;
      legacy = LEGACY.includes(requested) ? requested : LEGACY[0];
      return { jsonrpc: "2.0", id, result: { protocolVersion: legacy, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: `${INSTRUCTIONS} This server also supports protocol ${MODERN.join(", ")}.` } };
    }
    const meta = params._meta ?? {};
    const modernVersion = meta["io.modelcontextprotocol/protocolVersion"];
    let modern = false;
    if (modernVersion !== undefined || !legacy) {
      if (typeof modernVersion !== "string" || typeof meta["io.modelcontextprotocol/clientCapabilities"] !== "object" || meta["io.modelcontextprotocol/clientCapabilities"] === null) {
        return rpcError(id, -32602, "Missing required _meta fields: io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities");
      }
      if (!MODERN.includes(modernVersion)) return rpcError(id, -32022, "Unsupported protocol version", { supported: [...MODERN, ...LEGACY], requested: modernVersion });
      modern = true;
    }
    const ok = (result) => ({ jsonrpc: "2.0", id, result: modern ? { resultType: "complete", ...result, _meta: META } : result });

    if (method === "server/discover") return ok({ supportedVersions: [...MODERN, ...LEGACY], capabilities: { tools: {} }, instructions: INSTRUCTIONS });
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: mcpTools() });
    if (method === "tools/call") {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (typeof params.name !== "string" || !tool) return rpcError(id, -32602, `Unknown tool: ${String(params.name).slice(0, 60)}`);
      const args = params.arguments ?? {};
      if (args === null || typeof args !== "object" || Array.isArray(args)) return rpcError(id, -32602, "arguments must be an object");
      const controller = new AbortController();
      inflight.set(id, controller);
      try {
        const result = await runTool(tool, args, { ...ctx, signal: controller.signal });
        return ok({ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.ok });
      } catch (e) {
        if (e?.name === "AbortError") return rpcError(id, -32800, "Request cancelled");
        log(`tool ${tool.name} failed: ${e?.message ?? e}`);
        return ok({ content: [{ type: "text", text: JSON.stringify({ ok: false, tool: tool.name, error: { code: "TOOL_FAILED", message: String(e?.message ?? e).slice(0, 200) } }) }], isError: true });
      } finally {
        inflight.delete(id);
      }
    }
    return rpcError(id, -32601, `Method not found: ${method.slice(0, 60)}`);
  }

  return { handle };
}

async function serve() {
  const server = createServer({ log: (m) => process.stderr.write(`jrc-mcp: ${m}\n`) });
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const write = (o) => { if (o) process.stdout.write(JSON.stringify(o) + "\n"); };
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (line.length > 2 * 1024 * 1024) { write(rpcError(null, -32600, "Message too large")); continue; }
    let msg;
    try { msg = JSON.parse(line); } catch { write(rpcError(null, -32700, "Parse error")); continue; }
    server.handle(msg).then(write, (e) => write(rpcError(msg?.id, -32603, "Internal error", String(e?.message ?? e).slice(0, 200))));
  }
}

const invoked = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (invoked) serve();
