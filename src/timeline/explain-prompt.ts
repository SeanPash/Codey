import type { ReceiptLine } from "../types.js";

// How rich a timeline explanation should be. Mirrors the live narration depths.
export type ExplainDepth = "simple" | "deep" | "teach";

// One line of context per action: what it was, whether it worked, and the reasoning Claude
// wrote at the time. The reasoning is what lets the model explain why and how, not just what.
function actionContext(l: ReceiptLine): string {
  const status = l.status === "fail" ? " [failed]" : "";
  const detail = l.raw ? ` (${l.raw})` : "";
  const reason = l.why ? ` reasoning: ${l.why}` : "";
  const fail = l.failSummary ? ` ${l.failSummary}` : "";
  return `- ${l.label}${detail}${status}${reason}${fail}`;
}

function taskInstruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this task and why.";
    case "teach":
      return "In a few plain English sentences for someone learning to code, explain what Claude did in this task and why, then briefly teach the key concept involved (define any technical term you use).";
    default:
      return "In a few plain English sentences for a non-technical person, explain what Claude did in this task, why it matters, and how it actually addresses the problem.";
  }
}

function actionInstruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this single step and why.";
    case "teach":
      return "In a few plain English sentences for someone learning to code, explain what Claude did in this single step and why, then briefly teach the key concept involved (define any technical term you use).";
    default:
      return "In a few plain English sentences for a non-technical person, explain what Claude did in this single step, why it matters, and how it works.";
  }
}

const TAIL = "Describe the goal, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the explanation, no preamble.";

// Explain a whole task: feed the model the named task plus the reasoning behind each action,
// so it can give a real why and how rather than a description of tool calls.
export function buildTaskExplainPrompt(taskName: string, lines: ReceiptLine[], depth: ExplainDepth): string {
  const body = lines.map(actionContext).join("\n");
  return [
    `An AI coding agent worked on a task called "${taskName}". These are the steps it took, with its own reasoning:`,
    body,
    "",
    `${taskInstruction(depth)} ${TAIL}`,
  ].join("\n");
}

// Explain one action in isolation, at the chosen depth.
export function buildActionExplainPrompt(line: ReceiptLine, depth: ExplainDepth): string {
  return [
    "An AI coding agent took this single step, with its own reasoning:",
    actionContext(line),
    "",
    `${actionInstruction(depth)} ${TAIL}`,
  ].join("\n");
}
