import { randomUUID } from "node:crypto";
import { inputHash } from "../util/hash.js";
// Extract the MCP server name from tool names like mcp__server__action
function serverOf(tool) {
    const m = /^mcp__([^_]+)__/.exec(tool);
    return m ? m[1] : null;
}
function extractError(resp) {
    if (resp && typeof resp === "object") {
        const r = resp;
        if (typeof r.error === "string")
            return r.error;
        if (r.is_error === true && typeof r.content === "string")
            return r.content;
    }
    return null;
}
export function normalizeHookEvent(raw) {
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
        toolUseId: raw.tool_use_id ?? null,
    };
}
