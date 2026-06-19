import type { Warning } from "../types.js";

export function formatWarning(w: Warning): string {
  return `⚠️  ${w.message}`;
}
