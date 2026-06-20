import { attributeChunk } from "../timeline/attribution.js";
import { detectLoop, detectRepeatError } from "../warnings/detectors.js";
import { reconcileErrors } from "../warnings/reconcile.js";
const LOOP_THRESHOLD = 5;
const REPEAT_ERROR_THRESHOLD = 3;
// Warnings that are meaningful from history alone (hang is a live concept, so it is omitted here).
// Reconcile against the transcript first so repeat-error sees failures, which never reach the hook.
function chunkWarnings(slice, turns) {
    const events = reconcileErrors(slice, turns);
    const out = [];
    const loop = detectLoop(events, LOOP_THRESHOLD);
    if (loop)
        out.push(loop);
    const repeat = detectRepeatError(events, REPEAT_ERROR_THRESHOLD);
    if (repeat)
        out.push(repeat);
    return out;
}
export function buildSnapshot(input) {
    const { events, rawChunks, turns } = input;
    const chunks = rawChunks.map((rc, idx) => {
        const next = rawChunks[idx + 1];
        const startTs = events[rc.startIndex]?.timestamp ?? 0;
        const endIndex = next ? next.startIndex : events.length;
        const endTs = next ? (events[next.startIndex]?.timestamp ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const slice = events.slice(rc.startIndex, endIndex);
        const receipt = attributeChunk(turns, startTs, endTs);
        return {
            id: `c${idx}`,
            name: rc.name,
            narration: rc.narration,
            startTs,
            endTs,
            tokenTotal: receipt.workTotal + receipt.contextTotal,
            warnings: chunkWarnings(slice, turns),
            receipt,
        };
    });
    const totalTokens = chunks.reduce((s, c) => s + c.tokenTotal, 0);
    const priciest = chunks.reduce((m, c) => (!m || c.tokenTotal > m.tokenTotal ? c : m), null);
    return {
        sessionId: input.sessionId,
        sessionName: input.sessionName,
        live: input.live,
        totalTokens,
        taskCount: chunks.length,
        priciestTaskName: priciest && priciest.tokenTotal > 0 ? priciest.name : null,
        chunks,
        activeWarning: null,
    };
}
