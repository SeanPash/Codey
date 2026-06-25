import type { ReceiptLine } from "../types.js";

// A folded run of same-tool steps in the browser timeline, summarized by purpose. The child rows
// already carry tidy purpose titles ("Checking local changes", "Inspecting session storage"), so
// the parent reads off those rather than echoing a raw command or a bare "Running N commands".
// Raw command text never appears here; it stays behind each child's "Show raw details".

// The plural noun a tool's steps are counted in.
function countNoun(tool: string): string {
  if (["Read", "Edit", "MultiEdit", "Write", "NotebookEdit"].includes(tool)) return "files";
  if (["Grep", "Glob"].includes(tool)) return "searches";
  if (["Bash", "PowerShell"].includes(tool)) return "commands";
  return "steps";
}

// The honest fallback when a run has no single shared purpose: a tool-framed count.
function countPhrase(tool: string, n: number): string {
  const verb: Record<string, string> = {
    Read: "Checking", Edit: "Updating", MultiEdit: "Updating", Write: "Creating", NotebookEdit: "Updating",
    Grep: "Searching", Glob: "Searching", Bash: "Running", PowerShell: "Running",
  };
  if (verb[tool]) return `${verb[tool]} ${n} ${countNoun(tool)}`;
  return `Working through ${n} ${tool} steps`;
}

// The distinct purpose titles in a run, in first-seen order, compared case-insensitively.
function distinctTitles(items: ReceiptLine[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const t = (it.title ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

// "Checking local changes" -> "checking local changes", so a title reads inside a sentence.
function leadLower(title: string): string {
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function joinLower(titles: string[]): string {
  const list = titles.map(leadLower);
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  const head = list.slice(0, 2);
  return `${head.join(", ")}, and ${list.length - head.length} more`;
}

// The parent label for a collapsed burst. When every step shares one purpose, that purpose names
// the whole run ("Inspecting session storage"); only a genuinely mixed run falls back to a count.
export function burstSummary(items: ReceiptLine[]): string {
  const titles = distinctTitles(items);
  if (titles.length === 1) return titles[0];
  const tool = items[0]?.tool ?? "";
  return countPhrase(tool, items.length);
}

// The plain-English subtitle under a burst, naming the purposes covered, never the raw commands and
// never just repeating the summary line.
export function burstSubtitle(items: ReceiptLine[]): string {
  const titles = distinctTitles(items);
  if (titles.length <= 1) return `Claude did this across ${items.length} steps.`;
  return `Claude worked through ${joinLower(titles)}.`;
}
