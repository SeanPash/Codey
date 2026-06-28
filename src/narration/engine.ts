import type { ToolEvent, Mode } from "../types.js";
import { buildNarrationPrompt } from "./prompt.js";
import { shouldNarrate } from "./cadence.js";
import { stripDashes, stripMarkdown } from "../util/text.js";

export type NarrateFn = (prompt: string) => Promise<string | null>;

// The most events to hand the narrator in one call. A coalesced batch covers everything since the
// last narration, but a very long quiet stretch is clipped to the most recent slice so the prompt
// stays small.
const MAX_WINDOW = 40;

export class NarrationEngine {
  private lastIndex = 0; // events.length at the last narration
  private lastAtMs = 0;

  constructor(private mode: Mode, private narrate: NarrateFn) {}

  // Called with the full event list so far. Returns narration text or null. warningActive lets a
  // tripped free detector trigger a call between the floor and the cap.
  async onEvents(events: ToolEvent[], nowMs: number, warningActive = false): Promise<string | null> {
    const decision = shouldNarrate(this.mode, {
      events,
      lastNarratedIndex: this.lastIndex,
      lastCallAt: this.lastAtMs,
      now: nowMs,
      warningActive,
    });
    if (!decision.fire) return null;

    // Coalesce: summarize everything since the last narration in one sentence, clipped to the most
    // recent MAX_WINDOW events so a huge batch never blows up the prompt.
    const start = Math.max(this.lastIndex, events.length - MAX_WINDOW);
    const window = events.slice(start);
    const prompt = buildNarrationPrompt(window, this.mode);
    const text = await this.narrate(prompt);

    // Advance even when the call returned nothing, so a failed call does not retry on the next tick
    // before the floor has elapsed.
    this.lastIndex = events.length;
    this.lastAtMs = nowMs;
    return text ? stripMarkdown(stripDashes(text)) : text;
  }
}
