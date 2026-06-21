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

// Turn a shell command into a plain-English action. Covers the common cases and
// falls back to a readable "running the command ..." for anything unrecognised.
function describeBash(cmd: string): ActionLabel {
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
  return { tag: "running", target: `the command ${shorten(cmd)}` };
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
      return { tag: "searching for", target: p ?? "something in the code" };
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return { tag: "using", target: `${m[2].replace(/_/g, " ")} (${m[1]})` };
  return { tag: "using", target: tool };
}
