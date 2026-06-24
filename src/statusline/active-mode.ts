import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readMeta } from "../store/session-meta.js";
import type { Mode } from "../types.js";

// Codey is on per session, not globally. Each terminal/tab is its own Claude Code
// session, so the on/off choice lives in that session's folder. A brand new tab has
// no mode file and therefore shows nothing until the user turns Codey on in it.
function modeFile(sessionDir: string): string {
  return join(sessionDir, "mode");
}

export function writeSessionMode(mode: Mode, sessionDir: string): void {
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(modeFile(sessionDir), mode);
}

export function clearSessionMode(sessionDir: string): void {
  rmSync(modeFile(sessionDir), { force: true });
}

// Returns null when Codey is off for this session so the status line stays blank.
export function readSessionMode(sessionDir: string): Mode | null {
  const p = modeFile(sessionDir);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8").trim();
  return raw === "simple" || raw === "deep" || raw === "teach" || raw === "ask" ? raw : null;
}

// The most recent file activity in a session dir, used to rank candidates for inheritance.
// /clear and resume make a new session id, so the just-left session has the freshest mtime.
function lastActive(dir: string): number {
  let t = 0;
  for (const f of ["events.jsonl", "prompts.jsonl", "mode"]) {
    try { t = Math.max(t, statSync(join(dir, f)).mtimeMs); } catch { /* missing file */ }
  }
  return t;
}

// Only carry a mode forward from a session that was active this recently. This is the line
// between a real continuation (a /clear or resume, where the prior session was active seconds
// ago) and just opening a fresh terminal in a project where Codey happened to be on once. The
// latter should start OFF, so viewing the timeline or typing any command never lights up
// narration on its own; the user opts in explicitly with /codey:simple|deep|teach.
const INHERIT_WINDOW_MS = 10 * 60_000;

// Carry Codey's mode across a /clear or resume, which start a new session id in the same
// directory. Returns the mode of the most recently active prior session sharing this cwd that
// still has Codey on AND was active within INHERIT_WINDOW_MS, or null otherwise. The caller only
// applies this on a session's first prompt, so turning Codey off later is never undone.
export function inheritedMode(cwd: string | null, excludeId: string, root: string, now: number = Date.now()): Mode | null {
  if (!cwd || !existsSync(root)) return null;
  let best: { mode: Mode; at: number } | null = null;
  for (const name of readdirSync(root)) {
    if (name === excludeId) continue;
    const dir = join(root, name);
    const mode = readSessionMode(dir);
    if (!mode) continue;
    if (readMeta(name, root)?.cwd !== cwd) continue;
    const at = lastActive(dir);
    if (!best || at > best.at) best = { mode, at };
  }
  if (!best) return null;
  // A prior session that has been idle past the window is treated as stale: start off and wait
  // for an explicit opt-in rather than resurrecting an old mode in a brand-new terminal.
  if (now - best.at > INHERIT_WINDOW_MS) return null;
  return best.mode;
}

// True when any session still has Codey on. Used so turning off the last session can
// take the status line command back out of global settings.
export function anyActiveSession(root: string): boolean {
  if (!existsSync(root)) return false;
  for (const name of readdirSync(root)) {
    if (existsSync(modeFile(join(root, name)))) return true;
  }
  return false;
}
