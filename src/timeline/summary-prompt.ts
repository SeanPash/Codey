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

function basename(p: string): string {
  return p.replace(/["']/g, "").split(/[\\/]/).pop() || p;
}

const EDIT_TOOLS = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);

// The real files a prompt changed, pulled from the edit/write lines, so the recap names them
// instead of guessing. Deduped, in order of first touch.
function changedFiles(tasks: SummaryTask[]): string[] {
  const out: string[] = [];
  for (const t of tasks) {
    for (const l of t.lines) {
      if (EDIT_TOOLS.has(l.tool) && l.raw) {
        const name = basename(l.raw);
        if (!out.includes(name)) out.push(name);
      }
    }
  }
  return out;
}

// The verification steps that actually ran (test, build, type/lint), so the recap only credits
// a check that happened. Empty when nothing was verified.
function verifications(tasks: SummaryTask[]): string[] {
  const out: string[] = [];
  for (const t of tasks) {
    for (const l of t.lines) {
      if ((l.tool !== "Bash" && l.tool !== "PowerShell") || !l.raw) continue;
      const cmd = l.raw;
      let v: string | null = null;
      if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) v = "the tests";
      else if (/\bbuild\b/.test(cmd)) v = "the build";
      else if (/\b(typecheck|tsc|lint|eslint)\b/.test(cmd)) v = "the checks";
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out;
}

// The grounding block: the concrete files and checks the recap is allowed to cite, so the model
// stays honest instead of inventing changes or claiming a verification that never ran.
function evidenceBlock(tasks: SummaryTask[]): string {
  const files = changedFiles(tasks);
  const checks = verifications(tasks);
  const lines = [
    "Grounding evidence (use only what is listed here, do not invent more):",
    `Files touched: ${files.length ? files.join(", ") : "none (Claude only looked around, did not change files)"}`,
    `Verification that ran: ${checks.length ? checks.join(", ") : "none (do not claim anything was tested or verified)"}`,
  ];
  return lines.join("\n");
}

function instruction(depth: ExplainDepth): string {
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, recap what Claude accomplished for this prompt. Only say it changed, fixed, or verified something if the evidence shows it; otherwise say what it inspected or found.";
    case "teach":
      return [
        "Recap what Claude accomplished, for someone learning to code, using these sections with a blank line between them:",
        "What changed: a few short bullets on the actual behavior that changed (or, if nothing changed, what Claude inspected or found).",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "Then add one short plain-English note teaching the key concept involved (define any technical term you use).",
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it.",
      ].join("\n");
    default:
      return [
        "Recap what Claude accomplished for a non-technical person, using these sections with a blank line between them:",
        "What changed: a few short bullets on the actual behavior that changed (or, if nothing changed, what Claude inspected or found).",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it.",
      ].join("\n");
  }
}

// Build a per-prompt recap prompt: the user's words, the tasks Claude ran with its reasoning,
// and the grounded evidence of what really changed, asking for an honest outcome.
export function buildSummaryPrompt(promptText: string, tasks: SummaryTask[], depth: ExplainDepth): string {
  const body = tasks.map(taskBlock).join("\n");
  return [
    `A user asked an AI coding agent: "${promptText}"`,
    "It worked through these tasks, with its own reasoning:",
    body,
    "",
    evidenceBlock(tasks),
    "",
    `${instruction(depth)} Focus on the outcome, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the recap, no preamble.`,
  ].join("\n");
}
