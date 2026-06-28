import { stripDashes, stripMarkdown } from "../util/text.js";
import { stripEllipsis } from "./sanitize.js";
import { isVacuousExplanation } from "./banned.js";

// Claude writes a plain-English progress note before most tool calls ("Now I'll update the caption
// builder so the statusline reads the new purpose"). That is exactly the grounded, specific voice
// Codey wants, and the timeline already captures it as the turn's assistant text. This turns that
// raw note into a subtitle: cleaned of markdown and dashes, clamped to a sentence or two, and
// rejected outright when it is empty filler. Returns null when there is nothing worth showing, so
// the caller falls back to the deterministic caption rather than printing a vague line.

export interface ReasoningContext {
  file?: string | null;    // the file this action touched, for future grounding checks
  subject?: string | null; // the subject the action is about
}

// Split into whole sentences, keeping terminal punctuation so each piece is a complete thought.
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// A subtitle is one or two sentences. More than that is a plan dump, not a caption, so keep the
// first two and clamp the whole thing so a single runaway sentence never sprawls past the card.
const MAX_SENTENCES = 2;
const MAX_CHARS = 200;

export function cleanReasoning(text: string | null | undefined, _ctx: ReasoningContext = {}): string | null {
  if (!text) return null;
  // Collapse whitespace, drop markdown emphasis and dash clause breaks, and strip a trailing
  // ellipsis so the line never reads as an unfinished thought.
  const normalized = stripEllipsis(stripDashes(stripMarkdown(text.replace(/\s+/g, " ").trim())));
  if (!normalized) return null;

  const kept = sentences(normalized).slice(0, MAX_SENTENCES).join(" ");
  if (!kept) return null;

  // A bare "Done." or "Ok." carries no information, so it is not worth a row of its own.
  if (kept.replace(/[^A-Za-z]/g, "").length < 12) return null;

  // Empty filler ("thinking it through", "paused and reflected", "no concrete reason") says
  // nothing real; fall back to the deterministic caption instead of printing the hedge.
  if (isVacuousExplanation(kept)) return null;

  const clamped = kept.length > MAX_CHARS ? kept.slice(0, MAX_CHARS).replace(/\s+\S*$/, "").trim() : kept;
  const ended = /[.!?]$/.test(clamped) ? clamped : clamped + ".";
  return stripEllipsis(ended);
}
