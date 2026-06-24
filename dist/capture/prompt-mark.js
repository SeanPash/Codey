import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/prompt-mark.ts
import { pathToFileURL } from "node:url";
import { join as join6 } from "node:path";
import { mkdirSync as mkdirSync3 } from "node:fs";

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
function readMeta(sessionId, root = defaultRoot()) {
  const file3 = metaPath(sessionId, root);
  if (!existsSync2(file3)) return null;
  try {
    return JSON.parse(readFileSync2(file3, "utf8"));
  } catch {
    return null;
  }
}

// src/statusline/active-mode.ts
import { readFileSync as readFileSync3, writeFileSync as writeFileSync3, existsSync as existsSync3, rmSync, mkdirSync as mkdirSync2, readdirSync, statSync } from "node:fs";
import { join as join4 } from "node:path";
function modeFile(sessionDir) {
  return join4(sessionDir, "mode");
}
function writeSessionMode(mode, sessionDir) {
  mkdirSync2(sessionDir, { recursive: true });
  writeFileSync3(modeFile(sessionDir), mode);
}
function readSessionMode(sessionDir) {
  const p = modeFile(sessionDir);
  if (!existsSync3(p)) return null;
  const raw = readFileSync3(p, "utf8").trim();
  return raw === "simple" || raw === "deep" || raw === "teach" || raw === "ask" ? raw : null;
}
function lastActive(dir) {
  let t = 0;
  for (const f of ["events.jsonl", "prompts.jsonl", "mode"]) {
    try {
      t = Math.max(t, statSync(join4(dir, f)).mtimeMs);
    } catch {
    }
  }
  return t;
}
var INHERIT_WINDOW_MS = 10 * 6e4;
function inheritedMode(cwd, excludeId, root, now = Date.now()) {
  if (!cwd || !existsSync3(root)) return null;
  let best = null;
  for (const name of readdirSync(root)) {
    if (name === excludeId) continue;
    const dir = join4(root, name);
    const mode = readSessionMode(dir);
    if (!mode) continue;
    if (readMeta(name, root)?.cwd !== cwd) continue;
    const at = lastActive(dir);
    if (!best || at > best.at) best = { mode, at };
  }
  if (!best) return null;
  if (now - best.at > INHERIT_WINDOW_MS) return null;
  return best.mode;
}

// src/capture/prompts.ts
import { appendFileSync, readFileSync as readFileSync4, existsSync as existsSync4 } from "node:fs";
import { join as join5 } from "node:path";
function file2(dir) {
  return join5(dir, "prompts.jsonl");
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
  const dir = join6(root, raw.session_id);
  mkdirSync3(dir, { recursive: true });
  const firstPrompt = readMeta(raw.session_id, root) === null;
  patchStatus(dir, { promptAt: now, why: null, action: null, warning: null, doneAt: null });
  appendPrompt(dir, now);
  writeMetaIfAbsent(
    { sessionId: raw.session_id, transcriptPath: raw.transcript_path ?? null, cwd: raw.cwd ?? null },
    root
  );
  if (firstPrompt && readSessionMode(dir) === null) {
    const inherit = inheritedMode(raw.cwd ?? null, raw.session_id, root, now);
    if (inherit) writeSessionMode(inherit, dir);
  }
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
