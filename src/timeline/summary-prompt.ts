import type { ReceiptLine } from "../types.js";
import type { ExplainDepth } from "./explain-prompt.js";

// One task's worth of context for the summary: its name and the reasoning behind its steps.
export interface SummaryTask {
  name: string;
  lines: ReceiptLine[];
}

// The task's reasoning list. The concrete change substance is not inlined here; it lives once, in
// the capped "Concrete changes" block, so a prompt with hundreds of edits cannot flood the window.
function taskBlock(t: SummaryTask): string {
  const reasons = t.lines
    .map((l) => (l.why ? `    - ${l.why}` : `    - ${l.label}`))
    .join("\n");
  return `- ${t.name}\n${reasons}`;
}

// The concrete change substance across the whole prompt, gathered from the per-line change-facts.
// This is the honest, grounded detail (the real edits, searches, commands) that lets a rich recap
// name what actually changed instead of paraphrasing. Edits and writes lead, since a captured
// sample should name real code changes before searches or commands. Empty when nothing happened.
function changeFacts(tasks: SummaryTask[]): string[] {
  const edits: string[] = [];
  const rest: string[] = [];
  for (const t of tasks) {
    for (const l of t.lines) {
      if (!l.evidence) continue;
      const bucket = EDIT_TOOLS.has(l.tool) ? edits : rest;
      if (!edits.includes(l.evidence) && !rest.includes(l.evidence)) bucket.push(l.evidence);
    }
  }
  return [...edits, ...rest];
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
function evidenceBlock(tasks: SummaryTask[], rich: boolean): string {
  const files = changedFiles(tasks);
  const checks = verifications(tasks);
  const lines = [
    "Grounding evidence (use only what is listed here, do not invent more):",
    `Files touched: ${files.length ? files.join(", ") : "none (Claude only looked around, did not change files)"}`,
    `Verification that ran: ${checks.length ? checks.join(", ") : "none (do not claim anything was tested or verified)"}`,
  ];
  // In rich mode, list the concrete changes so the recap can name the real edit or search. The
  // list is capped so a huge prompt cannot flood the window; the count tells the model there was
  // more without paying for every line.
  if (rich) {
    const facts = changeFacts(tasks);
    if (facts.length) {
      const MAX = 12;
      const shown = facts.slice(0, MAX);
      const extra = facts.length - shown.length;
      const tail = extra > 0 ? `\n    - (and ${extra} more change${extra > 1 ? "s" : ""})` : "";
      lines.push("Concrete changes (the actual edits, searches, and commands):");
      lines.push(shown.map((f) => `    - ${f}`).join("\n") + tail);
    }
  }
  return lines.join("\n");
}

// The "What changed" section earns more room the more the prompt actually touched, so a small
// tweak stays one tight sentence and a sprawling overhaul gets a real walkthrough. Rich mode is
// the "explain it deeply" setting, so it asks for a markedly fuller walkthrough than budget at
// every size; budget stays tight to keep the recap cheap. Other sections scale via secondaryLen.
function whatChangedGuidance(fileCount: number, rich: boolean): string {
  if (rich) {
    if (fileCount >= 7) {
      return "What changed: walk through what actually changed, grouped by area, in six to ten plain sentences, so a reader sees each main change and not a vague summary. Name the specific files, identifiers, and behaviors from the concrete changes above.";
    }
    if (fileCount >= 3) {
      return "What changed: walk through what actually changed in four to six plain sentences, naming the specific files, identifiers, and behaviors from the concrete changes above.";
    }
    return "What changed: describe what actually changed in two to four plain sentences, naming the specific identifiers, values, or behaviors from the concrete changes above (or, if nothing changed, what Claude inspected or found).";
  }
  if (fileCount >= 7) {
    return "What changed: the actual behavior that changed, in concrete terms, in three to five plain sentences that group the related changes so a reader sees the main areas touched.";
  }
  if (fileCount >= 3) {
    return "What changed: the actual behavior that changed, in concrete terms, in two or three plain sentences.";
  }
  return "What changed: the actual behavior that changed, in concrete terms, in one or two plain sentences (or, if nothing changed, what Claude inspected or found).";
}

// How much room the secondary sections (Why it mattered, What's left) get. Rich is the deeper
// setting, so it allows an extra sentence where there is substance; budget stays tight.
function secondaryLen(rich: boolean): string {
  return rich ? "one to three plain sentences" : "one or two plain sentences";
}

// The teach-mode Concept section. Budget teaches the single most important technique; rich is the
// "teach me everything" setting, so it teaches every notable technique the work used, each as its
// own point. Both keep the same guardrails: a concrete technique, an everyday analogy, no trivia.
function conceptGuidance(rich: boolean): string {
  if (rich) {
    return "Concept: teach every notable technique, tool, or skill this work used, each as its own labeled point (Concept 1, Concept 2, and so on). For each, choose something concrete that Claude actually used here (for example an API, caching, a hash, a data structure, a file watcher), not a basic term the reader already knows like a prompt, a file, or a function. Name it, explain what it is in plain terms with a short everyday analogy, then say how Claude used it in this work. Cover all the main topics, two or three sentences each, and define any term you introduce.";
  }
  return "Concept: teach the one technique, tool, or skill worth learning from this work. Choose something concrete that Claude actually used here (for example an API, caching, a hash, a data structure, a file watcher), not a basic term the reader already knows like a prompt, a file, or a function. Name it, explain what it is in plain terms with a short everyday analogy, then say how Claude used it in this work. Two or three sentences, and define any term you introduce.";
}

// In rich mode, push the recap to name the concrete things the evidence hands it (the real
// identifiers, values, and root cause) instead of paraphrasing. Empty in budget mode.
function specificityRule(rich: boolean): string {
  return rich
    ? " Name the specific identifiers, values, files, and root cause from the concrete changes above; be as precise as the evidence allows instead of paraphrasing."
    : "";
}

function instruction(depth: ExplainDepth, fileCount: number, rich: boolean): string {
  const whatChanged = whatChangedGuidance(fileCount, rich);
  const secondary = secondaryLen(rich);
  const specifics = specificityRule(rich);
  switch (depth) {
    case "simple":
      return "In one plain English sentence for a non-technical person, recap what Claude accomplished for this prompt. Only say it changed, fixed, or verified something if the evidence shows it; otherwise say what it inspected or found." + specifics;
    case "teach":
      return [
        `Recap what Claude accomplished, for someone learning to code, as an organized work report. Use these labeled sections, each on its own line starting with the label and a colon, with a blank line between sections. Keep the secondary sections to ${secondary}, give the lengths noted below, no bullet characters:`,
        whatChanged,
        "Why it mattered: what problem this solved or why it was worth doing.",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "What's left: anything still open or unverified, or omit this section if the work is complete.",
        conceptGuidance(rich),
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it.",
        "Write the report from the evidence above; do not just repeat Claude's closing chat message back." + specifics,
      ].join("\n");
    default:
      return [
        `Recap what Claude accomplished for a non-technical person, as an organized work report. Use these labeled sections, each on its own line starting with the label and a colon, with a blank line between sections. Keep the secondary sections to ${secondary}, give the lengths noted below, no bullet characters:`,
        whatChanged,
        "Why it mattered: what problem this solved or why it was worth doing.",
        "Files touched: the files from the evidence, comma separated.",
        "Verification: the checks from the evidence, or omit this section entirely if none ran.",
        "What's left: anything still open or unverified, or omit this section if the work is complete.",
        "Only say fixed, updated, reinstalled, or verified when the evidence supports it.",
        "Write the report from the evidence above; do not just repeat Claude's closing chat message back." + specifics,
      ].join("\n");
  }
}

// Build a per-prompt recap prompt: the user's words, the tasks Claude ran with its reasoning,
// and the grounded evidence of what really changed, asking for an honest outcome.
export function buildSummaryPrompt(promptText: string, tasks: SummaryTask[], depth: ExplainDepth, rich = true): string {
  const body = tasks.map(taskBlock).join("\n");
  const fileCount = changedFiles(tasks).length;
  return [
    `A user asked an AI coding agent: "${promptText}"`,
    "It worked through these tasks, with its own reasoning:",
    body,
    "",
    evidenceBlock(tasks, rich),
    "",
    `${instruction(depth, fileCount, rich)} Focus on the outcome, do not list the tools. Do not use em dashes or hyphens to join clauses; write plain sentences with commas or periods. Reply with only the recap, no preamble.`,
  ].join("\n");
}
