import { pathToFileURL } from "node:url";
import { defaultRoot } from "../store/session-store.js";
import { readInterventionFile, deleteInterventionFile } from "../intervene/file-io.js";
import { decideIntervention } from "../intervene/decide.js";

interface RawPreToolUse {
  tool_name?: string;
  session_id?: string;
}

// Block shape confirmed by the Task 1 spike. This is the one place Codey emits a block.
function formatBlockOutput(reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

// Pure-ish core: read the pending file, decide, consume it when told, and return what to print to
// stdout (or null for "print nothing"). Tested against a temp dir.
export function handleIntervenePayload(
  rawJson: string,
  root: string = defaultRoot(),
  now: number = Date.now(),
): string | null {
  const text = rawJson.trim();
  if (!text) return null;
  let raw: RawPreToolUse;
  try {
    raw = JSON.parse(text) as RawPreToolUse;
  } catch {
    return null; // never break Claude's tool flow on bad input
  }
  const sessionId = raw.session_id ?? "unknown";
  const toolName = raw.tool_name ?? "unknown";
  const decision = decideIntervention(readInterventionFile(sessionId, root), toolName, now);
  if (!decision) return null;
  if (decision.consume) deleteInterventionFile(sessionId, root);
  return decision.block ? formatBlockOutput(decision.reason) : null;
}

// Process entry: read all of stdin, decide, print a block if any, always exit 0.
function main(): void {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    let out: string | null = null;
    try { out = handleIntervenePayload(raw); } catch { /* swallow: never block the tool flow on error */ }
    if (out) process.stdout.write(out);
    process.exit(0);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
