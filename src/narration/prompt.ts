import type { ToolEvent, Mode } from "../types.js";

function summarizeEvent(e: ToolEvent): string {
  const inputStr = JSON.stringify(e.input ?? null).slice(0, 200);
  const status = e.phase === "post" ? (e.isError ? " [ERROR]" : " [done]") : "";
  return `- ${e.tool}${status} ${inputStr}`;
}

export function buildNarrationPrompt(events: ToolEvent[], mode: Mode): string {
  const lines = events.map(summarizeEvent).join("\n");
  const instruction =
    mode === "teach"
      ? "In a few plain-English sentences for someone learning to code, explain what Claude is doing and why, then briefly teach the key concept involved (define any technical term you use). Do not list the tools; describe the goal."
      : mode === "deep"
      ? "In 2-3 plain-English sentences for a non-technical person, explain what Claude is doing AND why it matters. Do not list the tools; describe the goal."
      : "Write one sentence for a non-technical person saying what Claude is currently doing. Do not list the tools; describe the goal.";
  return `These are the most recent actions an AI coding agent took:\n${lines}\n\n${instruction}\nUse plain hyphens, not em dashes. Reply with only the explanation, no preamble.`;
}
