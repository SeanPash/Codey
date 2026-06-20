import { existsSync, readFileSync, watchFile } from "node:fs";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { createWatchState, activeWarning } from "./watch.js";
import { patchStatus } from "../statusline/state.js";
import { runClaude } from "../narration/claude-headless.js";
export async function narrateTick(dir, events, state, now) {
    const w = activeWarning(events, now);
    patchStatus(dir, { warning: w ? formatWarning(w) : null });
    const why = await state.engine.onEvents(events, now);
    if (why)
        patchStatus(dir, { why });
}
export function runNarrate(sessionId, mode) {
    const store = new SessionStore(sessionId);
    const state = createWatchState(mode, (p) => runClaude(p));
    patchStatus(store.dir, { mode });
    const tick = async () => {
        if (!existsSync(store.path))
            return;
        const events = [];
        for (const line of readFileSync(store.path, "utf8").split("\n")) {
            if (!line.trim())
                continue;
            try {
                events.push(JSON.parse(line));
            }
            catch { /* partial line */ }
        }
        const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
        await narrateTick(store.dir, reconcileErrors(events, turns), state, Date.now());
    };
    watchFile(store.path, { interval: 1000 }, () => { void tick(); });
    void tick();
}
