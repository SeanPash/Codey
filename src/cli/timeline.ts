import { spawn } from "node:child_process";
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

// Pure decision: reuse a recorded server only if its process is still alive; otherwise
// plan a fresh spawn on the default port.
export function timelineDecision(lock: ServeLock | null, isAlive: (pid: number) => boolean): TimelinePlan {
  if (lock && isAlive(lock.pid)) return { reuse: true, port: lock.port };
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

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function runTimeline(): void {
  const session = latestSessionId();
  if (!session) { console.error("No Codey sessions found yet."); process.exit(1); }
  const dir = join(defaultRoot(), session);
  const plan = timelineDecision(readLock(dir), alive);

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
  console.log(`Codey timeline at http://localhost:${plan.port}`);
}
