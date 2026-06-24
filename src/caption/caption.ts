import type { Mode } from "../types.js";
import { stripDashes } from "../util/text.js";
import type { WorkChunk } from "./chunks.js";
import type { Stage } from "./stage.js";
import { humanFile, phrasePattern, phraseSearch, purposeTitle, joinNames } from "./subject.js";
import { describeShellIntent } from "./shell.js";

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

// The best short subject for this chunk: a search pattern phrased plainly, otherwise the
// humanized name of the first thing touched.
function subjectOf(chunk: WorkChunk): string {
  if (chunk.tool === "Grep" || chunk.tool === "Glob") return phrasePattern(chunk.raw ?? "");
  return humanFile(chunk.targets[0] ?? "") || "the code";
}

// The files this chunk touched, named the way a person would say them. Falls back to a plain
// phrase only when there is genuinely nothing to name.
function namedTargets(chunk: WorkChunk): string {
  return joinNames(chunk.targets.map(humanFile)) || "the code";
}

// What the chunk searched for, phrased plainly: "token breakdown, active terminal, and saver".
// Empty when the chunk did no search or every pattern was a dense regex with no readable subject.
function namedSearches(chunk: WorkChunk): string {
  const phrases = chunk.searches.map(phraseSearch).filter((p): p is string => !!p);
  return joinNames(phrases);
}

function describe(chunk: WorkChunk): Described {
  // A single shell command knows its own purpose better than any stage template can phrase it,
  // so use the shell intent's title and sentence directly instead of "reading X to understand
  // the code". The teach line adds why the step matters for that stage.
  if ((chunk.tool === "Bash" || chunk.tool === "PowerShell") && chunk.count === 1 && chunk.raw) {
    const intent = describeShellIntent(chunk.raw);
    return { title: intent.title, simple: intent.sentence, deep: intent.sentence, teach: intent.sentence };
  }

  const subject = subjectOf(chunk);
  const names = namedTargets(chunk);
  const single = chunk.targets.length <= 1 && chunk.count <= 1;
  // The chip title names the lead one or two files for a grouped run, so it stays short while
  // still being concrete: "Updating caption.ts and render.ts", not a vague count.
  const groupSubject = chunk.targets.length ? joinNames(chunk.targets.map(humanFile), 2) : subject;
  const title = single
    ? purposeTitle(chunk.tool, chunk.stage, subject, chunk.count)
    : purposeTitle(chunk.tool, chunk.stage, groupSubject, 1);

  switch (chunk.stage) {
    case "inspecting": {
      // A run that searched for specific terms names them: this is the strongest context a
      // deterministic caption has, so it leads with what Claude was actually looking for and,
      // when it also opened a file, where it was looking.
      const searches = namedSearches(chunk);
      if (searches) {
        const where = chunk.targets.length ? namedTargets(chunk) : "the project";
        return {
          title: chunk.targets.length ? `Searching ${humanFile(chunk.targets[0])}` : "Searching the project",
          simple: `Claude is searching ${where} for ${searches}.`,
          deep: `Claude is searching ${where} for ${searches} to land on the right section before editing it.`,
          teach: `Claude is searching ${where} for ${searches} to land on the right section before editing it. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`,
        };
      }
      if (chunk.tool === "Grep" || chunk.tool === "Glob") {
        return {
          title,
          simple: `Claude is searching ${subject === "the code" ? "the project" : `the project for ${subject}`}.`,
          deep: `Claude is searching the project to find where ${subject === "the code" ? "the relevant code" : subject} is used.`,
          teach: `Claude is searching the project to find where ${subject === "the code" ? "the relevant code" : subject} is used. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`,
        };
      }
      if (single) {
        return {
          title,
          simple: `Claude is reading ${names}.`,
          deep: `Claude is reading ${names} to find the part it needs before editing it.`,
          teach: `Claude is reading ${names} to find the part it needs before editing it. Reading the existing code first is how you avoid breaking something you did not know was there.`,
        };
      }
      return {
        title,
        simple: `Claude is reading ${names}.`,
        deep: `Claude is reading ${names} to map how they connect before editing them.`,
        teach: `Claude is reading ${names} to map how they connect before editing them. Reading the existing code first is how you avoid breaking something you did not know was there.`,
      };
    }
    case "editing": {
      const adds = chunk.tool === "Write" || chunk.tool === "NotebookEdit";
      if (single) {
        if (adds) {
          return {
            title,
            simple: `Claude is creating ${names}.`,
            deep: `Claude is creating ${names} and writing its initial contents.`,
            teach: `Claude is creating ${names} and writing its initial contents. A new file does nothing until something imports or runs it.`,
          };
        }
        return {
          title,
          simple: `Claude is updating ${names}.`,
          deep: `Claude is editing ${names}, changing specific lines in place.`,
          teach: `Claude is editing ${names}, changing specific lines in place. An edit only takes effect once the code runs or is rebuilt.`,
        };
      }
      if (adds) {
        return {
          title,
          simple: `Claude is creating ${names}.`,
          deep: `Claude is creating ${names} as a set of new files for one piece of work.`,
          teach: `Claude is creating ${names} as a set of new files for one piece of work. A new file does nothing until something imports or runs it.`,
        };
      }
      return {
        title,
        simple: `Claude is updating ${names}.`,
        deep: `Claude is updating ${names} together so they stay consistent.`,
        teach: `Claude is updating ${names} together so they stay consistent. Keeping related files aligned is what stops a change in one place from breaking another.`,
      };
    }
    case "testing":
      return {
        title,
        simple: `Claude is running ${subject} to check its work.`,
        deep: `Claude is running ${subject} to confirm the changes work and nothing else broke.`,
        teach: `Claude is running ${subject} to confirm the changes work and nothing else broke. Tests are small programs that check the real code behaves as expected, so a problem shows up right away.`,
      };
    case "debugging":
      return {
        title,
        simple: "Claude hit an error and is working out what went wrong.",
        deep: "Claude is debugging, reading the error from a failed action and trying a different approach.",
        teach: "Claude is debugging, reading the error from a failed action and trying a different approach. Debugging is the loop of reading an error, guessing the cause, and testing a fix until it holds.",
      };
    case "planning":
      return {
        title,
        simple: "Claude is thinking through what to do next.",
        deep: "Claude is planning its next step before changing any files.",
        teach: "Claude is planning its next step before changing any files. Thinking the work through first keeps the changes deliberate instead of guesswork.",
      };
    case "summarizing":
      return {
        title,
        simple: "Claude is wrapping up and pulling together what it did.",
        deep: "Claude is summarizing the work so the result is easy to follow.",
        teach: "Claude is summarizing the work so the result is easy to follow. A clear recap is what turns a pile of edits into something a person can review.",
      };
    case "waiting":
    default:
      return {
        title,
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
