import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { readCache } from "../timeline/segment-cache.js";
import { readPrompts } from "../capture/prompts.js";
import { readMeta } from "../store/session-meta.js";
import { readFirstPrompt } from "../timeline/transcript.js";
import { sessionDisplayName, projectFrom, sessionColor } from "../timeline/session-name.js";
import { readCustomName } from "../store/session-name-store.js";
import { readSaved } from "../store/session-saved-store.js";
import { readTokens } from "../store/session-tokens-store.js";
import { readStatus } from "../statusline/state.js";
import { readGroupsForSessions, type SessionGroupRef } from "../store/session-group-store.js";

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
  acted: boolean;          // has captured at least one tool call (false = prompted, no work yet)
  live: boolean;           // alias of running, kept for existing callers
  saved: boolean;          // user bookmarked this terminal (durable, server-side)
  groups: SessionGroupRef[]; // user-created groups this session belongs to; separate from saved
  tokens: number;          // persisted work-token total, for the "Most tokens" sort (0 if never opened)
  day: string;             // "Today", "Yesterday", or a locale date string
}

// Two tiers of liveness. "running" is the pulsing indicator (Claude is actively working or
// just did something); "open" is a generous window where the terminal is likely still up and
// the user may be composing their next prompt.
export const RUNNING_WINDOW_MS = 15_000;
// "Open" drives the Active Terminals grid ("terminals open right now"). A clean close fires
// SessionEnd and drops the tile at once; this window is only the backstop for a terminal that
// was force-closed or crashed without firing it. Keep it short so a dead terminal does not
// linger in the grid: long enough to cover composing the next prompt, not half an hour.
export const OPEN_WINDOW_MS = 10 * 60_000;
// A pure thinking gap (prompt submitted, no tool call yet, no Stop) is short in practice.
// Bounding it keeps a terminal that was closed mid-turn, which never fired Stop, from
// counting as running forever and inflating the live count.
export const THINKING_WINDOW_MS = 3 * 60_000;
// How long a turn may run before we assume the terminal crashed mid-response. Claude can work a
// single prompt for many minutes (a long build, a deep edit pass), so this is deliberately
// generous: it is only a backstop for a terminal that died without firing Stop or SessionEnd.
// The real "turn over" signals (doneAt, a cancel marker, closedAt) end the live state at once and
// are checked by every caller, so this never cuts a genuine turn short on a timer.
export const TURN_BACKSTOP_MS = 30 * 60_000;

// A turn is in flight when the latest prompt is newer than the last Stop (doneAt), so Claude has a
// response underway. Once a tool has fired we do not end that on a short timer: a long turn whose
// tools keep firing stays live because the backstop is measured from the latest activity, not the
// prompt. But a prompt that never reached its first tool (a pure thinking gap) is bounded tighter,
// so a turn cancelled or crashed before any tool ran self-heals in minutes, not half an hour. That
// is the common "I pressed Esc and it still shows live" case: no Stop hook fires and often no cancel
// marker is written, so this shorter bound is what drops it. Callers still check the authoritative
// off-signals (doneAt past the last signal, a cancel marker, closedAt) separately, and those clear
// it at once when present. toolActivity is the last tool-event time (defaults to lastActivity for
// callers that already fold it in); it is what tells a pure thinking gap from real work.
export function turnInFlight(
  promptAt: number | null | undefined,
  doneAt: number | null | undefined,
  lastActivity: number,
  now: number,
  toolActivity: number = lastActivity,
): boolean {
  if (promptAt == null || promptAt <= (doneAt ?? 0)) return false;
  // A tool fired on or after this prompt: real work is underway, so keep it live for the generous
  // backstop measured from the latest activity.
  if (toolActivity >= promptAt) return now - Math.max(promptAt, lastActivity) < TURN_BACKSTOP_MS;
  // No tool since the prompt: this is a pure thinking gap, bounded short so a dead turn drops soon.
  return now - promptAt < THINKING_WINDOW_MS;
}

// Returns "Today", "Yesterday", or the locale date string for older sessions.
// Based on calendar day boundaries, not a rolling 24h window.
export function dayBucket(mtime: number, now: number): string {
  // Strip to midnight of each day in local time by comparing date strings.
  const d = new Date(mtime);
  const n = new Date(now);
  const mtimeDay = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const nowDay   = `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
  if (mtimeDay === nowDay) return "Today";
  // Check yesterday: midnight of now minus one day
  const yesterday = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1);
  const yDay = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (mtimeDay === yDay) return "Yesterday";
  return d.toLocaleDateString();
}

export function listSessions(root: string = defaultRoot(), now: number = Date.now()): SessionListItem[] {
  if (!existsSync(root)) return [];
  const groupsBySession = readGroupsForSessions(root);
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
        customName: readCustomName(dir),
      });
      // "thinking" covers the gap when Claude is working but hasn't emitted a tool call for
      // more than RUNNING_WINDOW_MS: a prompt newer than the last stop means it is still live.
      const status = readStatus(dir);
      const thinking = evMtime != null && turnInFlight(status?.promptAt, status?.doneAt, lastActivity, now, evMtime ?? 0);
      const recentActivity = lastActivity > 0 && now - lastActivity < RUNNING_WINDOW_MS;
      // A SessionEnd stamp newer than the last activity means the terminal closed; drop it from
      // the live/open tiers at once instead of waiting out the window. A resume bumps activity
      // back above the stamp, so the session can light up again.
      const closed = status?.closedAt != null && status.closedAt >= lastActivity;
      // doneAt (the Stop hook) newer than every signal means the turn finished: stop pulsing now
      // rather than lingering through the recent-activity window. A fresh prompt/tool relights it.
      const lastSignal = Math.max(lastActivity, status?.promptAt ?? 0);
      const finished = status?.doneAt != null && status.doneAt >= lastSignal;
      const running = evMtime != null && !closed && !finished && (thinking || recentActivity);
      return {
        id,
        mtime,
        name,
        project: projectFrom(meta?.cwd ?? null),
        color: sessionColor(id),
        taskCount: cache?.chunks?.length ?? 0,
        lastPromptTs,
        running,
        open: !closed && lastActivity > 0 && now - lastActivity < OPEN_WINDOW_MS,
        acted: evMtime != null,
        live: running,
        saved: readSaved(dir),
        groups: groupsBySession.get(id) ?? [],
        tokens: readTokens(dir),
        day: dayBucket(mtime, now),
        // carried only for the filter below; not part of the public shape
        _hasEvents: evMtime != null,
        _lastActivity: lastActivity,
      } as SessionListItem & { _hasEvents: boolean; _lastActivity: number };
    })
    // A session lists when it has captured a tool call (real work, kept forever) or when it was
    // prompted recently (within the open window) even before any tool ran, so a terminal the user
    // just opened and said "hi" in still shows up, dimmed. Ancient prompt-only folders and truly
    // empty ones (phantoms from the global hooks) fall outside the window and stay hidden.
    .filter((s) => s._hasEvents || (s._lastActivity > 0 && now - s._lastActivity < OPEN_WINDOW_MS))
    .map(({ _hasEvents, _lastActivity, ...s }) => s)
    .sort((a, b) => b.mtime - a.mtime);
}
