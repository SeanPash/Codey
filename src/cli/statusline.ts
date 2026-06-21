import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { readStatus, type StatusSnapshot } from "../statusline/state.js";
import { composeView } from "../statusline/compose.js";
import { renderStatus } from "../statusline/render.js";
import { defaultRoot } from "../store/session-store.js";
import { latestSessionId } from "./sessions.js";
import type { ToolEvent } from "../types.js";

const DWELL_MS = 4500;

function readEvents(dir: string): ToolEvent[] {
  const p = join(dir, "events.jsonl");
  if (!existsSync(p)) return [];
  const out: ToolEvent[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as ToolEvent); } catch { /* partial line */ }
  }
  return out;
}

export function statusLineFor(dir: string, now = Date.now(), dwellMs = DWELL_MS): string {
  if (!existsSync(dir)) return "";
  const snap: StatusSnapshot = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  return renderStatus(composeView(readEvents(dir), snap, now, dwellMs));
}

// Claude Code calls this on its own refresh cadence; we fall back to the most recent session.
export function runStatusLine(): void {
  const session = latestSessionId();
  if (!session) { process.stdout.write(""); return; }
  process.stdout.write(statusLineFor(join(defaultRoot(), session)));
}
