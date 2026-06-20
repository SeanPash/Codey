import type { StatusSnapshot } from "./state.js";

// Small ANSI palette so the line catches the eye. Terminals that ignore color still
// read the plain text fine. Keep "why: <text>" contiguous (no codes between them) so
// the label and value read as one phrase.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const BRIGHT = "\x1b[96m";
const RED = "\x1b[91m";

function brand(): string {
  return `${BRIGHT}▍${RESET}${BOLD}${CYAN}codey${RESET}`;
}

function actionLine(snap: StatusSnapshot): string {
  if (!snap.action) return `${brand()}  ${DIM}waiting for activity${RESET}`;
  const color = snap.warning ? RED : BRIGHT;
  const tag = `[${snap.action.tag}]`;
  return `${brand()}  ${BOLD}${color}${tag.padEnd(11)}${RESET} ${snap.action.target}`;
}

// Warning takes the second line if present; otherwise the why; otherwise nothing.
function secondLine(snap: StatusSnapshot): string | null {
  if (snap.warning) return `  ${BOLD}${RED}${snap.warning}${RESET}`;
  if (snap.why) return `  ${DIM}└${RESET} why: ${snap.why}`;
  return null;
}

export function renderStatus(snap: StatusSnapshot): string {
  const second = secondLine(snap);
  return second ? `${actionLine(snap)}\n${second}` : actionLine(snap);
}
