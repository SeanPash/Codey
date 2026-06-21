import type { SessionListItem } from "../cli/sessions.js";

// Live sessions only, ordered by most recent prompt. Ordering keys on lastPromptTs (not tool
// activity) so tiles only move when the user actually prompts, never on each tool call.
export function selectActive(items: SessionListItem[]): SessionListItem[] {
  return items.filter((s) => s.live).sort((a, b) => b.lastPromptTs - a.lastPromptTs);
}

export interface Page<T> { page: number; pages: number; perPage: number; items: T[]; }

export function paginate<T>(items: T[], perPage: number, page: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const clamped = Math.min(Math.max(1, page), pages);
  const start = (clamped - 1) * perPage;
  return { page: clamped, pages, perPage, items: items.slice(start, start + perPage) };
}
