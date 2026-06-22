import type { ReceiptLine } from "../types.js";
import type { ExplainDepth } from "./explain-prompt.js";

// One task's worth of context for the summary: its name and the reasoning behind its steps.
export interface SummaryTask {
  name: string;
  lines: ReceiptLine[];
}

function taskBlock(t: SummaryTask): string {
  const reasons = t.lines
    .map((l) => (l.why ? `    - ${l.why}` : `    - ${l.label}`))
    .join("\n");
  return `- ${t.name}\n${reasons}`;
}

function instruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, recap what Claude accomplished for this prompt.";
    case "teach":
      return "In a few plain English sentences for someone learning to code, recap what Claude accomplished for this prompt and why it matters, then briefly teach the key concept involved (define any technical term you use).";
    default:
      return "In two or three plain English sentences for a non-technical person, recap what Claude accomplished for this prompt and how it addressed the request.";
  }
}

// Build a per-prompt recap prompt: the user's words plus the tasks Claude ran and its
// reasoning, asking for the outcome rather than a step list.
export function buildSummaryPrompt(promptText: string, tasks: SummaryTask[], depth: ExplainDepth): string {
  const body = tasks.map(taskBlock).join("\n");
  return [
    `A user asked an AI coding agent: "${promptText}"`,
    "It worked through these tasks, with its own reasoning:",
    body,
    "",
    `${instruction(depth)} Focus on the outcome, do not list the tools. Use plain hyphens, not em dashes. Reply with only the recap, no preamble.`,
  ].join("\n");
}
