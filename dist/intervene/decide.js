import { blockReason } from "./messages.js";
// One-shot click with a short safety net: a stale click can never block an unrelated call minutes later.
export const TTL_MS = 90_000;
// Pure decision. Match on tool name only: robust to Claude tweaking the arguments between loop
// iterations (an exact input-hash match would miss). A non-matching tool leaves the file in place
// for the right call to pick up, until it expires.
export function decideIntervention(file, toolName, now) {
    if (!file)
        return null;
    if (now - file.createdAt > TTL_MS)
        return { block: false, consume: true };
    if (file.tool !== toolName)
        return null;
    return { block: true, reason: blockReason(file.action, file.tool, file.count), consume: true };
}
