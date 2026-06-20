import type { ToolEvent, Mode } from "../types.js";
import { buildNarrationPrompt } from "./prompt.js";
import { shouldNarrate } from "./throttle.js";

export type NarrateFn = (prompt: string) => Promise<string | null>;

const WINDOW = 12; // how many recent events to show the narrator

export class NarrationEngine {
  private lastCount = 0;
  private lastAtMs = 0;

  constructor(private mode: Mode, private narrate: NarrateFn) {}

  // Called with the full event list so far. Returns narration text or null.
  async onEvents(events: ToolEvent[], nowMs: number): Promise<string | null> {
    const newEvents = events.length - this.lastCount;
    const msSinceLast = this.lastAtMs === 0 ? Infinity : nowMs - this.lastAtMs;
    if (!shouldNarrate(this.mode, { newEvents, msSinceLast })) return null;

    const window = events.slice(-WINDOW);
    const prompt = buildNarrationPrompt(window, this.mode);
    const text = await this.narrate(prompt);

    this.lastCount = events.length;
    this.lastAtMs = nowMs;
    return text;
  }
}
