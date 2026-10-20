// Renders site/assets/og/*.png and the touch icon from site/_data/og.json with local headless Chrome; `npm run og`.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "site/assets/og";
const PORT = 9334;
const cards = JSON.parse(readFileSync("site/_data/og.json", "utf8"));
const flag = readFileSync("site/assets/flag.svg", "utf8").replace(/<title[^>]*>.*?<\/title>/s, "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE = `*{margin:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#16202e;color:#f7f2e8}
.serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif}
.sans{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}`;

const cardHtml = ({ title, line }) => `<!doctype html><meta charset="utf-8"><style>${BASE}
body{display:flex;flex-direction:column;padding:64px 80px 56px}
.top{display:flex;align-items:center;gap:28px}.top svg{width:150px;height:105px}
.kicker{font-size:26px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#f08a7e}
h1{font-size:${title.length > 24 ? 76 : 92}px;line-height:1.05;margin-top:auto;font-weight:700}
p{font-size:36px;line-height:1.35;color:#d9d0bf;margin-top:24px;max-width:1040px}
.foot{display:flex;justify-content:space-between;margin-top:auto;padding-top:28px;border-top:2px solid #3a4556;font-size:24px;color:#b9b0a0}</style>
<body><div class="top">${flag}<span class="kicker sans">Jolly Roger Charter</span></div>
<h1 class="serif">${esc(title)}</h1><p class="serif">${esc(line)}</p>
<div class="foot sans"><span>jollyrogercharter.org</span><span>A proposal, open for debate</span></div></body>`;

const iconHtml = `<!doctype html><meta charset="utf-8"><style>${BASE}body{display:flex;align-items:center;justify-content:center}svg{width:156px;height:109px}</style><body>${flag}</body>`;

const profile = mkdtempSync(path.join(tmpdir(), "jrc-og-"));
const chrome = spawn(CHROME, ["--headless=new", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, "about:blank"], { stdio: "ignore" });
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch { await sleep(200); }
  }
  if (!target) throw new Error(`Chrome didn't start; set CHROME to its binary (tried ${CHROME})`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (m) => { const msg = JSON.parse(m.data); pending.get(msg.id)?.(msg); pending.delete(msg.id); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  const frameId = (await send("Page.getFrameTree")).result.frameTree.frame.id;
  const shoot = async (html, width, height, file) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await send("Page.setDocumentContent", { frameId, html });
    await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    console.log(`wrote ${file}`);
  };
  mkdirSync(OUT, { recursive: true });
  for (const card of Object.values(cards)) await shoot(cardHtml(card), 1200, 630, path.join(OUT, card.file));
  await shoot(iconHtml, 180, 180, "site/assets/apple-touch-icon.png");
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
