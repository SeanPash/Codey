import type { InterventionAction } from "../types.js";

// Read by the main-session Claude, so these address it directly, lead with the concrete count, and
// are directive. Static templates: no tokens spent, no em dashes (repo code style).
export function blockReason(action: InterventionAction, tool: string, count: number): string {
  switch (action) {
    case "nudge":
      return `You've repeated this same step ${count} times without making progress. `
        + `Stop retrying it and move on to the next part of the task. If this step genuinely can't `
        + `be completed, say so plainly and continue with what you can.`;
    case "different":
      return `This approach has failed ${count} times. The current method isn't working, so stop `
        + `and switch to a clearly different strategy instead of repeating variations of the same one.`;
    case "stop":
      return `The user wants to step in. Stop here, briefly summarize what you were trying to do and `
        + `where you got stuck, then ask the user how they'd like to proceed before taking any more actions.`;
  }
}
