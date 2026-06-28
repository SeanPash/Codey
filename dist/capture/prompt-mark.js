import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/prompt-mark.ts
import { pathToFileURL, fileURLToPath } from "node:url";
import { join as join6, dirname as dirname3 } from "node:path";
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

// src/capture/prompts.ts
import { appendFileSync, readFileSync as readFileSync3, existsSync as existsSync3 } from "node:fs";
import { join as join4 } from "node:path";
function file2(dir) {
  return join4(dir, "prompts.jsonl");
}
function appendPrompt(dir, ts) {
  appendFileSync(file2(dir), JSON.stringify({ ts }) + "\n");
}

// src/cli/toggle.ts
import { readFileSync as readFileSync4, writeFileSync as writeFileSync3, existsSync as existsSync4, mkdirSync as mkdirSync2, rmSync, openSync } from "node:fs";
import { join as join5, dirname as dirname2 } from "node:path";
import { homedir as homedir2 } from "node:os";
function withStatusLine(s, command) {
  return { ...s, statusLine: { type: "command", command } };
}
function settingsPath() {
  return join5(homedir2(), ".claude", "settings.json");
}
function readSettings() {
  const p = settingsPath();
  if (!existsSync4(p)) return {};
  try {
    return JSON.parse(readFileSync4(p, "utf8"));
  } catch {
    return {};
  }
}
function writeSettings(s) {
  const p = settingsPath();
  mkdirSync2(dirname2(p), { recursive: true });
  writeFileSync3(p, JSON.stringify(s, null, 2));
}
function statusLineCommand(self) {
  return `node "${self}" statusline`;
}
function pluginCacheBase(cliPath) {
  const m = cliPath.match(/^(.*[\\/]codey[\\/]codey[\\/])[^\\/]+[\\/]dist[\\/]/);
  return m ? m[1] : null;
}
function shouldRefreshStatusLine(existingCommand, currentCliPath) {
  const m = existingCommand.match(/^node "(.+)" statusline$/);
  if (!m) return false;
  const existing = m[1];
  if (existing === currentCliPath) return false;
  const base = pluginCacheBase(currentCliPath);
  return base !== null && existing.startsWith(base);
}
function refreshStatusLineIfStale(currentCliPath) {
  const s = readSettings();
  const cmd = s.statusLine?.command;
  if (cmd && shouldRefreshStatusLine(cmd, currentCliPath)) {
    writeSettings(withStatusLine(s, statusLineCommand(currentCliPath)));
  }
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
    if (!process.env.CODEY_HEADLESS) {
      try {
        const cli = join6(dirname3(fileURLToPath(import.meta.url)), "..", "cli", "index.js");
        refreshStatusLineIfStale(cli);
      } catch {
      }
    }
    process.exit(0);
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
export {
  handlePromptInput
};
