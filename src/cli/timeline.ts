import { spawn } from "node:child_process";
import { connect } from "node:net";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";

const DEFAULT_PORT = 4317;

export interface ServeLock {
  port: number;
  pid: number;
}

export interface TimelinePlan {
  reuse: boolean;
  port: number;
}

// Pure decision: reuse a recorded server only if something is actually answering on its
// port; otherwise plan a fresh spawn on the default port. Probing the port (rather than the
// recorded pid) avoids reusing a dead server whose pid was recycled by the OS.
export function timelineDecision(lock: ServeLock | null, isPortUp: (port: number) => boolean): TimelinePlan {
  if (lock && isPortUp(lock.port)) return { reuse: true, port: lock.port };
  return { reuse: false, port: DEFAULT_PORT };
}

function lockPath(dir: string): string {
  return join(dir, "serve.lock");
}

function readLock(dir: string): ServeLock | null {
  const p = lockPath(dir);
  if (!existsSync(p)) return null;
  try {
    const o = JSON.parse(readFileSync(p, "utf8")) as Partial<ServeLock>;
    if (typeof o.port === "number" && typeof o.pid === "number") return { port: o.port, pid: o.pid };
    return null;
  } catch {
    return null;
  }
}

// True if a TCP connection to the local port succeeds within the timeout: a real "is the
// timeline actually serving" check, not just "is some process alive".
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

async function waitForPort(port: number, attempts = 20, gapMs = 150): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await probePort(port)) return true;
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return false;
}

export async function runTimeline(): Promise<void> {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const dir = join(defaultRoot(), session);

  const lock = readLock(dir);
  const up = lock ? await probePort(lock.port) : false;
  const plan = timelineDecision(lock, () => up);

  if (plan.reuse) {
    console.log(`Codey timeline already open at http://localhost:${plan.port}`);
    return;
  }

  const self = process.argv[1];
  const child = spawn(process.execPath, [self, "serve", "--session", session, "--port", String(plan.port)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  writeFileSync(lockPath(dir), JSON.stringify({ port: plan.port, pid: child.pid ?? 0 }));

  // Only claim it is ready once the port actually answers, so we never hand out a URL the
  // browser would refuse.
  const ready = await waitForPort(plan.port);
  if (ready) console.log(`Codey timeline at http://localhost:${plan.port}`);
  else console.log(`Codey timeline starting at http://localhost:${plan.port} (give it a moment to open).`);
}
