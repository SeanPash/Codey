import { randomUUID } from "node:crypto";
import type { ToolEvent } from "../types.js";
import type { AssistantTurn } from "../timeline/transcript.js";

// Claude Code does not fire a PostToolUse hook for a tool call that ends in error,
// so failures never reach the capture hook. The transcript does record them. This
// closes the gap: for each errored turn in the transcript, we synthesize the missing
// "post" event (matched to its "pre" by tool_use_id) so the warning detectors can see
// the failure. Without it, repeat-error never fires and failed calls look like hangs.
export function reconcileErrors(events: ToolEvent[], turns: AssistantTurn[]): ToolEvent[] {
  const closed = new Set<string>();   // tool_use_ids that already have a post from the hook
  const preById = new Map<string, ToolEvent>();
  for (const e of events) {
    if (!e.toolUseId) continue;
    if (e.phase === "post") closed.add(e.toolUseId);
    else preById.set(e.toolUseId, e);
  }

  const synthetic: ToolEvent[] = [];
  for (const turn of turns) {
    if (!turn.isError || !turn.toolUseId) continue;
    if (closed.has(turn.toolUseId)) continue;
    const pre = preById.get(turn.toolUseId);
    if (!pre) continue;
    synthetic.push({
      id: randomUUID(),
      phase: "post",
      tool: pre.tool,
      server: pre.server,
      input: pre.input,
      inputHash: pre.inputHash,
      isError: true,
      errorText: turn.errorText,
      timestamp: pre.timestamp,
      sessionId: pre.sessionId,
      toolUseId: pre.toolUseId,
    });
  }

  if (synthetic.length === 0) return events;

  // Keep chronological order, and a "pre" before its same-timestamp synthetic "post".
  const rank = (e: ToolEvent) => (e.phase === "post" ? 1 : 0);
  return [...events, ...synthetic].sort((a, b) => a.timestamp - b.timestamp || rank(a) - rank(b));
}
