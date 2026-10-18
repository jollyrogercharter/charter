// A stand-in for api.github.com and raw.githubusercontent.com that serves fixture directories in the real response shapes.
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import path from "node:path";

const walk = (root, rel = "") => readdirSync(path.join(root, rel)).sort().flatMap((name) => {
  const p = rel ? `${rel}/${name}` : name;
  const st = lstatSync(path.join(root, p));
  if (st.isSymbolicLink()) return [{ path: p, mode: "120000", type: "blob", size: readlinkSync(path.join(root, p)).length }];
  if (st.isDirectory()) return [{ path: p, mode: "040000", type: "tree" }, ...walk(root, p)];
  return [{ path: p, mode: "100644", type: "blob", size: st.size }];
});

export function fakeGithub(repos, { rateLimited = false, truncated = false, redirectOffsite = false, failRaw = false } = {}) {
  const requests = [];
  const commitOf = (key) => createHash("sha1").update(`commit:${key}`).digest("hex");
  const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });
  const fetch = async (url, opts = {}) => {
    requests.push({ url, method: opts.method ?? "GET", credentials: opts.credentials, accept: opts.headers?.Accept });
    const u = new URL(url);
    if (rateLimited && u.host === "api.github.com") return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } });
    if (u.host === "api.github.com") {
      const m = u.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
      const key = m && `${m[1]}/${m[2]}`;
      const repo = repos[key];
      if (!repo) return json({ message: "Not Found" }, 404);
      const rest = m[3] ?? "";
      if (!rest) return json({ default_branch: "main", private: false, archived: false, fork: false, has_issues: true, has_discussions: false, license: repo.spdx ? { spdx_id: repo.spdx } : null, ...repo.meta });
      if (rest.startsWith("/commits/")) {
        const ref = decodeURIComponent(rest.slice("/commits/".length));
        if (ref !== "main" && ref !== commitOf(key)) return json({ message: "No commit found" }, 422);
        return new Response(commitOf(key), { status: 200 });
      }
      if (rest === `/git/trees/${commitOf(key)}` && u.searchParams.get("recursive") === "1") {
        const tree = walk(repo.dir);
        return json({ sha: "t", truncated, tree: truncated ? tree.slice(0, 2) : tree });
      }
      return json({ message: "Not Found" }, 404);
    }
    if (u.host === "raw.githubusercontent.com") {
      if (redirectOffsite) return Object.defineProperty(new Response("x"), "url", { value: "https://evil.example/x" });
      if (failRaw) return new Response("", { status: 500 });
      const [, owner, name, sha, ...parts] = u.pathname.split("/");
      const key = `${owner}/${name}`;
      if (!repos[key] || sha !== commitOf(key)) return new Response("404", { status: 404 });
      const rel = parts.map(decodeURIComponent).join("/");
      const abs = path.join(repos[key].dir, rel);
      const st = lstatSync(abs);
      return new Response(st.isSymbolicLink() ? readlinkSync(abs) : readFileSync(abs), { status: 200 });
    }
    throw new TypeError(`fake network: ${u.host} is not reachable`);
  };
  return { fetch, requests, commitOf };
}

export const sha256Bytes = async (b) => createHash("sha256").update(b).digest("hex");
