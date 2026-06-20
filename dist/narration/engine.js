import { buildNarrationPrompt } from "./prompt.js";
import { shouldNarrate } from "./throttle.js";
const WINDOW = 12; // how many recent events to show the narrator
export class NarrationEngine {
    mode;
    narrate;
    lastCount = 0;
    lastAtMs = 0;
    constructor(mode, narrate) {
        this.mode = mode;
        this.narrate = narrate;
    }
    // Called with the full event list so far. Returns narration text or null.
    async onEvents(events, nowMs) {
        const newEvents = events.length - this.lastCount;
        const msSinceLast = this.lastAtMs === 0 ? Infinity : nowMs - this.lastAtMs;
        if (!shouldNarrate(this.mode, { newEvents, msSinceLast }))
            return null;
        const window = events.slice(-WINDOW);
        const prompt = buildNarrationPrompt(window, this.mode);
        const text = await this.narrate(prompt);
        this.lastCount = events.length;
        this.lastAtMs = nowMs;
        return text;
    }
}
