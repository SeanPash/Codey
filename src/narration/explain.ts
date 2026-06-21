import type { ToolEvent } from "../types.js";

// The start of the current turn is the most recent user prompt; before any prompt is
// stamped the whole session counts as one turn.
export function currentTurnStart(promptMarks: number[]): number {
  return promptMarks.length ? promptMarks[promptMarks.length - 1] : Number.NEGATIVE_INFINITY;
}

export function eventsForCurrentTurn(events: ToolEvent[], turnStart: number): ToolEvent[] {
  return events.filter((e) => e.timestamp >= turnStart);
}

function summarizeEvent(e: ToolEvent): string {
  const input = JSON.stringify(e.input ?? null).slice(0, 200);
  const status = e.phase === "post" ? (e.isError ? " [ERROR]" : " [done]") : "";
  return `- ${e.tool}${status} ${input}`;
}

// Builds the explain prompt. With prior passes it asks the model to go a level deeper
// and not repeat what the user has already heard this turn.
export function buildExplainPrompt(events: ToolEvent[], priorPasses: string[]): string {
  const lines = events.map(summarizeEvent).join("\n");
  if (priorPasses.length === 0) {
    return `These are the actions an AI coding agent took for the current task:\n${lines}\n\nIn a few plain English sentences for a non-technical person, explain what Claude did and why it matters. Describe the goal, do not list the tools. Use plain hyphens, not em dashes. Reply with only the explanation.`;
  }
  const heard = priorPasses.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `These are the actions an AI coding agent took for the current task:\n${lines}\n\nThe user has already been told:\n${heard}\n\nGo one level deeper than that. Add new detail or a clearer mental model, and do not repeat what was already said. A few plain English sentences for a non-technical person. Use plain hyphens, not em dashes. Reply with only the explanation.`;
}
