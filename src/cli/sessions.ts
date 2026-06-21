import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";

// The mtime of a session's events.jsonl, or null if it has none. This is the real
// activity signal: the capture hook appends to it on every tool call. We can't use the
// directory mtime, because on Windows writing file content doesn't bump it, and the
// prompt hook creates an empty folder for every Claude Code session anywhere.
function eventsMtime(sessionDir: string): number | null {
  const p = join(sessionDir, "events.jsonl");
  return existsSync(p) ? statSync(p).mtimeMs : null;
}

// The current session is whichever one captured a tool call most recently. on/off are
// invoked through a tool call, so the live session always has the freshest events file.
// Sessions that never captured anything (empty folders) only matter as a fallback.
export function latestSessionId(root: string = defaultRoot()): string | null {
  if (!existsSync(root)) return null;
  const names = readdirSync(root);
  if (names.length === 0) return null;

  const active = names
    .map((name) => ({ name, mtime: eventsMtime(join(root, name)) }))
    .filter((s): s is { name: string; mtime: number } => s.mtime !== null)
    .sort((a, b) => b.mtime - a.mtime);
  if (active.length > 0) return active[0].name;

  // No session has captured events yet: fall back to the newest folder so a brand-new
  // session still resolves before its first tool call lands.
  return names
    .map((name) => ({ name, mtime: statSync(join(root, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
}

export interface SessionListItem {
  id: string;
  mtime: number;
}

export function listSessions(root: string = defaultRoot()): SessionListItem[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ id: name, mtime: statSync(join(root, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}
