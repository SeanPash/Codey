import type { StatusSnapshot } from "./state.js";

// ANSI palette. Terminals that ignore color still read the plain text fine.
// The action line is kept calm so the "why" underneath is the thing that pops.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[38;5;114m"; // calm green brand
const TEXT = "\x1b[38;5;253m"; // near-white body text
const AMBER = "\x1b[38;5;215m"; // why marker
const RED = "\x1b[38;5;203m"; // warning

// Turn a gerund tag into a phrase that reads like a sentence next to its target.
const PHRASE: Record<string, string> = {
  searching: "searching for",
  working: "working on",
};

function phrase(tag: string): string {
  return PHRASE[tag] ?? tag;
}

function brand(): string {
  return `${BOLD}${GREEN}codey${RESET}`;
}

// "codey  Claude is running rm ..." - a plain sentence, no bracketed tag.
function actionLine(snap: StatusSnapshot): string {
  if (!snap.action) return `${brand()}  ${DIM}waiting for Claude${RESET}`;
  const { tag, target } = snap.action;
  return `${brand()}  ${DIM}Claude is ${phrase(tag)}${RESET} ${TEXT}${target}${RESET}`;
}

// Second line carries the explanation (or a warning), made loud on purpose.
function secondLine(snap: StatusSnapshot): string | null {
  if (snap.warning) return `  ${BOLD}${RED}!  ${snap.warning}${RESET}`;
  if (snap.why) return `  ${BOLD}${AMBER}↳ why${RESET}  ${BOLD}${TEXT}${snap.why}${RESET}`;
  return null;
}

export function renderStatus(snap: StatusSnapshot): string {
  const second = secondLine(snap);
  return second ? `${actionLine(snap)}\n${second}` : actionLine(snap);
}
