import type { ReceiptLine, TokenBreakdown } from "../types.js";
import type { AssistantTurn } from "./transcript.js";
import { classifyStage } from "../caption/stage.js";
import { humanFile, phrasePattern, purposeTitle, purposeSentence } from "../caption/subject.js";
import { actionLabel, shortTarget } from "../statusline/labels.js";

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function patternFrom(input: unknown): string | null {
  if (input && typeof input === "object") {
    const p = (input as Record<string, unknown>).pattern;
    if (typeof p === "string") return p;
  }
  return null;
}

function fileFrom(input: unknown): string | null {
  if (input && typeof input === "object") {
    const r = input as Record<string, unknown>;
    const p = r.file_path ?? r.path ?? r.notebook_path;
    if (typeof p === "string") return basename(p);
  }
  return null;
}

function fullCommand(input: unknown): string | null {
  if (input && typeof input === "object") {
    const c = (input as Record<string, unknown>).command;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

// Bash and PowerShell calls carry a `description`: Claude's own one-line summary of what the
// command does, in plain active voice ("Show working tree status"). That is exactly the
// readable label we want, so we use it instead of a generic "Ran a command".
function descFrom(input: unknown): string | null {
  if (input && typeof input === "object") {
    const d = (input as Record<string, unknown>).description;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  return null;
}

function fullPath(input: unknown): string | null {
  if (input && typeof input === "object") {
    const r = input as Record<string, unknown>;
    const p = r.file_path ?? r.path ?? r.notebook_path;
    if (typeof p === "string" && p.trim()) return p.trim();
  }
  return null;
}

function prettify(s: string): string {
  const words = s.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Plain-English label for one action. Stays short and readable: the full command or path
// lives in `raw` (shown when the row expands), never crammed into the label.
export function describeAction(tool: string | null, input: unknown): string {
  if (!tool || tool === "thinking") return "Thinking it through";
  const file = fileFrom(input);
  switch (tool) {
    case "Write": return file ? `Writing ${file}` : "Writing a file";
    case "Edit":
    case "MultiEdit": return file ? `Editing ${file}` : "Editing a file";
    case "Read": return file ? `Reading ${file}` : "Reading a file";
    case "Bash":
    case "PowerShell": return descFrom(input) ?? "Ran a command";
    case "Grep":
    case "Glob": {
      const p = patternFrom(input);
      return p ? `Searched for ${phrasePattern(p)}` : "Searched the code";
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return `${prettify(m[2])} via ${m[1]}`;
  return tool;
}

// The subject one action is about: a search pattern phrased plainly, a file as a readable
// noun, otherwise the friendly target of the action ("the tests", "git status").
function actionSubject(tool: string, input: unknown): string {
  if (tool === "Grep" || tool === "Glob") return phrasePattern(patternFrom(input) ?? "");
  const file = fileFrom(input);
  if (file) return humanFile(file);
  return humanFile(shortTarget(actionLabel(tool, input).target)) || "the code";
}

// The collapsed-card headline for one action: a stable purpose label, never the raw tool.
export function actionTitle(tool: string | null, input: unknown): string {
  if (!tool || tool === "thinking") return "Thinking it through";
  return purposeTitle(tool, classifyStage(tool, input), actionSubject(tool, input), 1);
}

// One plain sentence under the title. A shell command carries Claude's own description, the
// best sentence available; everything else gets a purpose sentence built from the subject.
export function actionSubtitle(tool: string | null, input: unknown): string {
  if (!tool || tool === "thinking") return "Working through the approach before acting.";
  const desc = descFrom(input);
  if (desc) return /[.!?]$/.test(desc) ? desc : `${desc}.`;
  return purposeSentence(tool, classifyStage(tool, input), actionSubject(tool, input), 1);
}

// The full detail behind an action, revealed on expand: the command for Bash, the path for
// file tools. Null when there is nothing useful to show.
export function rawDetail(tool: string | null, input: unknown): string | null {
  if (!tool) return null;
  if (tool === "Bash" || tool === "PowerShell") return fullCommand(input);
  return fullPath(input);
}

// A plain sentence describing a failure, for viewers who won't read a raw error dump. We
// surface an exit code when the error text carries one, otherwise stay generic.
export function failSummaryFrom(tool: string | null, errorText: string | null): string {
  const m = errorText ? /exit code\s+(\d+)/i.exec(errorText) : null;
  const what = tool === "Bash" || tool === "PowerShell" ? "command" : tool ? "step" : "step";
  if (m) return `This ${what} failed (exit code ${m[1]}).`;
  return `This ${what} didn't succeed.`;
}

function markResolved(lines: ReceiptLine[]): void {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].status !== "fail") continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].tool === lines[i].tool && lines[j].status === "ok") {
        lines[i].resolved = true;
        break;
      }
    }
  }
}

// Sum the transcript turns that fall inside [startTs, endTs). Output -> work (per action),
// input + cache -> one shared context number.
export function attributeChunk(turns: AssistantTurn[], startTs: number, endTs: number): TokenBreakdown {
  const inWindow = turns.filter((t) => t.ts >= startTs && t.ts < endTs);
  const workLines: ReceiptLine[] = [];
  let workTotal = 0;
  let contextTotal = 0;

  for (const t of inWindow) {
    contextTotal += t.inputTokens + t.cacheReadTokens + t.cacheCreationTokens;
    if (t.outputTokens <= 0 && !t.tool) continue;
    workTotal += t.outputTokens;
    const isFail = !!(t.tool && t.tool !== "thinking" && t.isError);
    workLines.push({
      label: describeAction(t.tool, t.input),
      title: actionTitle(t.tool, t.input),
      subtitle: actionSubtitle(t.tool, t.input),
      tool: t.tool ?? "thinking",
      tokens: t.outputTokens,
      status: t.tool && t.tool !== "thinking" ? (t.isError ? "fail" : "ok") : "none",
      errorText: t.isError ? t.errorText : null,
      resolved: false,
      raw: rawDetail(t.tool, t.input),
      why: t.assistantText ?? null,
      failSummary: isFail ? failSummaryFrom(t.tool, t.errorText) : null,
      ts: t.ts,
      thoughtFirst: false,
    });
  }
  markResolved(workLines);
  return { workTotal, workLines, contextTotal };
}
