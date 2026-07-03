import type { ReceiptLine } from "../types.js";

// How rich a timeline explanation should be. Mirrors the live narration depths.
export type ExplainDepth = "simple" | "deep" | "teach";

// One line of context per action: what it was, whether it worked, and the reasoning Claude
// wrote at the time. The reasoning is what lets the model explain why and how, not just what.
// In rich mode we also feed the grounded change substance (the real edit/search/command), which
// is what lets the explanation name the actual change instead of only naming a file.
function actionContext(l: ReceiptLine, rich: boolean): string {
  const status = l.status === "fail" ? " [failed]" : "";
  const detail = l.raw ? ` (${l.raw})` : "";
  const reason = l.why ? ` reasoning: ${l.why}` : "";
  const change = rich && l.evidence ? ` change: ${l.evidence}` : "";
  const fail = l.failSummary ? ` ${l.failSummary}` : "";
  return `- ${l.label}${detail}${status}${reason}${change}${fail}`;
}

// In rich mode, push the explanation to name the concrete things it was handed instead of
// staying generic. Empty in budget mode so the lean prompt is unchanged.
function specificityRule(rich: boolean): string {
  return rich
    ? " Name the actual files, identifiers, values, and root cause from the changes and reasoning above; be as specific as the evidence allows."
    : "";
}

// Rich is the "explain it deeply" setting, so each labeled part earns more room; budget stays
// tight. The Concept part keeps its own length either way.
function partLen(rich: boolean): string {
  return rich ? "two to four plain sentences" : "one or two plain sentences";
}

function taskInstruction(depth: ExplainDepth, rich: boolean): string {
  const parts = partLen(rich);
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this task and why.";
    case "teach":
      return [
        `Explain this task for someone learning to code, in labeled parts, each on its own line starting with the label and a colon. Keep each part to ${parts}, except the Concept, which gets the length noted there:`,
        "What Claude did: name what the task actually accomplished.",
        "Why it mattered: the problem it solves or why it was worth doing.",
        "How it worked: the mechanism, in plain terms.",
        "Concept: teach the one technique, tool, or skill worth learning from this task. Choose something concrete that Claude actually used (for example an API, caching, a hash, a data structure, a file watcher), not a basic term the reader already knows like a prompt, a file, or a function. Name it, explain what it is in plain terms with a short everyday analogy, then connect it to what Claude did here. Two or three sentences, and define any term you introduce.",
      ].join("\n");
    default:
      return [
        `Explain this task for a non-technical person, in labeled parts, each on its own line starting with the label and a colon. Keep each part to ${parts}:`,
        "What Claude did: name what the task actually accomplished.",
        "Why it mattered: the problem it solves or why it was worth doing.",
        "How it worked: the mechanism, in plain terms.",
      ].join("\n");
  }
}

function actionInstruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, say what Claude did in this single step and why.";
    case "teach":
      return "Explain this single step for someone learning to code, in three labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why Claude did it. Start the next line with 'How Claude did it:' then one or two sentences on how the step works. Start a final line with 'Concept:' then teach the one technique, tool, or skill worth learning from this step. Choose something concrete that Claude actually used (for example an API, caching, a hash, a data structure, a file watcher), not a basic term the reader already knows like a prompt, a file, or a function. Name it, explain what it is in plain terms with a short everyday analogy, then tie it to what this step did. Two or three sentences, and define any term you introduce.";
    default:
      return "Explain this single step for a non-technical person, in two labeled parts. Start a line with 'Why this mattered:' then one or two sentences on why this step matters. Start the next line with 'How Claude did it:' then one or two sentences on how the step works.";
  }
}

// A self-contained explainer always has enough to work with: it only ever sees a few lines of
// context, sometimes just a thinking step. These rules keep it from breaking on thin input by
// asking the user a question (it has no one to ask) or by stalling for "more context".
const SELF_CONTAINED = "Explain only the steps shown above. The steps are all the context that exists, so never ask the user for more information, never say you lack context, and never ask them to describe what happened. If the detail is sparse, give your best plain high-level explanation from what is shown.";
const TAIL = "Describe the goal, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Write the labels and body as plain text, with no markdown formatting: no asterisks, backticks, or bold. Reply with only the explanation, no preamble.";

// Explain a whole task: feed the model the reasoning behind each action so it can give a real
// why and how. The task name is Codey's own automatic guess, so we say so plainly: the model
// must explain what the steps actually do, not accuse the agent of going off-task when the
// steps happen to differ from a label Codey invented.
export function buildTaskExplainPrompt(taskName: string, lines: ReceiptLine[], depth: ExplainDepth, rich = true): string {
  const body = lines.map((l) => actionContext(l, rich)).join("\n");
  return [
    `Codey automatically grouped these steps from an AI coding agent and labeled the group "${taskName}". That label is a rough guess, not the agent's stated goal, so explain what the steps below actually accomplish and do not claim the agent did the wrong thing just because the steps differ from the label. These are the steps, with the agent's own reasoning:`,
    body,
    "",
    `${taskInstruction(depth, rich)}${specificityRule(rich)} ${SELF_CONTAINED} ${TAIL}`,
  ].join("\n");
}

// Explain one action in isolation, at the chosen depth. A lone step is the thinnest context of
// all (often just "Thought it through"), so the self-contained rules matter most here.
export function buildActionExplainPrompt(line: ReceiptLine, depth: ExplainDepth, rich = true): string {
  const intro = line.tool === "thinking"
    ? "An AI coding agent was deciding what to do next. This is that decision point, with the agent's own words:"
    : "An AI coding agent took this single step, with its own reasoning:";
  // For a decision step, the explanation must name the actual choice from the agent's words, not
  // narrate that it "paused and reflected". That filler says nothing and is explicitly unwanted.
  const decisionRule = line.tool === "thinking"
    ? " Explain the specific decision the agent was making and what it chose to do next, grounded in its words above. Do not say the agent paused, reflected, or thought; name the actual choice."
    : specificityRule(rich);
  return [
    intro,
    actionContext(line, rich),
    "",
    `${actionInstruction(depth)}${decisionRule} ${SELF_CONTAINED} ${TAIL}`,
  ].join("\n");
}
