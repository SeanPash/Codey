import type { ToolEvent } from "../types.js";
import { cardsFromEvents } from "../statusline/compose.js";

// How rich an on-demand explanation should be. Mirrors the live narration depths.
export type ExplainDepth = "simple" | "deep" | "teach";
const DEPTHS: readonly string[] = ["simple", "deep", "teach"];

// The start of the current turn is the most recent user prompt; before any prompt is
// stamped the whole session counts as one turn.
export function currentTurnStart(promptMarks: number[]): number {
  return promptMarks.length ? promptMarks[promptMarks.length - 1] : Number.NEGATIVE_INFINITY;
}

export function eventsForCurrentTurn(events: ToolEvent[], turnStart: number): ToolEvent[] {
  return events.filter((e) => e.timestamp >= turnStart);
}

// /explain takes optional arguments: a depth word and/or a task number, in any order.
// "/explain teach 3", "/explain 3", "/explain simple" all work.
export function parseExplainArgs(tokens: string[]): { depth: ExplainDepth; task: number | null } {
  let depth: ExplainDepth = "deep";
  let task: number | null = null;
  for (const t of tokens) {
    const low = t.toLowerCase();
    if (DEPTHS.includes(low)) depth = low as ExplainDepth;
    else if (/^#?\d+$/.test(low)) {
      const n = Number(low.replace("#", ""));
      if (n >= 1) task = n; // task numbers start at 1; ignore 0 or negatives
    }
  }
  return { depth, task };
}

// Narrow a turn's events to the task the user sees as #N. The status line groups rapid
// same-kind actions into one card spanning #seq..#endSeq, so we map the number onto its
// card and return that whole burst, not a single hidden mid-burst event. Empty if the
// number falls past the last card.
export function eventForTask(turnEvents: ToolEvent[], taskNumber: number): ToolEvent[] {
  const pres = turnEvents.filter((e) => e.phase === "pre");
  const card = cardsFromEvents(turnEvents).find((c) => {
    const end = c.endSeq ?? c.seq;
    return taskNumber >= c.seq && taskNumber <= end;
  });
  if (!card) return [];
  const end = card.endSeq ?? card.seq;
  return pres.slice(card.seq - 1, end); // seq..end are 1-based inclusive pre indices
}

function summarizeEvent(e: ToolEvent): string {
  const input = JSON.stringify(e.input ?? null).slice(0, 200);
  const status = e.phase === "post" ? (e.isError ? " [ERROR]" : " [done]") : "";
  return `- ${e.tool}${status} ${input}`;
}

function depthInstruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did and why.";
    case "teach":
      return "In a few plain English sentences for someone learning to code, explain what Claude did and why, then briefly teach the key concept involved (define any technical term you use).";
    default:
      return "In a few plain English sentences for a non-technical person, explain what Claude did and why it matters.";
  }
}

// Builds the explain prompt at the chosen depth. With prior passes it asks the model to go
// a level deeper and not repeat what the user has already heard for this scope.
export function buildExplainPrompt(events: ToolEvent[], priorPasses: string[], depth: ExplainDepth = "deep"): string {
  const lines = events.map(summarizeEvent).join("\n");
  const instruction = depthInstruction(depth);
  if (priorPasses.length === 0) {
    return `These are the actions an AI coding agent took for the current task:\n${lines}\n\n${instruction} Describe the goal, do not list the tools. Use plain hyphens, not em dashes. Reply with only the explanation.`;
  }
  const heard = priorPasses.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `These are the actions an AI coding agent took for the current task:\n${lines}\n\nThe user has already been told:\n${heard}\n\nGo one level deeper than that. Add new detail or a clearer mental model, and do not repeat what was already said. ${instruction} Use plain hyphens, not em dashes. Reply with only the explanation.`;
}
