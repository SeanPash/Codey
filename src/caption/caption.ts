import type { Mode } from "../types.js";
import { stripDashes } from "../util/text.js";
import type { WorkChunk } from "./chunks.js";
import type { Stage } from "./stage.js";

// The one caption shape every surface renders from. `simple` is always a complete sentence;
// `deep` and `teach` layer on more only when the mode asks for them. The optional fields are
// the extras a richer surface (the browser timeline) can show without re-deriving anything.
export interface LiveCaption {
  stage: Stage;
  title: string;       // a short phrase for a heading or HUD chip
  simple: string;      // one plain-English sentence: what Claude is doing
  deep?: string;       // simple plus how it is approaching it or what changed
  teach?: string;      // deep plus a short explanation of the concept involved
  outcome?: string;    // what happened, when known (an error, a recovery)
  evidence?: string;   // the raw detail behind the caption, only when genuinely useful
}

interface Described {
  title: string;
  simple: string;
  deep: string;
  teach: string;
}

// Join a few names the way a person would speak them, and fall back to a stage noun when
// the names are too many or too few to read well.
function phraseTargets(targets: string[], fallback: string): string {
  const names = targets.filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return fallback;
}

function describe(chunk: WorkChunk): Described {
  const many = chunk.count > 1 || chunk.targets.length > 1;
  switch (chunk.stage) {
    case "inspecting": {
      const subject = phraseTargets(chunk.targets, "the code");
      return many
        ? {
            title: `Reading ${chunk.count} files`,
            simple: "Claude is checking several project files to understand how the code works.",
            deep: "Claude is reading through several project files to see how the pieces fit together before changing anything.",
            teach: "Claude is reading through several project files to see how the pieces fit together before changing anything. Reading the existing code first is how you avoid breaking something you did not know was there.",
          }
        : {
            title: `Reading ${subject}`,
            simple: `Claude is reading ${subject} to understand how it works.`,
            deep: `Claude is reading ${subject} to understand how it works before changing anything.`,
            teach: `Claude is reading ${subject} to understand how it works before changing anything. Reading the existing code first is how you avoid breaking something you did not know was there.`,
          };
    }
    case "editing": {
      const subject = phraseTargets(chunk.targets, "the code");
      return many
        ? {
            title: `Editing ${chunk.count} files`,
            simple: "Claude is editing several files to make the change.",
            deep: "Claude is editing several files, changing the code so it behaves the way the task needs.",
            teach: "Claude is editing several files, changing the code so it behaves the way the task needs. An edit rewrites part of a source file, and the change only takes effect once the code runs or is rebuilt.",
          }
        : {
            title: `Editing ${subject}`,
            simple: `Claude is editing ${subject} to make a change.`,
            deep: `Claude is editing ${subject}, changing the code so it behaves the way the task needs.`,
            teach: `Claude is editing ${subject}, changing the code so it behaves the way the task needs. An edit rewrites part of a source file, and the change only takes effect once the code runs or is rebuilt.`,
          };
    }
    case "testing": {
      const subject = chunk.targets.length === 1 ? chunk.targets[0] : "the tests";
      return {
        title: `Running ${subject}`,
        simple: `Claude is running ${subject} to check its work.`,
        deep: `Claude is running ${subject} to confirm the changes work and nothing else broke.`,
        teach: `Claude is running ${subject} to confirm the changes work and nothing else broke. Tests are small programs that check the real code behaves as expected, so a problem shows up right away.`,
      };
    }
    case "debugging":
      return {
        title: "Debugging",
        simple: "Claude hit an error and is working out what went wrong.",
        deep: "Claude is debugging, reading the error from a failed action and trying a different approach.",
        teach: "Claude is debugging, reading the error from a failed action and trying a different approach. Debugging is the loop of reading an error, guessing the cause, and testing a fix until it holds.",
      };
    case "planning":
      return {
        title: "Planning",
        simple: "Claude is thinking through what to do next.",
        deep: "Claude is planning its next step before changing any files.",
        teach: "Claude is planning its next step before changing any files. Thinking the work through first keeps the changes deliberate instead of guesswork.",
      };
    case "summarizing":
      return {
        title: "Wrapping up",
        simple: "Claude is wrapping up and pulling together what it did.",
        deep: "Claude is summarizing the work so the result is easy to follow.",
        teach: "Claude is summarizing the work so the result is easy to follow. A clear recap is what turns a pile of edits into something a person can review.",
      };
    case "waiting":
    default:
      return {
        title: "Getting started",
        simple: "Claude is getting started.",
        deep: "Claude is getting started on your request.",
        teach: "Claude is getting started on your request.",
      };
  }
}

// What happened, phrased plainly, only when the outcome is actually known.
function outcomeText(chunk: WorkChunk): string | undefined {
  if (chunk.failed && chunk.resolved) return "Claude hit an error and then recovered.";
  if (chunk.failed) return "The latest attempt errored.";
  return undefined;
}

// Build the caption for a chunk at the given mode. A real AI `why`, when present, is the
// better sentence (it carries the actual reason), so it takes the slot the mode narrates at:
// the headline in simple, the deeper line in deep and teach. Ask mode never uses it, keeping
// to free deterministic labels until the user pulls an explanation on demand.
export function buildCaption(chunk: WorkChunk, mode: Mode, why?: string | null): LiveCaption {
  const d = describe(chunk);
  const clean = why ? stripDashes(why) : null;
  const outcome = outcomeText(chunk);
  const evidence = chunk.count === 1 && chunk.raw ? chunk.raw : undefined;

  const caption: LiveCaption = { stage: chunk.stage, title: d.title, simple: d.simple, outcome, evidence };

  if (mode === "ask") return caption;

  if (mode === "simple") {
    if (clean) caption.simple = clean;
    return caption;
  }

  if (mode === "deep") {
    caption.deep = clean ?? d.deep;
    return caption;
  }

  // teach
  caption.deep = d.deep;
  caption.teach = clean ?? d.teach;
  return caption;
}
