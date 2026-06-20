import { createHash } from "node:crypto";
function stableStringify(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return "[" + value.map(stableStringify).join(",") + "]";
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}
export function inputHash(tool, input) {
    return createHash("sha256").update(tool + " " + stableStringify(input)).digest("hex").slice(0, 16);
}
