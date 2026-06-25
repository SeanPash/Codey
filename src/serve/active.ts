import type { SessionListItem } from "../cli/sessions.js";

// Open terminals, ordered by most recent prompt. "Open" (not just "running") so a terminal
// the user is sitting in, composing their next prompt, still shows. Ordering keys on
// lastPromptTs so a tile only jumps to the front when the user actually prompts, never on
// each tool call.
export function selectActive(items: SessionListItem[]): SessionListItem[] {
  return items.filter((s) => s.open).sort((a, b) => b.lastPromptTs - a.lastPromptTs);
}
