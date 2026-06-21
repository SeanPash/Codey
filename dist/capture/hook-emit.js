import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/hook-emit.ts
import { pathToFileURL } from "node:url";

// src/capture/normalize.ts
import { randomUUID } from "node:crypto";

// src/util/hash.ts
import { createHash } from "node:crypto";
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}
function inputHash(tool, input) {
  return createHash("sha256").update(tool + " " + stableStringify(input)).digest("hex").slice(0, 16);
}

// src/capture/normalize.ts
function serverOf(tool) {
  const m = /^mcp__([^_]+)__/.exec(tool);
  return m ? m[1] : null;
}
function extractError(resp) {
  if (resp && typeof resp === "object") {
    const r = resp;
    if (typeof r.error === "string") return r.error;
    if (r.is_error === true && typeof r.content === "string") return r.content;
  }
  return null;
}
function normalizeHookEvent(raw) {
  const phase = raw.hook_event_name === "PostToolUse" ? "post" : "pre";
  const tool = raw.tool_name ?? "unknown";
  const errorText = phase === "post" ? extractError(raw.tool_response) : null;
  return {
    id: randomUUID(),
    phase,
    tool,
    server: serverOf(tool),
    input: raw.tool_input ?? null,
    inputHash: inputHash(tool, raw.tool_input ?? null),
    isError: errorText !== null,
    errorText,
    timestamp: Date.now(),
    sessionId: raw.session_id ?? "unknown",
    toolUseId: raw.tool_use_id ?? null
  };
}

// src/store/session-store.ts
import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
function defaultRoot() {
  return join(homedir(), ".codey", "sessions");
}
var SessionStore = class {
  file;
  constructor(sessionId, root = defaultRoot()) {
    const dir = join(root, sessionId);
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "events.jsonl");
  }
  append(event) {
    appendFileSync(this.file, JSON.stringify(event) + "\n");
  }
  readAll() {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, "utf8").split("\n").filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  }
  get path() {
    return this.file;
  }
  get dir() {
    return dirname(this.file);
  }
};

// src/store/session-meta.ts
import { writeFileSync, readFileSync as readFileSync2, mkdirSync as mkdirSync2, existsSync as existsSync2 } from "node:fs";
import { join as join2 } from "node:path";
function metaPath(sessionId, root) {
  return join2(root, sessionId, "meta.json");
}
function writeMetaIfAbsent(meta, root = defaultRoot()) {
  const file2 = metaPath(meta.sessionId, root);
  if (existsSync2(file2)) return;
  mkdirSync2(join2(root, meta.sessionId), { recursive: true });
  writeFileSync(file2, JSON.stringify(meta, null, 2));
}

// src/statusline/state.ts
import { readFileSync as readFileSync3, writeFileSync as writeFileSync2, existsSync as existsSync3 } from "node:fs";
import { join as join3 } from "node:path";
function file(dir) {
  return join3(dir, "statusline.json");
}
function writeStatus(dir, snap) {
  writeFileSync2(file(dir), JSON.stringify(snap));
}
function patchStatus(dir, patch) {
  const current = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  writeStatus(dir, { ...current, ...patch, updatedAt: Date.now() });
}
function readStatus(dir) {
  const p = file(dir);
  if (!existsSync3(p)) return null;
  try {
    return JSON.parse(readFileSync3(p, "utf8"));
  } catch {
    return null;
  }
}

// src/statusline/labels.ts
function basename(p) {
  const parts = p.replace(/["']/g, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function str(input, key) {
  if (input && typeof input === "object") {
    const v = input[key];
    if (typeof v === "string") return v;
  }
  return null;
}
function shorten(s, n = 32) {
  const line = s.trim().split("\n")[0];
  return line.length > n ? line.slice(0, n - 1) + "\u2026" : line;
}
function pathArg(cmd) {
  const quoted = cmd.match(/["']([^"']+)["']/);
  if (quoted) return basename(quoted[1]);
  const tokens = cmd.trim().split(/\s+/).slice(1).filter((t) => !t.startsWith("-"));
  const last = tokens[tokens.length - 1];
  return last ? basename(last) : null;
}
function describeBash(cmd) {
  const word = (cmd.trim().split(/\s+/)[0] || "").split(/[\\/]/).pop() || "";
  const name = pathArg(cmd);
  const file2 = (verb, fallback) => ({ tag: verb, target: name ? `the file ${name}` : fallback });
  const folder = (verb, fallback) => ({ tag: verb, target: name ? `the folder ${name}` : fallback });
  switch (word) {
    case "rm":
    case "del":
    case "unlink":
      return file2("removing", "a file");
    case "rmdir":
      return folder("removing", "a folder");
    case "mkdir":
      return folder("creating", "a folder");
    case "touch":
      return file2("creating", "a file");
    case "cp":
      return file2("copying", "a file");
    case "mv":
      return file2("moving", "a file");
    case "cat":
    case "less":
    case "more":
    case "head":
    case "tail":
      return file2("reading", "a file");
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
function actionLabel(tool, input) {
  const file2 = str(input, "file_path") ?? str(input, "path");
  const named = (verb) => ({ tag: verb, target: file2 ? `the file ${basename(file2)}` : "a file" });
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

// src/statusline/from-event.ts
function actionFromEvent(e) {
  if (e.phase !== "pre") return null;
  return actionLabel(e.tool, e.input);
}

// src/capture/hook-emit.ts
function handleHookInput(rawJson, root = defaultRoot()) {
  const text = rawJson.trim();
  if (!text) return;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return;
  }
  const event = normalizeHookEvent(raw);
  const store = new SessionStore(event.sessionId, root);
  store.append(event);
  const action = actionFromEvent(event);
  if (action) patchStatus(store.dir, { action });
  writeMetaIfAbsent(
    { sessionId: event.sessionId, transcriptPath: raw.transcript_path ?? null, cwd: raw.cwd ?? null },
    root
  );
}
function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => raw += c);
  process.stdin.on("end", () => {
    try {
      handleHookInput(raw);
    } catch {
    }
    process.exit(0);
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
export {
  handleHookInput
};
