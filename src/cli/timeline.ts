import { spawn } from "node:child_process";
import { connect } from "node:net";
import { get as httpGet } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { buildIdFrom } from "../serve/build-id.js";
import { latestSessionId } from "./sessions.js";

const DEFAULT_PORT = 4317;

export interface ServeLock {
  port: number;
  pid: number;
  build: string;
}

export interface Probe {
  up: boolean;
  build: string | null;
}

export type TimelinePlan =
  | { action: "reuse"; port: number }
  | { action: "spawn"; port: number }
  | { action: "replace"; port: number; pid: number };

// Pure decision. Probe the recorded port (not the recorded pid, which the OS may have
// recycled). Reuse only a server that answers AND reports our build; a build mismatch means a
// stale server is squatting the port, so replace it. Anything else: spawn fresh.
export function timelineDecision(
  lock: ServeLock | null,
  currentBuild: string,
  probe: (port: number) => Probe,
): TimelinePlan {
  if (!lock) return { action: "spawn", port: DEFAULT_PORT };
  const p = probe(lock.port);
  if (!p.up) return { action: "spawn", port: DEFAULT_PORT };
  if (p.build && p.build === currentBuild) return { action: "reuse", port: lock.port };
  return { action: "replace", port: lock.port, pid: lock.pid };
}

// One lock for the whole machine, not per session: a single server serves every session, so a
// server from any earlier session is ours to reuse or replace.
function lockPath(root: string): string {
  return join(root, "serve.lock");
}

function readLock(root: string): ServeLock | null {
  const p = lockPath(root);
  if (!existsSync(p)) return null;
  try {
    const o = JSON.parse(readFileSync(p, "utf8")) as Partial<ServeLock>;
    if (typeof o.port === "number" && typeof o.pid === "number") {
      return { port: o.port, pid: o.pid, build: typeof o.build === "string" ? o.build : "" };
    }
    return null;
  } catch {
    return null;
  }
}

// True if a TCP connection to the local port succeeds within the timeout.
function probePort(port: number, timeoutMs = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host: "127.0.0.1", port });
    const done = (ok: boolean) => { sock.destroy(); resolve(ok); };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

// Ask the running server which build it is. Null if it doesn't answer /health (an old server
// from before this feature), which we treat as stale.
function fetchBuild(port: number, timeoutMs = 500): Promise<string | null> {
  return new Promise((resolve) => {
    const req = httpGet({ host: "127.0.0.1", port, path: "/health", timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(String((JSON.parse(data) as { build?: unknown }).build ?? "") || null); }
        catch { resolve(null); }
      });
    });
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
  });
}

async function waitForPort(port: number, attempts = 20, gapMs = 150): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return false;
}

async function waitForPortFree(port: number, attempts = 20, gapMs = 150): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (!(await probePort(port))) return true;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return false;
}

function killPid(pid: number): void {
  try { process.kill(pid); } catch { /* already gone */ }
}

export async function runTimeline(): Promise<void> {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const root = defaultRoot();
  const currentBuild = buildIdFrom(process.argv[1]);

  const lock = readLock(root);
  let probed: Probe = { up: false, build: null };
  if (lock) {
    const up = await probePort(lock.port);
    probed = { up, build: up ? await fetchBuild(lock.port) : null };
  }
  const plan = timelineDecision(lock, currentBuild, () => probed);

  if (plan.action === "reuse") {
    console.log(`Codey timeline already open at http://localhost:${plan.port}`);
    return;
  }
  if (plan.action === "replace") {
    // A stale server (old build) is holding the port. Stop it and wait for the port to free
    // before we bind, so the new build is what the browser actually talks to.
    killPid(plan.pid);
    await waitForPortFree(plan.port);
  }

  const port = DEFAULT_PORT;
  const self = process.argv[1];
  const child = spawn(process.execPath, [self, "serve", "--session", session, "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  writeFileSync(lockPath(root), JSON.stringify({ port, pid: child.pid ?? 0, build: currentBuild }));

  const ready = await waitForPort(port);
  if (ready) console.log(`Codey timeline at http://localhost:${port}`);
  else console.log(`Codey timeline starting at http://localhost:${port} (give it a moment to open).`);
}
