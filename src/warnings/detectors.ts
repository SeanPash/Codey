import type { ToolEvent, Warning } from "../types.js";

// Longest trailing run of identical tool+inputHash among "pre" events.
export function detectLoop(events: ToolEvent[], threshold: number): Warning | null {
  const pres = events.filter((e) => e.phase === "pre");
  if (pres.length === 0) return null;
  const last = pres[pres.length - 1];
  const key = last.tool + "|" + last.inputHash;
  let count = 0;
  for (let i = pres.length - 1; i >= 0; i--) {
    if (pres[i].tool + "|" + pres[i].inputHash === key) count++;
    else break;
  }
  if (count < threshold) return null;
  return { kind: "loop", tool: last.tool, count,
    message: `Claude has tried this same step ${count} times - it might be stuck.`,
    timestamp: last.timestamp };
}

// Trailing run of same tool + same errorText among erroring "post" events.
export function detectRepeatError(events: ToolEvent[], threshold: number): Warning | null {
  const errs = events.filter((e) => e.phase === "post" && e.isError);
  if (errs.length === 0) return null;
  const last = errs[errs.length - 1];
  const key = last.tool + "|" + (last.errorText ?? "");
  let count = 0;
  for (let i = errs.length - 1; i >= 0; i--) {
    if (errs[i].tool + "|" + (errs[i].errorText ?? "") === key) count++;
    else break;
  }
  if (count < threshold) return null;
  return { kind: "repeat_error", tool: last.tool, count,
    message: `${last.tool} keeps failing with the same error.`,
    timestamp: last.timestamp };
}

// A hang means the session has gone quiet, not just that one step is slow. We measure idle
// time from the last activity (the newest event), not from when a call opened, so a big
// request that keeps producing events never looks hung. Only real silence past a tool's
// per-tool threshold does. lastActivityTs defaults to the newest open call, so callers that
// don't track activity keep the old "elapsed since the call" behavior.
export function detectHang(
  openCalls: ToolEvent[],
  now: number,
  thresholdFor: (tool: string) => number,
  lastActivityTs?: number,
): Warning | null {
  if (openCalls.length === 0) return null;
  const since = lastActivityTs ?? Math.max(...openCalls.map((c) => c.timestamp));
  const idle = now - since;
  for (const call of openCalls) {
    if (idle >= thresholdFor(call.tool)) {
      return { kind: "hang", tool: call.tool, count: Math.floor((now - call.timestamp) / 1000),
        message: `This step (${call.tool}) is taking unusually long.`,
        timestamp: call.timestamp };
    }
  }
  return null;
}
