import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Mode } from "../types.js";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";
import { writeSessionMode, clearSessionMode, anyActiveSession } from "../statusline/active-mode.js";
import { clearBudget } from "../budget/budget.js";

type Settings = Record<string, unknown> & { statusLine?: { type: string; command: string } };

export function withStatusLine(s: Settings, command: string): Settings {
  return { ...s, statusLine: { type: "command", command } };
}

export function withoutStatusLine(s: Settings): Settings {
  const next = { ...s };
  delete next.statusLine;
  return next;
}

function settingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

function readSettings(): Settings {
  const p = settingsPath();
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, "utf8")) as Settings; } catch { return {}; }
}

function writeSettings(s: Settings): void {
  const p = settingsPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(s, null, 2));
}

// Point the status line at the exact CLI file that is running right now, rather
// than guessing a plugin root from an env var that isn't set in this child process.
function statusLineCommand(self: string): string {
  return `node "${self}" statusline`;
}

// Wire the status line into global settings without turning on a mode. Opening the timeline
// calls this so the HUD area exists and can show the "run a mode" nudge; a real `on` later just
// overwrites the same command. Idempotent: leaves an existing status line alone.
export function ensureStatusLine(self: string): void {
  const s = readSettings();
  if (!s.statusLine) writeSettings(withStatusLine(s, statusLineCommand(self)));
}

// One narrator per session, so two terminals can run Codey without fighting over a
// single shared pidfile.
function pidPath(sessionDir: string): string {
  return join(sessionDir, "narrator.pid");
}

// Stop a previously-spawned narrator so modes never fight over the same file.
export function stopNarrator(path: string, kill: (pid: number) => void = (pid) => process.kill(pid)): void {
  if (!existsSync(path)) return;
  const pid = Number(readFileSync(path, "utf8").trim());
  if (pid > 0) { try { kill(pid); } catch { /* already gone */ } }
  // Clear the pidfile so a later toggle never signals a reused, unrelated PID.
  rmSync(path, { force: true });
}

export function turnOn(mode: Mode, session: string): void {
  const self = process.argv[1];
  const dir = join(defaultRoot(), session);
  mkdirSync(dir, { recursive: true });
  stopNarrator(pidPath(dir));
  writeSessionMode(mode, dir); // marks this session on, and stores its mode for the status line
  // Switching modes starts clean: seed the new mode and drop the previous turn's recap, explanation,
  // action, and done-stamp so the line reads as the new mode at once instead of carrying old text over.
  patchStatus(dir, { mode, why: null, action: null, warning: null, doneAt: null });
  writeSettings(withStatusLine(readSettings(), statusLineCommand(self)));
  // detached lets the narrator outlive the slash command's process tree (Claude Code kills
  // that tree when the command returns). windowsHide suppresses any console window. stdout and
  // stderr go to narrator.log (not /dev/null) so a crash or an uncaught error in the detached
  // process is captured instead of vanishing; stdin stays closed.
  const logFd = openSync(join(dir, "narrator.log"), "a");
  const child = spawn(process.execPath, [self, "narrate", "--mode", mode, "--session", session], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  writeFileSync(pidPath(dir), String(child.pid ?? ""));
}

export function turnOff(session: string): void {
  const dir = join(defaultRoot(), session);
  stopNarrator(pidPath(dir));
  clearBudget(dir); // a fresh `on` should start uncapped
  clearSessionMode(dir);
  // Leave the status line command installed while any other session is still using it;
  // pull it from global settings only once Codey is fully off everywhere.
  if (!anyActiveSession(defaultRoot())) writeSettings(withoutStatusLine(readSettings()));
}
