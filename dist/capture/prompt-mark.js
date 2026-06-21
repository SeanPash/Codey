import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/prompt-mark.ts
import { pathToFileURL } from "node:url";
import { join as join4 } from "node:path";
import { mkdirSync } from "node:fs";

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

// src/capture/prompts.ts
import { appendFileSync, readFileSync as readFileSync2, existsSync as existsSync2 } from "node:fs";
import { join as join3 } from "node:path";
function file2(dir) {
  return join3(dir, "prompts.jsonl");
}
function appendPrompt(dir, ts) {
  appendFileSync(file2(dir), JSON.stringify({ ts }) + "\n");
}

// src/capture/prompt-mark.ts
function handlePromptInput(rawJson, now = Date.now(), root = defaultRoot()) {
  const text = rawJson.trim();
  if (!text) return;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return;
  }
  if (!raw.session_id) return;
  const dir = join4(root, raw.session_id);
  mkdirSync(dir, { recursive: true });
  patchStatus(dir, { promptAt: now });
  appendPrompt(dir, now);
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
