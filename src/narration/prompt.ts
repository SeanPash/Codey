import type { ToolEvent, Mode } from "../types.js";

// Squash whitespace and clip to a length so one event's detail never floods the window.
function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

// Pull the meaningful detail out of one tool call so the narrator sees the real change, not a
// blind blob. The point is mechanism: for an edit, the code actually going in; for a command,
// the command itself. This is what lets the explanation name a function and what it now does
// instead of only naming a file. A plain JSON slice would truncate the new code away.
function summarizeEvent(e: ToolEvent): string {
  const status = e.phase === "post" ? (e.isError ? " [ERROR]" : " [done]") : "";
  const err = e.phase === "post" && e.isError && e.errorText ? ` error: ${clip(e.errorText, 140)}` : "";
  const input = (e.input ?? {}) as Record<string, unknown>;
  const str = (k: string): string | null => (typeof input[k] === "string" ? (input[k] as string) : null);
  const file = str("file_path") ?? str("path") ?? str("notebook_path");

  let line: string;
  switch (e.tool) {
    case "Edit":
    case "MultiEdit": {
      const newS = str("new_string");
      const oldS = str("old_string");
      if (file && newS != null) {
        const from = oldS ? `, replacing "${clip(oldS, 80)}"` : "";
        line = `- Edit ${file}${status}: new code "${clip(newS, 220)}"${from}`;
      } else line = `- ${e.tool} ${file ?? ""}${status}`;
      break;
    }
    case "Write":
    case "NotebookEdit": {
      const content = str("new_source") ?? str("content");
      line = `- Write ${file ?? "a file"}${status}: ${content ? `"${clip(content, 220)}"` : "new file"}`;
      break;
    }
    case "Bash":
    case "PowerShell": {
      const cmd = str("command");
      line = cmd ? `- Run${status}: ${clip(cmd, 200)}` : `- ${e.tool}${status}`;
      break;
    }
    case "Grep":
    case "Glob": {
      const pat = str("pattern");
      const where = file ?? str("glob");
      line = pat ? `- Search${status} for "${clip(pat, 80)}"${where ? ` in ${where}` : ""}` : `- ${e.tool}${status}`;
      break;
    }
    case "Read": {
      line = `- Read ${file ?? "a file"}${status}`;
      break;
    }
    default:
      line = `- ${e.tool}${status} ${clip(JSON.stringify(e.input ?? null), 200)}`;
  }
  return line + err;
}

export function buildNarrationPrompt(events: ToolEvent[], mode: Mode): string {
  const lines = events.map(summarizeEvent).join("\n");
  const instruction =
    mode === "teach"
      ? "Write exactly two sentences for someone learning to code, about 40 words total. Sentence one: the specific change, naming the real file and the function, value, or rule it changes and what that makes the code do differently. Sentence two: teach the one concept behind it and define any term you use. Lead with the change itself, not a throat-clearing intro, and never write a third sentence."
      : mode === "deep"
      ? "Write at most two sentences, no more than about 35 words total. Lead immediately with the specific change: name the real file and the actual function, value, or behavior being changed, say what the change makes the code do differently, and why that matters here. State the mechanism itself, not a filler intro like \"implements new logic\" or \"updates the system\". For example: \"Claude is editing helper.ts so the loss function drops the opponent's defense by one and raises the player's advantage by one, the rule that lets a winner press their edge.\""
      : "Write one sentence, no more than about 20 words, saying what Claude is doing right now, naming the real file and the specific function or command involved. Be concrete, not generic.";
  return `These are the most recent actions an AI coding agent took, newest last:\n${lines}\n\n${instruction}\nGround every claim in the actions above: name the actual files, functions, search terms, or commands involved. Never use vague filler like "several files", "the code", "the system", "various changes", "understand how it works", or "make sure everything is consistent". Be brief and specific, short enough to read at a glance. Write plain English with no markdown or backticks. Never use em dashes or hyphens to join clauses; use a period or a comma instead. Reply with only the explanation, no preamble.`;
}
