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

// A literal search string (a Grep pattern or a quoted phrase) turned into a readable subject.
// "TOKEN BREAKDOWN" reads as "token breakdown", a code identifier like "validateUser" stays
// as written, and a dense regex returns null so the caller knows there is no plain subject.
// This is what lets a caption say what Claude was actually looking for, not "the code".
export function phraseSearch(literal: string): string | null {
  const raw = (literal ?? "").trim();
  if (!raw) return null;
  // Regex metacharacters mean this is a pattern, not a phrase a person reads as a subject.
  if (/[\\()[\]{}+?^$.*|]/.test(raw)) return null;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return null;
  if (words.length === 1) {
    const w = words[0];
    // A mixed-case identifier (validateUser, Priciest) is a real name; keep it. A shout in all
    // caps (TOKEN, SAVER) reads better lowercased.
    return /[a-z]/.test(w) ? w : w.toLowerCase();
  }
  return words.join(" ").toLowerCase();
}

// The collapsed-card headline: a short purpose label (verb + subject), 4 to 7 words. It is
// deterministic and stable on purpose, so titles do not shift around as explanations load.
export function purposeTitle(tool: string, stage: Stage, subject: string, count: number): string {
  const many = count > 1;
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? `Adding ${subject} and more` : `Updating ${subject} and more`;
      return adds ? `Adding ${subject}` : `Updating ${subject}`;
    }
    case "inspecting": {
      // A search or read that could not name its target must not collapse to the banned
      // "Checking the code". A nameless search reads as searching the project; a nameless read as
      // checking the project. A real subject (a file name, a search term) flows through unchanged.
      if (subject === "the code") {
        return tool === "Grep" || tool === "Glob" ? "Searching the project" : "Checking the project";
      }
      if (many) return `Checking ${subject} and more`;
      return `Checking ${subject}`;
    }
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

// One plain, neutral sentence for the subtitle: what Claude did, naming the real subject and,
// when we know it, the area of the codebase the file lives in (its folder). This is the
// deterministic floor; a generated AI sentence replaces it when one exists. It must stay
// concrete and never reach for the banned filler ("follow how it works", "adjust how it
// works"): when there is nothing specific to say, it still names the file and a real purpose.
export function purposeSentence(tool: string, stage: Stage, subject: string, count: number, area?: string): string {
  const many = count > 1;
  // "the statusline code", or just "it" when we cannot place the file in a folder.
  const place = area ? `the ${area} code` : "it";
  switch (stage) {
    case "editing": {
      const adds = tool === "Write" || tool === "NotebookEdit";
      if (many) return adds ? `Adding new files, starting with ${subject}.` : `Updating ${subject} and the files alongside it.`;
      if (adds) return `Creating ${subject}.`;
      return area ? `Editing ${subject} to change how ${place} behaves.` : `Editing ${subject} to change what it does.`;
    }
    case "inspecting":
      if (many) return `Reading ${subject} and the files alongside it to see how they work together.`;
      if (tool === "Grep" || tool === "Glob") {
        return subject === "the code" ? "Searching the project for the relevant code." : `Searching the project for ${subject}.`;
      }
      return area ? `Reading ${subject} to see what ${place} does.` : `Reading ${subject} to see what it does.`;
    case "testing":
      return `Running ${subject} to check it passes.`;
    case "debugging":
      return "Reading the error and trying a different approach.";
    case "planning":
      return "Working out the next step.";
    case "summarizing":
      return "Pulling the work together into a clear recap.";
    case "waiting":
    default:
      return "Getting started on the request.";
  }
}
