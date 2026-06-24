import type { ToolEvent } from "../types.js";
import { humanFile, joinNames } from "./subject.js";

// A done-state recap built from what actually happened, not from Claude's chat reply. It stays
// honest by construction: it only says "Updated" or "Created" when an edit ran, and only
// "verified" when a test or build ran. When Claude just looked around, it says "Inspected", so
// the close never overclaims. The statusline shows `sentence`; the browser shows the sections.
export interface Recap {
  sentence: string;    // one short, honest line for the statusline
  changed: string[];   // files created or edited (basenames), for the "Files touched" section
  verified: string[];  // verification steps that ran ("the tests", "the build")
  inspected: string[]; // files only read, for an investigate-only close
}

function basename(p: string): string {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function filePath(input: unknown): string | null {
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>;
    const v = o.file_path ?? o.path;
    if (typeof v === "string") return basename(v);
  }
  return null;
}

function command(input: unknown): string | null {
  if (input && typeof input === "object") {
    const c = (input as Record<string, unknown>).command;
    if (typeof c === "string") return c;
  }
  return null;
}

// The verification a command performs, or null when it is not a check. Kept deterministic and
// narrow on purpose: only test, build, and type/lint runs count as "verified".
function verificationOf(cmd: string): string | null {
  if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) return "the tests";
  if (/\bbuild\b/.test(cmd)) return "the build";
  if (/\b(typecheck|tsc|lint|eslint)\b/.test(cmd)) return "the checks";
  return null;
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

export function buildRecap(events: ToolEvent[]): Recap {
  const created: string[] = [];
  const edited: string[] = [];
  const verified: string[] = [];
  const inspected: string[] = [];

  for (const e of events) {
    if (e.phase !== "pre") continue;
    switch (e.tool) {
      case "Write":
      case "NotebookEdit": {
        const f = filePath(e.input);
        if (f) pushUnique(created, f);
        break;
      }
      case "Edit":
      case "MultiEdit": {
        const f = filePath(e.input);
        if (f) pushUnique(edited, f);
        break;
      }
      case "Read":
      case "NotebookRead": {
        const f = filePath(e.input);
        if (f) pushUnique(inspected, f);
        break;
      }
      case "Bash":
      case "PowerShell": {
        const cmd = command(e.input);
        const v = cmd ? verificationOf(cmd) : null;
        if (v) pushUnique(verified, v);
        break;
      }
    }
  }

  const changed = [...edited, ...created];
  const changedNames = joinNames(changed.map(humanFile), 3);
  const verifiedNames = joinNames(verified, 2);

  let sentence: string;
  if (changed.length) {
    // "Created" only when every change was a brand-new file; otherwise it was an update.
    const verb = edited.length === 0 ? "Created" : "Updated";
    sentence = `${verb} ${changedNames}`;
    if (verified.length) sentence += `, verified with ${verifiedNames}`;
    sentence += ".";
  } else if (verified.length) {
    sentence = `Ran ${verifiedNames}.`;
  } else if (inspected.length) {
    sentence = `Inspected ${joinNames(inspected.map(humanFile), 3)}.`;
  } else {
    sentence = "Finished the request.";
  }

  return { sentence, changed, verified, inspected };
}
