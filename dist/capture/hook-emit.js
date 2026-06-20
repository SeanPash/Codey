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
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
function str(input, key) {
  if (input && typeof input === "object") {
    const v = input[key];
    if (typeof v === "string") return v;
  }
  return null;
}
function actionLabel(tool, input) {
  const file2 = str(input, "file_path") ?? str(input, "path");
  switch (tool) {
    case "Read":
      return { tag: "reading", target: file2 ? basename(file2) : "a file" };
    case "Edit":
    case "MultiEdit":
      return { tag: "editing", target: file2 ? basename(file2) : "a file" };
    case "Write":
      return { tag: "writing", target: file2 ? basename(file2) : "a file" };
    case "Bash": {
      const c = str(input, "command");
      return { tag: "running", target: c ? c.split("\n")[0].slice(0, 40) : "a command" };
    }
    case "Grep":
    case "Glob": {
      const p = str(input, "pattern");
      return { tag: "searching", target: p ?? "the code" };
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return { tag: "running", target: `${m[2].replace(/_/g, " ")} (${m[1]})` };
  return { tag: "working", target: tool };
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
