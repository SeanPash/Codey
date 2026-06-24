import type { ReceiptLine, TokenBreakdown } from "../types.js";
import type { AssistantTurn } from "./transcript.js";
import { classifyStage } from "../caption/stage.js";
import { humanFile, phrasePattern, purposeTitle, purposeSentence } from "../caption/subject.js";
import { describeShellIntent } from "../caption/shell.js";
import { actionLabel, shortTarget } from "../statusline/labels.js";
import { hasBannedPhrase } from "../caption/banned.js";

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

// The folder a file lives in ("statusline" from ".../src/statusline/render.ts"), used to ground
// a caption in the area of the codebase it touches. Drops generic container folders so the area
// names something meaningful, and returns null when there is nothing useful to say.
const GENERIC_FOLDERS = new Set(["src", "lib", "dist", "app", "test", "tests", "__tests__", ""]);
function folderArea(input: unknown): string | undefined {
  const p = fullPath(input);
  if (!p) return undefined;
  const parts = p.split(/[\\/]/).filter(Boolean);
  const folder = parts[parts.length - 2] ?? "";
  return GENERIC_FOLDERS.has(folder.toLowerCase()) ? undefined : folder;
}

function prettify(s: string): string {
  const words = s.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// A thinking turn carries Claude's own reasoning text. Cleaned up, that text is the decision the
// row is about, which is far better than a generic "thinking" label. We collapse whitespace,
// keep the first sentence, clamp it, and reject anything that trips the banned-filler guard so a
// vague thought never becomes a vague caption. Null when there is no usable decision text.
export function decisionText(text: string | null | undefined): string | null {
  if (!text) return null;
  const one = text.replace(/\s+/g, " ").trim();
  if (!one) return null;
  const firstSentence = (one.split(/(?<=[.!?])\s+/)[0] || one).trim();
  const clamped = firstSentence.length > 140 ? firstSentence.slice(0, 137).trimEnd() + "…" : firstSentence;
  if (hasBannedPhrase(clamped)) return null;
  return /[.!?…]$/.test(clamped) ? clamped : clamped + ".";
}

// The decision sentence for a thinking row's subtitle: Claude's own words when they say something,
// otherwise an honest, non-banned marker that this was a planning beat.
function thinkingSubtitle(text: string | null | undefined): string {
  return decisionText(text) ?? "Claude weighed the next step before continuing.";
}

// Plain-English label for one action. Stays short and readable: the full command or path
// lives in `raw` (shown when the row expands), never crammed into the label. A thinking turn is
// labelled by the planning beat it is, never with the old "thinking it through" filler.
export function describeAction(tool: string | null, input: unknown, text?: string | null): string {
  if (!tool || tool === "thinking") return decisionText(text) ? "Deciding the next step" : "Planning the next step";
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

// The collapsed-card headline for one action: a stable purpose label, never the raw tool. A
// thinking row is titled by the planning beat, so a viewer reads a purpose rather than "thinking".
export function actionTitle(tool: string | null, input: unknown, text?: string | null): string {
  if (!tool || tool === "thinking") return decisionText(text) ? "Deciding the next step" : "Planning the next step";
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = fullCommand(input);
    if (cmd) return describeShellIntent(cmd, descFrom(input)).title;
  }
  return purposeTitle(tool, classifyStage(tool, input), actionSubject(tool, input), 1);
}

// One plain sentence under the title, always distinct from the title. A shell command is described
// by its intent sentence ("Claude is checking ...") rather than echoing the raw description, so the
// subtitle never repeats the title verbatim. A thinking row uses Claude's own decision text.
export function actionSubtitle(tool: string | null, input: unknown, text?: string | null): string {
  if (!tool || tool === "thinking") return thinkingSubtitle(text);
  if (tool === "Bash" || tool === "PowerShell") {
    const cmd = fullCommand(input);
    if (cmd) return describeShellIntent(cmd, descFrom(input)).sentence;
    const desc = descFrom(input);
    if (desc) return /[.!?]$/.test(desc) ? desc : `${desc}.`;
  }
  return purposeSentence(tool, classifyStage(tool, input), actionSubject(tool, input), 1, folderArea(input));
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
    const thinking = !t.tool || t.tool === "thinking";
    workLines.push({
      label: describeAction(t.tool, t.input, t.assistantText),
      title: actionTitle(t.tool, t.input, t.assistantText),
      subtitle: actionSubtitle(t.tool, t.input, t.assistantText),
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
      // A real action always has something to explain; a thinking turn only does when it left
      // decision text behind. An evidence-less thinking row gets no "explain this step" button.
      explainable: thinking ? decisionText(t.assistantText) !== null : true,
    });
  }
  markResolved(workLines);
  return { workTotal, workLines, contextTotal };
}
