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

// Any open call older than thresholdMs (oldest first) becomes a hang warning.
export function detectHang(openCalls: ToolEvent[], now: number, thresholdMs: number): Warning | null {
  for (const call of openCalls) {
    const elapsed = now - call.timestamp;
    if (elapsed >= thresholdMs) {
      return { kind: "hang", tool: call.tool, count: Math.floor(elapsed / 1000),
        message: `This step (${call.tool}) is taking unusually long.`,
        timestamp: call.timestamp };
    }
  }
  return null;
}
