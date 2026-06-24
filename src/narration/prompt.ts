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
      ? "In two or three plain-English sentences for someone learning to code, first say what Claude is doing and the specific thing it is trying to verify, change, or protect, then teach the key concept behind this step and define any technical term you use. The concept sentence must add an idea, not just restate the what."
      : mode === "deep"
      ? "In one or two compact but rich plain-English sentences for a non-technical person, say what Claude is doing and, specifically, the purpose or relationship it is verifying, changing, or protecting, and how that connects to the request it is working on. Go beyond a bare description of the action: a reader should learn why this step matters here, not just that it happened."
      : "Write one sentence for a non-technical person saying what Claude is currently doing and, briefly, why. Keep it to a single concrete sentence.";
  return `These are the most recent actions an AI coding agent took:\n${lines}\n\n${instruction}\nDo not list the tools; describe the goal. Be specific and concrete: name the actual files, search terms, or commands involved so the reader knows exactly what is happening. Avoid vague filler like "several files", "the code", "running shell commands", "checking the code", or "thinking it through" when the actions name a real file, term, or purpose. Write plain English. Never use em dashes or hyphens to join clauses; use a period or a comma instead. Reply with only the explanation, no preamble.`;
}
