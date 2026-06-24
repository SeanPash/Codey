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
      return "Explain this single step for someone learning to code, in three labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why Claude did it. Start the next line with 'How Claude did it:' then one or two sentences on how the step works. Start a final line with 'Concept:' then briefly teach the key concept involved and define any technical term you use.";
    default:
      return "Explain this single step for a non-technical person, in two labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why this step matters. Start the next line with 'How Claude did it:' then one or two sentences on how the step works.";
  }
}

// A self-contained explainer always has enough to work with: it only ever sees a few lines of
// context, sometimes just a thinking step. These rules keep it from breaking on thin input by
// asking the user a question (it has no one to ask) or by stalling for "more context".
const SELF_CONTAINED = "Explain only the steps shown above. The steps are all the context that exists, so never ask the user for more information, never say you lack context, and never ask them to describe what happened. If the detail is sparse, give your best plain high-level explanation from what is shown.";
const TAIL = "Describe the goal, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the explanation, no preamble.";

// Explain a whole task: feed the model the reasoning behind each action so it can give a real
// why and how. The task name is Codey's own automatic guess, so we say so plainly: the model
// must explain what the steps actually do, not accuse the agent of going off-task when the
// steps happen to differ from a label Codey invented.
export function buildTaskExplainPrompt(taskName: string, lines: ReceiptLine[], depth: ExplainDepth): string {
  const body = lines.map(actionContext).join("\n");
  return [
    `Codey automatically grouped these steps from an AI coding agent and labeled the group "${taskName}". That label is a rough guess, not the agent's stated goal, so explain what the steps below actually accomplish and do not claim the agent did the wrong thing just because the steps differ from the label. These are the steps, with the agent's own reasoning:`,
    body,
    "",
    `${taskInstruction(depth)} ${SELF_CONTAINED} ${TAIL}`,
  ].join("\n");
}

// Explain one action in isolation, at the chosen depth. A lone step is the thinnest context of
// all (often just "Thought it through"), so the self-contained rules matter most here.
export function buildActionExplainPrompt(line: ReceiptLine, depth: ExplainDepth): string {
  const intro = line.tool === "thinking"
    ? "An AI coding agent paused to reason before its next action. This is that thinking step, with the agent's own words:"
    : "An AI coding agent took this single step, with its own reasoning:";
  return [
    intro,
    actionContext(line),
    "",
    `${actionInstruction(depth)} ${SELF_CONTAINED} ${TAIL}`,
  ].join("\n");
}
