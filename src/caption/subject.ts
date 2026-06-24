import type { Stage } from "./stage.js";

// The shared "what is Claude working on" layer. Every surface (statusline, watch, browser
// timeline) names the work through these helpers, so they all speak the same language and
// the wording is grounded in real evidence: file names, search patterns, and command text.
// Nothing here guesses at file contents; a missing detail falls back to an honest phrase.

// Join a few names the way a person would say them, with an Oxford comma. A long list is
// trimmed to the first few plus a count so the line never sprawls.
export function joinNames(names: string[], max = 4): string {
  // Drop blanks and repeats, so a folded run never reads "the config and the config".
  const seen = new Set<string>();
  const list = names.filter((n) => n && !seen.has(n) && (seen.add(n), true));
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length <= max) return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  const shown = list.slice(0, max - 1);
  return `${shown.join(", ")}, and ${list.length - shown.length} more`;
}

// A file basename turned into a readable noun. Test and spec files become "X tests"; a
// README is named plainly; anything already phrased in words (a bash subject like "the
// tests") passes straight through. Ordinary source files keep their name, since inventing
// a noun for them would be a guess.
export function humanFile(name: string): string {
  if (!name) return name;
  if (name.includes(" ")) return name; // already a plain phrase, not a file name
  const test = /^(.+)\.(test|spec)\.[jt]sx?$/.exec(name);
  if (test) return `${test[1]} tests`;
  if (/^readme(\.|$)/i.test(name)) return "the README";
  return name;
}

// Strip the metacharacters a person does not read as part of the subject.
function patternTokens(pattern: string): string[] {
  return pattern
    .replace(/\\[a-z]/gi, " ") // regex classes like \s \w
    .split(/[^A-Za-z0-9_]+/)
    .filter((t) => t.length >= 2);
}

// Extensions are noise in a search subject ("watch", not "watch ts").
const EXT_NOISE = new Set(["js", "ts", "jsx", "tsx", "mjs", "cjs", "json", "md", "css", "html"]);

// A search pattern (Grep regex or Glob) phrased as the thing being looked for. A clean
// identifier or short alternation reads as-is; a dense regex falls back to "the code".
export function phrasePattern(pattern: string): string {
  const raw = (pattern ?? "").trim();
  if (!raw) return "the code";
  // A real regex (backslashes, character classes, anchors, quantifiers) does not read as a
  // subject. Only a plain identifier, glob, or alternation gets phrased.
  if (/[\\()\[\]+?^$]/.test(raw)) return "the code";
  // Drop bare file extensions; a glob like **/*.ts is about "the code", not "ts".
  const tokens = patternTokens(raw).filter((t) => !EXT_NOISE.has(t.toLowerCase()));
  if (tokens.length === 0 || tokens.length > 4) return "the code";
  return joinNames(tokens);
}

// The collapsed-card headline: a short purpose label (verb + subject), 4 to 7 words. It is
// deterministic and stable on purpose, so titles do not shift around as explanations load.
export function purposeTitle(tool: string, stage: Stage, subject: string, count: number): string {
  const many = count > 1;
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? "Creating several files" : "Updating several files";
      return adds ? `Adding ${subject}` : `Updating ${subject}`;
    }
    case "inspecting":
      if (many) return "Checking several files";
      return `Checking ${subject}`;
    case "testing":
      return `Verifying ${subject}`;
    case "debugging":
      return "Working through an error";
    case "planning":
      return "Planning the next step";
    case "summarizing":
      return "Wrapping up";
    case "waiting":
    default:
      return "Getting started";
  }
}

// One plain, neutral sentence for the subtitle: what Claude did, naming the real subject.
// This is the deterministic floor; a generated AI sentence replaces it when one exists.
export function purposeSentence(tool: string, stage: Stage, subject: string, count: number): string {
  const many = count > 1;
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? "Adding several new files to the project." : "Editing several related files.";
      return adds ? `Creating ${subject}.` : `Changing ${subject} to adjust how it works.`;
    }
    case "inspecting":
      if (many) return "Reading through several files to follow how the code fits together.";
      if (tool === "Grep" || tool === "Glob") return `Searching the project for ${subject}.`;
      return `Reading ${subject} to follow how it works.`;
    case "testing":
      return `Running ${subject} to check it passes.`;
    case "debugging":
      return "Reading the error and trying a different approach.";
    case "planning":
      return "Working out the next step before changing anything.";
    case "summarizing":
      return "Pulling the work together into a clear recap.";
    case "waiting":
    default:
      return "Getting started on the request.";
  }
}
