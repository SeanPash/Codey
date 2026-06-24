import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/prompt-mark.ts
import { pathToFileURL } from "node:url";
import { join as join5 } from "node:path";
import { mkdirSync as mkdirSync2 } from "node:fs";

// src/store/session-store.ts
import { homedir } from "node:os";
import { join, dirname } from "node:path";
function defaultRoot() {
  return join(homedir(), ".codey", "sessions");
}

// src/statusline/state.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join as join2 } from "node:path";
function file(dir) {
  return join2(dir, "statusline.json");
}
function writeStatus(dir, snap) {
  writeFileSync(file(dir), JSON.stringify(snap));
}
function patchStatus(dir, patch) {
  const current = readStatus(dir) ?? { mode: "simple", action: null, why: null, warning: null, updatedAt: 0 };
  writeStatus(dir, { ...current, ...patch, updatedAt: Date.now() });
}
function readStatus(dir) {
  const p = file(dir);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

// src/store/session-meta.ts
import { writeFileSync as writeFileSync2, readFileSync as readFileSync2, mkdirSync, existsSync as existsSync2 } from "node:fs";
import { join as join3 } from "node:path";
function metaPath(sessionId, root) {
  return join3(root, sessionId, "meta.json");
}
function writeMetaIfAbsent(meta, root = defaultRoot()) {
  const file3 = metaPath(meta.sessionId, root);
  if (existsSync2(file3)) return;
  mkdirSync(join3(root, meta.sessionId), { recursive: true });
  writeFileSync2(file3, JSON.stringify(meta, null, 2));
}

// src/capture/prompts.ts
import { appendFileSync, readFileSync as readFileSync3, existsSync as existsSync3 } from "node:fs";
import { join as join4 } from "node:path";
function file2(dir) {
  return join4(dir, "prompts.jsonl");
}
function appendPrompt(dir, ts) {
  appendFileSync(file2(dir), JSON.stringify({ ts }) + "\n");
}

// src/capture/prompt-mark.ts
function handlePromptInput(rawJson, now = Date.now(), root = defaultRoot()) {
  if (process.env.CODEY_HEADLESS) return;
  const text = rawJson.trim();
  if (!text) return;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return;
  }
  if (!raw.session_id) return;
  const dir = join5(root, raw.session_id);
  mkdirSync2(dir, { recursive: true });
  patchStatus(dir, { promptAt: now, why: null, action: null, warning: null, doneAt: null });
  appendPrompt(dir, now);
  writeMetaIfAbsent(
    { sessionId: raw.session_id, transcriptPath: raw.transcript_path ?? null, cwd: raw.cwd ?? null },
    root
  );
}
function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => raw += c);
  process.stdin.on("end", () => {
    try {
      handlePromptInput(raw);
    } catch {
    }
    process.exit(0);
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
export {
  handlePromptInput
};
