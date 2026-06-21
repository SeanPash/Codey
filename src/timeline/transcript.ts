import { readFileSync, existsSync } from "node:fs";

export interface AssistantTurn {
  ts: number;                    // ms since epoch (parsed from the ISO timestamp)
  outputTokens: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  tool: string | null;           // first tool_use name, "thinking" for a thinking-only turn, else null
  input: unknown;
  isError: boolean;              // from the matching tool_result
  errorText: string | null;
  toolUseId: string | null;      // the tool_use block id, for pairing with hook events
}

interface ToolResult { isError: boolean; text: string | null; }

function resultText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const t = content.find((b) => b && typeof b === "object" && (b as any).type === "text");
    return t ? String((t as any).text ?? "") : null;
  }
  return null;
}

export function parseTranscript(text: string): AssistantTurn[] {
  const recs = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as Record<string, any>; } catch { return null; } })
    .filter((r): r is Record<string, any> => r !== null);

  // Index every tool_result by its tool_use_id so we can attach status to the turn that called it.
  const results = new Map<string, ToolResult>();
  for (const r of recs) {
    const content = r.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (b?.type === "tool_result" && typeof b.tool_use_id === "string") {
        results.set(b.tool_use_id, { isError: b.is_error === true, text: resultText(b.content) });
      }
    }
  }

  const turns: AssistantTurn[] = [];
  for (const r of recs) {
    if (r.type !== "assistant") continue;
    const msg = r.message ?? {};
    const usage = msg.usage ?? {};
    const blocks: any[] = Array.isArray(msg.content) ? msg.content : [];
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

// The first human prompt, used as a fallback session name. Content may be a plain string
// or an array of blocks; we take the first text we find.
export function firstUserPrompt(text: string): string | null {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let r: Record<string, any>;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.type !== "user") continue;
    const c = r.message?.content;
    if (typeof c === "string" && c.trim()) return c.trim();
    if (Array.isArray(c)) {
      const t = c.find((b) => b && typeof b === "object" && b.type === "text");
      if (t && typeof t.text === "string" && t.text.trim()) return t.text.trim();
    }
  }
  return null;
}

// Glue: read the first prompt off disk; tolerate a missing/unreadable path.
export function readFirstPrompt(path: string | null): string | null {
  if (!path) return null;
  try {
    if (!existsSync(path)) return null;
    return firstUserPrompt(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// Glue: read the transcript file from disk; tolerate a missing/unreadable path.
export function readTranscriptTurns(path: string | null): AssistantTurn[] {
  if (!path) return [];
  try {
    if (!existsSync(path)) return [];
    return parseTranscript(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}
