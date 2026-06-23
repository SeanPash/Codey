// A work phase, the unit Codey narrates in. Tool calls are noisy and low-level; a stage
// answers the question a person actually cares about: is Claude looking around, changing
// things, checking its work, or stuck. Every surface keys its wording off this.
export type Stage =
  | "inspecting"
  | "planning"
  | "editing"
  | "testing"
  | "debugging"
  | "summarizing"
  | "waiting";

// Shell programs that only look at things, never change them.
const READ_CMDS = new Set([
  "ls", "dir", "cat", "less", "more", "head", "tail", "grep", "rg", "find",
  "pwd", "cd", "echo", "which", "type", "stat", "wc", "tree", "env",
]);

// Shell programs that change files or repo state.
const WRITE_CMDS = new Set([
  "rm", "del", "unlink", "rmdir", "mkdir", "touch", "cp", "mv", "chmod", "chown", "ln",
]);

// Git subcommands that mutate the repo, as opposed to status/log/diff which only report.
const GIT_WRITE = new Set(["commit", "add", "push", "pull", "merge", "rebase", "reset", "checkout", "stash", "tag"]);

function firstWord(cmd: string): string {
  return (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
}

// Decide the stage a shell command belongs to from its program and intent.
function stageForBash(cmd: string): Stage {
  const word = firstWord(cmd);
  const rest = cmd.replace(/^\s*\S+\s*/, "");

  // Checking work: test runners, builds, typecheck, lint.
  if (/\b(test|vitest|jest|mocha|pytest)\b/.test(cmd)) return "testing";
  if (word === "npm" || word === "pnpm" || word === "yarn" || word === "npx") {
    if (/\b(build|typecheck|tsc|lint|eslint)\b/.test(rest)) return "testing";
    if (/\b(install|ci)\b|^\s*i\b/.test(rest)) return "editing";
    return "inspecting";
  }
  if (word === "tsc" || word === "eslint" || word === "prettier") return "testing";

  if (word === "git") {
    const sub = (rest.trim().split(/\s+/)[0] || "").toLowerCase();
    return GIT_WRITE.has(sub) ? "editing" : "inspecting";
  }

  if (WRITE_CMDS.has(word)) return "editing";
  if (READ_CMDS.has(word)) return "inspecting";

  // Anything unrecognised is treated as a look-around rather than a change, since a stray
  // command is more often a probe than a mutation.
  return "inspecting";
}

// Classify one tool call into a work stage. `isError` is the post event's outcome: a failed
// action means Claude is now working out what went wrong, so the stage shifts to debugging.
export function classifyStage(tool: string, input: unknown, isError = false): Stage {
  if (isError) return "debugging";

  if (tool === "thinking") return "planning";
  if (tool === "Task" || tool === "Agent") return "planning";

  switch (tool) {
    case "Read":
    case "NotebookRead":
    case "Grep":
    case "Glob":
      return "inspecting";
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return "editing";
    case "Bash": {
      const cmd = input && typeof input === "object" ? (input as Record<string, unknown>).command : null;
      return typeof cmd === "string" ? stageForBash(cmd) : "inspecting";
    }
  }

  return "inspecting";
}
