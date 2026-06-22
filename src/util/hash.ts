import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((value as any)[k])).join(",") + "}";
}

export function inputHash(tool: string, input: unknown): string {
  return createHash("sha256").update(tool + " " + stableStringify(input)).digest("hex").slice(0, 16);
}

// Stable hash of any JSON-able value, for cache keys that must change when the content does.
export function hashContent(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}
