import type { Mode } from "../types.js";
import { stripDashes } from "../util/text.js";
import type { WorkChunk } from "./chunks.js";
import type { Stage } from "./stage.js";
import { featureArea, humanFile, phrasePattern, phraseSearch, purposeTitle, joinNames } from "./subject.js";
import { describeShellIntent } from "./shell.js";
import { inferPurpose, type PurposeEvidence } from "./purpose.js";
import { stripEllipsis, looksLikeEvidenceDump, tidySubject } from "./sanitize.js";

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
// humanized name of the first thing touched. A shell-derived subject is tidied so a long
// description never leaks into the sentence as a raw phrase.
function subjectOf(chunk: WorkChunk): string {
  if (chunk.tool === "Grep" || chunk.tool === "Glob") return phrasePattern(chunk.raw ?? "");
  return tidySubject(humanFile(chunk.targets[0] ?? "")) || "the code";
}

// The files this chunk touched, named the way a person would say them. Each name is tidied so a
// shell description folded into a target stays a short noun, never a sprawling list item. Falls
// back to a plain phrase only when there is genuinely nothing to name.
function namedTargets(chunk: WorkChunk): string {
  return joinNames(chunk.targets.map((t) => tidySubject(humanFile(t)))) || "the code";
}

// What the chunk searched for, phrased plainly: "token breakdown, active terminal, and saver".
// Empty when the chunk did no search or every pattern was a dense regex with no readable subject.
function namedSearches(chunk: WorkChunk): string {
  const phrases = chunk.searches.map(phraseSearch).filter((p): p is string => !!p);
  return joinNames(phrases);
}

// The names a change introduced ("mean", "clipStage and DONE_FOOTER"), the strongest evidence
// an editing caption has. Empty when the change added nothing nameable.
function namedSymbols(chunk: WorkChunk, max = 2): string {
  return joinNames(chunk.symbols ?? [], max);
}

// When the first file touched is a test, its module name ("math" from "math.test.js"), so a
// caption can say "the math tests" instead of repeating the filename. Null for non-test files.
function testModule(chunk: WorkChunk): string | null {
  const m = /^(.+)\.(test|spec)\.[jt]sx?$/.exec(chunk.targets[0] ?? "");
  return m ? m[1] : null;
}

// Pool the chunk's evidence for the domain recognizers: file and shell subjects, the literal
// search terms, any symbols a change named, and the first command. This is what lets a caption
// recognize a known investigation (a stale-cache hunt, a session-storage check) rather than
// settling for "reading index.html".
function purposeEvidence(chunk: WorkChunk): PurposeEvidence {
  return {
    stage: chunk.stage,
    tool: chunk.tool,
    targets: chunk.targets,
    searches: chunk.searches,
    symbols: chunk.symbols ?? [],
    command: chunk.tool === "Bash" || chunk.tool === "PowerShell" ? chunk.raw : null,
  };
}

function describe(chunk: WorkChunk): Described {
  // A recognized investigation says what Claude is actually trying to confirm, with a fully
  // differentiated simple/deep/teach. It is the strongest deterministic line we have, so it wins
  // over the generic stage templates whenever its signals are present.
  const purpose = inferPurpose(purposeEvidence(chunk));
  if (purpose) return purpose;

  // A single shell command knows its own purpose better than any stage template can phrase it,
  // so use the shell intent's title and sentence directly instead of "reading X to understand
  // the code". The teach line adds why the step matters for that stage.
  if ((chunk.tool === "Bash" || chunk.tool === "PowerShell") && chunk.count === 1 && chunk.raw) {
    const intent = describeShellIntent(chunk.raw);
    // Each depth is genuinely different: simple says what, deep adds why this step matters, teach
    // adds the concept. Deep mode never reads as simple with a longer tail.
    return { title: intent.title, simple: intent.sentence, deep: intent.deep, teach: intent.teach };
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
          simple: `Searching ${where} for ${searches}.`,
          deep: `Searching ${where} for ${searches} to find the files and call sites that use those names.`,
          teach: `Searching ${where} for ${searches} to find the files and call sites that use those names. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`,
        };
      }
      if (chunk.tool === "Grep" || chunk.tool === "Glob") {
        return {
          title,
          simple: `Searching ${subject === "the code" ? "the project" : `the project for ${subject}`}.`,
          deep: `Searching the project to find the files that match ${subject === "the code" ? "the current pattern" : subject}.`,
          teach: `Searching the project to find the files that match ${subject === "the code" ? "the current pattern" : subject}. Searching first shows every spot a change would touch, so nothing nearby breaks by surprise.`,
        };
      }
      if (single) {
        const feature = featureArea(names);
        return {
          title,
          simple: `Reading ${names}.`,
          deep: `Reading ${names} to locate the ${feature} code path.`,
          teach: `Reading ${names} to locate the ${feature} code path. Reading the existing code first is how you avoid breaking something you did not know was there.`,
        };
      }
      return {
        title,
        simple: `Reading ${names}.`,
        deep: `Reading ${names} to trace the shared code path before editing it.`,
        teach: `Reading ${names} to trace the shared code path before editing it. Reading the existing code first is how you avoid breaking something you did not know was there.`,
      };
    }
    case "editing": {
      const adds = chunk.tool === "Write" || chunk.tool === "NotebookEdit";
      const sym = (chunk.symbols ?? [])[0] ?? null;
      const syms = namedSymbols(chunk);
      const mod = testModule(chunk);
      if (single) {
        if (adds) {
          if (sym) {
            return {
              title,
              simple: `Creating ${names}, starting with ${sym}.`,
              deep: `Creating ${names} and writing ${sym} into it.`,
              teach: `Creating ${names} and writing ${sym} into it. A new file does nothing until something imports or runs it.`,
            };
          }
          return {
            title,
            simple: `Creating ${names}.`,
            deep: `Creating ${names} and writing its initial contents.`,
            teach: `Creating ${names} and writing its initial contents. A new file does nothing until something imports or runs it.`,
          };
        }
        // A change to a test file is best described by the behavior it now covers.
        if (sym && mod) {
          return {
            title,
            simple: `Adding a ${sym} test to the ${mod} tests.`,
            deep: `Adding a ${sym} test so the ${mod} module verifies ${sym}.`,
            teach: `Adding a ${sym} test so the ${mod} module verifies ${sym}. A test is a small program that checks the real code, so a problem with ${sym} shows up right away.`,
          };
        }
        if (sym) {
          return {
            title,
            simple: `Updating ${sym} in ${names}.`,
            deep: `Updating ${sym} in ${names} to change how it behaves.`,
            teach: `Updating ${sym} in ${names} to change how it behaves. An edit only takes effect once the code runs or is rebuilt.`,
          };
        }
        return {
          title,
          simple: `Updating ${names}.`,
          deep: `Updating ${names} to change how it behaves.`,
          teach: `Updating ${names} to change how it behaves. An edit only takes effect once the code runs or is rebuilt.`,
        };
      }
      if (adds) {
        return {
          title,
          simple: `Creating ${names}.`,
          deep: `Creating ${names} as a set of new files for one piece of work.`,
          teach: `Creating ${names} as a set of new files for one piece of work. A new file does nothing until something imports or runs it.`,
        };
      }
      if (syms) {
        return {
          title,
          simple: `Updating ${names} around ${syms}.`,
          deep: `Updating ${names} together so ${syms} stay consistent.`,
          teach: `Updating ${names} together so ${syms} stay consistent. Keeping related files aligned is what stops a change in one place from breaking another.`,
        };
      }
      return {
        title,
        simple: `Updating ${names}.`,
        deep: `Updating ${names} together so they stay consistent.`,
        teach: `Updating ${names} together so they stay consistent. Keeping related files aligned is what stops a change in one place from breaking another.`,
      };
    }
    case "testing":
      return {
        title,
        simple: `Running ${subject} to check the changed code.`,
        deep: `Running ${subject} to confirm the changed code passes its checks.`,
        teach: `Running ${subject} to confirm the changed code passes its checks. Tests are small programs that check the real code behaves as expected, so a problem shows up right away.`,
      };
    case "debugging":
      return {
        title,
        simple: "Reading the failed action and narrowing down what went wrong.",
        deep: "Debugging by reading the error from a failed action and trying a different approach.",
        teach: "Debugging by reading the error from a failed action and trying a different approach. Debugging is the loop of reading an error, guessing the cause, and testing a fix until it holds.",
      };
    case "planning":
      return {
        title,
        simple: "Planning the next recorded action.",
        deep: "Planning the next recorded action from the current task state.",
        teach: "Planning the next recorded action from the current task state. A short planning beat keeps the next edit or command tied to the task instead of guesswork.",
      };
    case "summarizing":
      return {
        title,
        simple: "Wrapping up and pulling together the changed files and checks.",
        deep: "Summarizing the changed files and verification so the result is reviewable.",
        teach: "Summarizing the changed files and verification so the result is reviewable. A clear recap is what turns a pile of edits into something a person can review.",
      };
    case "waiting":
    default:
      return {
        title,
        simple: "Starting the request.",
        deep: "Starting the request and waiting for the first recorded action.",
        teach: "Starting the request and waiting for the first recorded action.",
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
// the headline in simple, the deeper line in deep and teach. With no `why` it stays on the
// free deterministic labels.
export function buildCaption(chunk: WorkChunk, mode: Mode, why?: string | null): LiveCaption {
  const d = describe(chunk);
  // A generated why is only used when it reads as a phrased thought. One that comes back as a raw
  // command or a long comma list of internals is rejected here, so deep and teach fall back to the
  // clean deterministic line instead of printing a debug dump on the status line.
  const cleaned = why ? stripEllipsis(stripDashes(why)) : null;
  const clean = cleaned && !looksLikeEvidenceDump(cleaned) ? cleaned : null;
  const outcome = outcomeText(chunk);
  const evidence = chunk.count === 1 && chunk.raw ? chunk.raw : undefined;

  const caption: LiveCaption = {
    stage: chunk.stage,
    title: d.title,
    simple: stripEllipsis(d.simple),
    outcome,
    evidence,
  };

  if (mode === "simple") {
    if (clean) caption.simple = clean;
    return caption;
  }

  if (mode === "deep") {
    caption.deep = clean ?? stripEllipsis(d.deep);
    return caption;
  }

  // teach
  caption.deep = stripEllipsis(d.deep);
  caption.teach = clean ?? stripEllipsis(d.teach);
  return caption;
}
