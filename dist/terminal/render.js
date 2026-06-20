export function renderNarration(text) {
    return `💬  ${text}`;
}
export function renderHeader(mode) {
    return `-- Codey (mode: ${mode}) - watching what Claude is doing --`;
}
export function renderAction(label) {
    return `▍ [${label.tag}] ${label.target}`;
}
