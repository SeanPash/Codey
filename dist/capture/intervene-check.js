import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/capture/intervene-check.ts
import { pathToFileURL } from "node:url";

// src/store/session-store.ts
import { homedir } from "node:os";
import { join, dirname } from "node:path";
function defaultRoot() {
  return join(homedir(), ".codey", "sessions");
}

// src/intervene/file-io.ts
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join as join2 } from "node:path";
function interventionPath(sessionId, root = defaultRoot()) {
  return join2(root, sessionId, "intervene.json");
}
function readInterventionFile(sessionId, root = defaultRoot()) {
  const file = interventionPath(sessionId, root);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function deleteInterventionFile(sessionId, root = defaultRoot()) {
  try {
    rmSync(interventionPath(sessionId, root), { force: true });
  } catch {
  }
}

// src/intervene/messages.ts
function blockReason(action, tool, count) {
  switch (action) {
    case "nudge":
      return `You've repeated this same step ${count} times without making progress. Stop retrying it and move on to the next part of the task. If this step genuinely can't be completed, say so plainly and continue with what you can.`;
    case "different":
      return `This approach has failed ${count} times. The current method isn't working, so stop and switch to a clearly different strategy instead of repeating variations of the same one.`;
    case "stop":
      return `The user wants to step in. Stop here, briefly summarize what you were trying to do and where you got stuck, then ask the user how they'd like to proceed before taking any more actions.`;
  }
}

// src/intervene/decide.ts
var TTL_MS = 9e4;
function decideIntervention(file, toolName, now) {
  if (!file) return null;
  if (now - file.createdAt > TTL_MS) return { block: false, consume: true };
  if (file.tool !== toolName) return null;
  return { block: true, reason: blockReason(file.action, file.tool, file.count), consume: true };
}

// src/capture/intervene-check.ts
function formatBlockOutput(reason) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  });
}
function handleIntervenePayload(rawJson, root = defaultRoot(), now = Date.now()) {
  const text = rawJson.trim();
  if (!text) return null;
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const sessionId = raw.session_id ?? "unknown";
  const toolName = raw.tool_name ?? "unknown";
  const decision = decideIntervention(readInterventionFile(sessionId, root), toolName, now);
  if (!decision) return null;
  if (decision.consume) deleteInterventionFile(sessionId, root);
  return decision.block ? formatBlockOutput(decision.reason) : null;
}
function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => raw += c);
  process.stdin.on("end", () => {
    let out = null;
    try {
      out = handleIntervenePayload(raw);
    } catch {
    }
    if (out) process.stdout.write(out);
    process.exit(0);
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
export {
  handleIntervenePayload
};
