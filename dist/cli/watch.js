import { existsSync, readFileSync, watchFile } from "node:fs";
import { SessionStore } from "../store/session-store.js";
import { readMeta } from "../store/session-meta.js";
import { readTranscriptTurns } from "../timeline/transcript.js";
import { computeOpenCalls } from "../warnings/open-calls.js";
import { detectLoop, detectRepeatError, detectHang } from "../warnings/detectors.js";
import { reconcileErrors } from "../warnings/reconcile.js";
import { formatWarning } from "../warnings/format.js";
import { NarrationEngine } from "../narration/engine.js";
import { runClaude } from "../narration/claude-headless.js";
import { renderNarration, renderHeader, renderAction } from "../terminal/render.js";
import { actionFromEvent } from "../statusline/from-event.js";
const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;
const HANG_MS = 45_000;
export function createWatchState(mode, narrate) {
    return { engine: new NarrationEngine(mode, narrate), lastWarningKey: null, lastActionKey: null };
}
export function activeWarning(events, now) {
    return (detectLoop(events, LOOP_THRESHOLD) ??
        detectRepeatError(events, REPEAT_ERROR_THRESHOLD) ??
        detectHang(computeOpenCalls(events), now, HANG_MS));
}
function warningKey(w) {
    return `${w.kind}|${w.tool}|${w.count}`;
}
export async function processTick(events, state, now) {
    const lines = [];
    let action = null;
    for (let i = events.length - 1; i >= 0; i--) {
        const a = actionFromEvent(events[i]);
        if (a) {
            action = a;
            break;
        }
    }
    if (action) {
        const key = `${action.tag}|${action.target}`;
        if (key !== state.lastActionKey) {
            lines.push(renderAction(action));
            state.lastActionKey = key;
        }
    }
    const w = activeWarning(events, now);
    if (w) {
        const key = warningKey(w);
        if (key !== state.lastWarningKey) {
            lines.push(formatWarning(w));
            state.lastWarningKey = key;
        }
    }
    const narration = await state.engine.onEvents(events, now);
    if (narration)
        lines.push(renderNarration(narration));
    return { lines };
}
// --- thin glue: tail the JSONL file and print ticks ---
export function runWatch(sessionId, mode) {
    const store = new SessionStore(sessionId);
    const state = createWatchState(mode, (p) => runClaude(p));
    console.log(renderHeader(mode));
    console.log(`(session: ${sessionId})`);
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
            catch {
                // Skip a partial or malformed line (e.g. read while the hook is mid-write).
            }
        }
        // Errored tools never produce a PostToolUse, so fold their outcome in from the transcript.
        const turns = readTranscriptTurns(readMeta(sessionId)?.transcriptPath ?? null);
        const result = await processTick(reconcileErrors(events, turns), state, Date.now());
        for (const line of result.lines)
            console.log(line);
    };
    watchFile(store.path, { interval: 1000 }, () => { void tick(); });
    void tick();
}
