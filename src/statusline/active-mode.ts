import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

// True when any session still has Codey on. Used so turning off the last session can
// take the status line command back out of global settings.
export function anyActiveSession(root: string): boolean {
  if (!existsSync(root)) return false;
  for (const name of readdirSync(root)) {
    if (existsSync(modeFile(join(root, name)))) return true;
  }
  return false;
}
