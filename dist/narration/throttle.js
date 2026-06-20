const PACING = {
    simple: { everyN: 5, minMs: 8000 },
    deep: { everyN: 2, minMs: 3000 },
    teach: { everyN: 3, minMs: 5000 },
};
export function shouldNarrate(mode, state) {
    const p = PACING[mode];
    return state.newEvents >= p.everyN && state.msSinceLast >= p.minMs;
}
