import type { InterventionAction, WarningKind } from "../types.js";

// Describe how Claude is stuck, phrased correctly for the warning kind: a hang's count is seconds
// stuck, while a loop or repeat_error count is a number of repetitions.
function stuckPhrase(kind: WarningKind, tool: string, count: number): string {
  return kind === "hang"
    ? `have been stuck on the same ${tool} step for about ${count}s`
    : `have repeated the same ${tool} step ${count} times without making progress`;
}

// Read by the main-session Claude, so these address it directly, lead with the concrete problem, and
// are directive. Static templates: no tokens spent, no em dashes (repo code style).
export function blockReason(action: InterventionAction, kind: WarningKind, tool: string, count: number): string {
  const stuck = stuckPhrase(kind, tool, count);
  switch (action) {
    case "nudge":
      return `You ${stuck}. Stop retrying it and move on to the next part of the task. If this step `
        + `genuinely can't be completed, say so plainly and continue with what you can.`;
    case "different":
      return `The current method isn't working: you ${stuck}. Stop and switch to a clearly different `
        + `strategy instead of repeating variations of the same one.`;
    case "stop":
      return `The user wants to step in. Stop here, briefly summarize what you were trying to do and `
        + `where you got stuck, then ask the user how they'd like to proceed before taking any more actions.`;
  }
}
