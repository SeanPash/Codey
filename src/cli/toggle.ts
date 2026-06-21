import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Mode } from "../types.js";
import { defaultRoot } from "../store/session-store.js";
import { patchStatus } from "../statusline/state.js";

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

function pidPath(): string {
  return join(defaultRoot(), "narrator.pid");
}

// Stop a previously-spawned narrator so modes never fight over the same file.
export function stopNarrator(path: string, kill: (pid: number) => void = (pid) => process.kill(pid)): void {
  if (!existsSync(path)) return;
  const pid = Number(readFileSync(path, "utf8").trim());
  if (pid > 0) { try { kill(pid); } catch { /* already gone */ } }
}

export function turnOn(mode: Mode, session: string): void {
  const self = process.argv[1];
  stopNarrator(pidPath());
  mkdirSync(join(defaultRoot(), session), { recursive: true });
  patchStatus(join(defaultRoot(), session), { mode }); // show the new mode on the next render, instantly
  writeSettings(withStatusLine(readSettings(), statusLineCommand(self)));
  // detached lets the narrator outlive the slash command's process tree (Claude Code kills
  // that tree when the command returns). stdio "ignore" means no console handles, and
  // windowsHide suppresses any console window; the claude calls it makes are hidden too.
  const child = spawn(process.execPath, [self, "narrate", "--mode", mode, "--session", session], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  mkdirSync(defaultRoot(), { recursive: true });
  writeFileSync(pidPath(), String(child.pid ?? ""));
}

export function turnOff(): void {
  stopNarrator(pidPath());
  writeSettings(withoutStatusLine(readSettings()));
}
