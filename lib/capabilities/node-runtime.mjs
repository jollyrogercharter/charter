// The Node context every non-browser interface uses (CLI, MCP server, tests): local data, Node hashing, a GitHub session.
import { createSession } from "../assess/session.mjs";
import { sha256Hex } from "../jrc/check.mjs";
import { loadNodeBundle } from "./node-bundle.mjs";
import { runTool, TOOLS } from "./tools.mjs";

export function nodeContext({ root, fetch = globalThis.fetch } = {}) {
  let bundle;
  const sha256 = async (data) => sha256Hex(data);
  return {
    loadBundle: async () => (bundle ??= loadNodeBundle(root)),
    sha256,
    session: createSession({ fetch, sha256 }),
  };
}

export async function callTool(name, input, ctx, signal) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  return runTool(tool, input, { ...ctx, signal });
}
