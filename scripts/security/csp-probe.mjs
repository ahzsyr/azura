/**
 * Minimal CDP driver (no dependencies) to load a page in headless Chrome and
 * collect console/CSP violations + uncaught page errors.
 *
 * Usage: node scripts/security/csp-probe.mjs <url> [--wait-ms N]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2];
const waitIdx = process.argv.indexOf("--wait-ms");
const waitMs = waitIdx > -1 ? Number(process.argv[waitIdx + 1]) : 6000;
if (!url) {
  console.error("usage: csp-probe.mjs <url> [--wait-ms N]");
  process.exit(2);
}

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "csp-probe-"));
const port = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-background-networking",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

function cleanup(code) {
  try {
    chrome.kill("SIGKILL");
  } catch {
    /* ignore */
  }
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  process.exit(code);
}

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("devtools did not start");
}

const events = { csp: [], console: [], exceptions: [], failedRequests: [] };

const wsUrl = await waitForDevtools();
const ws = new WebSocket(wsUrl);
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  const payload = JSON.stringify({ id, method, params });
  if (socketOpen) rawSend(payload);
  else queued.push(payload);
  return new Promise((resolve) => pending.set(id, resolve));
}

// Queue sends until the socket is open.
let socketOpen = false;
const queued = [];
const rawSend = (payload) => ws.send(payload);
ws.addEventListener("open", () => {
  socketOpen = true;
  for (const p of queued) rawSend(p);
  queued.length = 0;
});

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Log.entryAdded") {
    const e = msg.params.entry;
    if (e.source === "security" || /Content Security Policy/i.test(e.text ?? "")) {
      events.csp.push(e.text);
    } else if (e.level === "error" || e.level === "warning") {
      events.console.push(`[${e.level}] ${e.text}`);
    }
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    events.exceptions.push(d.exception?.description ?? d.text);
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ");
    if (/Content Security Policy/i.test(text) || msg.params.type === "error") {
      (msg.type === "error" ? events.console : events.csp).push(text);
    }
  }
  if (msg.method === "Network.loadingFailed") {
    events.failedRequests.push(`${msg.params.errorText} (${msg.params.blockedReason ?? "n/a"})`);
  }
});

if (!socketOpen) await new Promise((r) => ws.addEventListener("open", r, { once: true }));
await send("Log.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Page.enable");
await send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, waitMs));

console.log(JSON.stringify({
  url,
  cspViolations: events.csp,
  pageErrors: events.console,
  uncaughtExceptions: events.exceptions,
  failedRequests: events.failedRequests,
}, null, 2));
cleanup(0);
