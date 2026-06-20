import { randomUUID } from "node:crypto";
import type { ToolEvent } from "../types.js";
import { inputHash } from "../util/hash.js";

export interface RawHookEvent {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
}

// Extract the MCP server name from tool names like mcp__server__action
function serverOf(tool: string): string | null {
  const m = /^mcp__([^_]+)__/.exec(tool);
  return m ? m[1] : null;
}

function extractError(resp: unknown): string | null {
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    if (typeof r.error === "string") return r.error;
    if (r.is_error === true && typeof r.content === "string") return r.content;
  }
  return null;
}

export function normalizeHookEvent(raw: RawHookEvent): ToolEvent {
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
  };
}
