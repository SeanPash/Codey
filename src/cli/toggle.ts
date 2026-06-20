import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { Mode } from "../types.js";

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

export function turnOn(mode: Mode, session: string): void {
  const self = process.argv[1];
  writeSettings(withStatusLine(readSettings(), statusLineCommand(self)));
  // windowsHide stops the detached narrator from popping its own console window.
  const child = spawn(process.execPath, [self, "narrate", "--mode", mode, "--session", session], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

export function turnOff(): void {
  writeSettings(withoutStatusLine(readSettings()));
  // The narrator is detached; it exits on its own when the session ends. A pidfile-based
  // stop can be added if lingering processes turn out to be a problem.
}
