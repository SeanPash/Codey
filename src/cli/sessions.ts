import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { readCache } from "../timeline/segment-cache.js";
import { readPrompts } from "../capture/prompts.js";
import { readMeta } from "../store/session-meta.js";
import { readFirstPrompt } from "../timeline/transcript.js";
import { sessionDisplayName, projectFrom, sessionColor } from "../timeline/session-name.js";
import { readStatus } from "../statusline/state.js";

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
  name: string;
  project: string | null;  // cwd basename, an at-a-glance terminal tag
  color: string;           // stable color from the id, for recognition
  taskCount: number;
  lastPromptTs: number;
  running: boolean;        // mid-tool or active within the running window (pulsing live)
  open: boolean;           // used recently, so the terminal is probably still open
  live: boolean;           // alias of running, kept for existing callers
}

// Two tiers of liveness. "running" is the pulsing indicator (Claude is actively working or
// just did something); "open" is a generous window where the terminal is likely still up and
// the user may be composing their next prompt.
export const RUNNING_WINDOW_MS = 15_000;
export const OPEN_WINDOW_MS = 30 * 60_000;

export function listSessions(root: string = defaultRoot(), now: number = Date.now()): SessionListItem[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((id) => {
      const dir = join(root, id);
      const evMtime = eventsMtime(dir);
      const cache = readCache(id, root);
      const prompts = readPrompts(dir);
      const meta = readMeta(id, root);
      const lastPromptTs = prompts.length ? prompts[prompts.length - 1] : 0;
      // Activity is the freshest of a captured tool call or a submitted prompt, so a session
      // counts as live the moment it is prompted, before any tool has run.
      const lastActivity = Math.max(evMtime ?? 0, lastPromptTs);
      const mtime = evMtime ?? statSync(dir).mtimeMs;
      const name = sessionDisplayName({
        firstChunkName: cache?.chunks?.[0]?.name ?? null,
        firstPrompt: readFirstPrompt(meta?.transcriptPath ?? null),
        sessionId: id,
        mtimeMs: mtime,
      });
      // "thinking" covers the gap when Claude is working but hasn't emitted a tool call for
      // more than RUNNING_WINDOW_MS: a prompt newer than the last stop means it is still live.
      const status = readStatus(dir);
      const thinking = evMtime != null && status?.promptAt != null && status.promptAt > (status.doneAt ?? 0);
      const recentActivity = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
      const running = evMtime != null && (thinking || recentActivity);
      return {
        id,
        mtime,
        name,
        project: projectFrom(meta?.cwd ?? null),
        color: sessionColor(id),
        taskCount: cache?.chunks?.length ?? 0,
        lastPromptTs,
        running,
        open: lastActivity > 0 && now - lastActivity < OPEN_WINDOW_MS,
        live: running,
        // carried only for the filter below; not part of the public shape
        _hasEvents: evMtime != null,
        _lastActivity: lastActivity,
      } as SessionListItem & { _hasEvents: boolean; _lastActivity: number };
    })
    // Real terminals only: a session must have captured at least one tool call (events.jsonl).
    // This drops the phantom folders that headless narration or the global prompt hook creates
    // without ever running a tool.
    .filter((s) => s._hasEvents)
    .map(({ _hasEvents, _lastActivity, ...s }) => s)
    .sort((a, b) => b.mtime - a.mtime);
}
