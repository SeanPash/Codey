import type { SessionListItem } from "../cli/sessions.js";

// Open terminals, ordered by most recent prompt. "Open" (not just "running") so a terminal
// the user is sitting in, composing their next prompt, still shows. Ordering keys on
// lastPromptTs so a tile only jumps to the front when the user actually prompts, never on
// each tool call.
export function selectActive(items: SessionListItem[]): SessionListItem[] {
  return items.filter((s) => s.open).sort((a, b) => b.lastPromptTs - a.lastPromptTs);
}

export interface Page<T> { page: number; pages: number; perPage: number; items: T[]; }

export function paginate<T>(items: T[], perPage: number, page: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(Math.max(1, page), pages);
  const start = (clamped - 1) * perPage;
  return { page: clamped, pages, perPage, items: items.slice(start, start + perPage) };
}
