import { readFileSync, existsSync } from "node:fs";
function resultText(content) {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        const t = content.find((b) => b && typeof b === "object" && b.type === "text");
        return t ? String(t.text ?? "") : null;
    }
    return null;
}
export function parseTranscript(text) {
    const recs = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => { try {
        return JSON.parse(l);
    }
    catch {
        return null;
    } })
        .filter((r) => r !== null);
    // Index every tool_result by its tool_use_id so we can attach status to the turn that called it.
    const results = new Map();
    for (const r of recs) {
        const content = r.message?.content;
        if (!Array.isArray(content))
            continue;
        for (const b of content) {
            if (b?.type === "tool_result" && typeof b.tool_use_id === "string") {
                results.set(b.tool_use_id, { isError: b.is_error === true, text: resultText(b.content) });
            }
        }
    }
    const turns = [];
    for (const r of recs) {
        if (r.type !== "assistant")
            continue;
        const msg = r.message ?? {};
        const usage = msg.usage ?? {};
        const blocks = Array.isArray(msg.content) ? msg.content : [];
        const toolUse = blocks.find((b) => b?.type === "tool_use");
        const hasThinking = blocks.some((b) => b?.type === "thinking");
        const res = toolUse ? results.get(toolUse.id) : undefined;
        turns.push({
            ts: Date.parse(r.timestamp ?? "") || 0,
            outputTokens: usage.output_tokens ?? 0,
            inputTokens: usage.input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
            cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
            tool: toolUse?.name ?? (hasThinking ? "thinking" : null),
            input: toolUse?.input ?? null,
            isError: res?.isError ?? false,
            errorText: res?.isError ? res.text : null,
            toolUseId: toolUse?.id ?? null,
        });
    }
    return turns;
}
// Glue: read the transcript file from disk; tolerate a missing/unreadable path.
export function readTranscriptTurns(path) {
    if (!path)
        return [];
    try {
        if (!existsSync(path))
            return [];
        return parseTranscript(readFileSync(path, "utf8"));
    }
    catch {
        return [];
    }
}
