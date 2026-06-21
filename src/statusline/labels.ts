export interface ActionLabel {
  tag: string; // a verb phrase: reading, editing, removing, searching for, ...
  target: string; // the thing being acted on, phrased as plain English
}

function basename(p: string): string {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function str(input: unknown, key: string): string | null {
  if (input && typeof input === "object") {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return null;
}

function shorten(s: string, n = 32): string {
  const line = s.trim().split("\n")[0];
  return line.length > n ? line.slice(0, n - 1) + "…" : line;
}

// Pull the most likely file/path argument out of a shell command: the first
// quoted string, else the last token that is not a flag.
function pathArg(cmd: string): string | null {
  const quoted = cmd.match(/["']([^"']+)["']/);
  if (quoted) return basename(quoted[1]);
  const tokens = cmd.trim().split(/\s+/).slice(1).filter((t) => !t.startsWith("-"));
  const last = tokens[tokens.length - 1];
  return last ? basename(last) : null;
}

// A command that chains, pipes, redirects, or loops is not one tidy action. Spotting
// these keeps us from picking a file out of an `echo` string or echoing raw shell into
// the task line; the full command still shows on the "raw" line for anyone who wants it.
function isCompound(cmd: string): boolean {
  return /[;|\n]|&&|\|\||\$\(|`/.test(cmd) || /^\s*(for|while|until|if|case)\b/.test(cmd);
}

// Turn a shell command into a plain-English action. Covers the common cases and falls
// back to an honest, readable phrase (never raw shell) for anything unrecognised.
function describeBash(cmd: string): ActionLabel {
  if (isCompound(cmd)) {
    if (/^\s*(for|while|until)\b/.test(cmd)) return { tag: "running", target: "a shell loop" };
    return { tag: "running", target: "a few shell commands" };
  }
  const word = (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
  const name = pathArg(cmd);
  const file = (verb: string, fallback: string) => ({ tag: verb, target: name ? `the file ${name}` : fallback });
  const folder = (verb: string, fallback: string) => ({ tag: verb, target: name ? `the folder ${name}` : fallback });

  switch (word) {
    case "rm":
    case "del":
    case "unlink":
      return file("removing", "a file");
    case "rmdir":
      return folder("removing", "a folder");
    case "mkdir":
      return folder("creating", "a folder");
    case "touch":
      return file("creating", "a file");
    case "cp":
      return file("copying", "a file");
    case "mv":
      return file("moving", "a file");
    case "cat":
    case "less":
    case "more":
    case "head":
    case "tail":
      return file("reading", "a file");
    case "cd":
      return folder("switching to", "a folder");
    case "ls":
    case "dir":
      return { tag: "listing", target: "the files here" };
    case "git": {
      const sub = cmd.trim().split(/\s+/)[1] || "";
      return { tag: "running", target: sub ? `git ${sub}` : "a git command" };
    }
    case "npm":
    case "pnpm":
    case "yarn":
    case "npx": {
      const rest = cmd.replace(/^\s*\S+\s*/, "");
      if (/\b(test|vitest|jest)\b/.test(rest)) return { tag: "running", target: "the tests" };
      if (/\b(install|ci)\b|^\s*i\b/.test(rest)) return { tag: "installing", target: "dependencies" };
      if (/\bbuild\b/.test(rest)) return { tag: "running", target: "the build" };
      const run = rest.match(/run\s+(\S+)/);
      if (run) return { tag: "running", target: `the ${run[1]} script` };
      return { tag: "running", target: `the command ${shorten(cmd)}` };
    }
    case "node":
    case "python":
    case "python3":
    case "tsx":
    case "ts-node":
    case "deno":
    case "bun":
      return { tag: "running", target: name ?? "a script" };
    case "curl":
    case "wget":
      return { tag: "fetching", target: "something from the web" };
    case "grep":
    case "rg":
    case "find":
      return { tag: "searching", target: "through the files" };
    case "echo":
      return { tag: "printing", target: "to the terminal" };
  }
  // A single unrecognised program: name it plainly instead of echoing its arguments.
  return word ? { tag: "running", target: `the ${word} command` } : { tag: "running", target: "a shell command" };
}

// The literal detail behind the friendly label: the full path or command, unshortened.
export function rawTarget(tool: string, input: unknown): string | null {
  const file = str(input, "file_path") ?? str(input, "path");
  switch (tool) {
    case "Read":
    case "Edit":
    case "MultiEdit":
    case "Write":
      return file;
    case "Bash":
      return str(input, "command");
    case "Grep":
    case "Glob":
      return str(input, "pattern");
  }
  return null;
}

export function actionLabel(tool: string, input: unknown): ActionLabel {
  const file = str(input, "file_path") ?? str(input, "path");
  const named = (verb: string) => ({ tag: verb, target: file ? `the file ${basename(file)}` : "a file" });
  switch (tool) {
    case "Read":
      return named("reading");
    case "Edit":
    case "MultiEdit":
      return named("editing");
    case "Write":
      return named("writing");
    case "Bash": {
      const c = str(input, "command");
      return c ? describeBash(c) : { tag: "running", target: "a command" };
    }
    case "Grep":
    case "Glob": {
      const p = str(input, "pattern");
      // A plain word or path reads fine ("searching for validateUser"); a regex or glob
      // full of metacharacters does not, so fall back to a generic phrase for those.
      if (p && /^[\w.\-/ ]+$/.test(p) && p.length <= 40) return { tag: "searching for", target: p };
      return tool === "Glob"
        ? { tag: "looking for", target: "files" }
        : { tag: "searching", target: "the code" };
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return { tag: "using", target: `${m[2].replace(/_/g, " ")} (${m[1]})` };
  return { tag: "using", target: tool };
}

// Past-tense forms for the finished-task rows, where the verb reads better as
// "read rules.md" than "reading rules.md". Unknown verbs fall through unchanged.
const PAST: Record<string, string> = {
  reading: "read",
  writing: "wrote",
  editing: "edited",
  removing: "removed",
  creating: "created",
  copying: "copied",
  moving: "moved",
  listing: "listed",
  running: "ran",
  installing: "installed",
  fetching: "fetched",
  printing: "printed",
  searching: "searched",
  "searching for": "searched for",
  "looking for": "looked for",
  "switching to": "switched to",
  using: "used",
  asking: "asked",
};

export function pastTense(tag: string): string {
  return PAST[tag] ?? tag;
}

// Drop the friendly prefix so done rows read tight: "the file rules.md" -> "rules.md".
export function shortTarget(target: string): string {
  return target.replace(/^the (file|folder) /, "");
}
