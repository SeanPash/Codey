import type { StatusSnapshot } from "./state.js";

// ANSI palette. Terminals that ignore color still read the plain text fine.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BRAND = "\x1b[38;5;75m"; // sky blue
const LABEL = "\x1b[38;5;250m"; // section labels
const GRAY = "\x1b[38;5;250m"; // action sentence
const TEXT = "\x1b[38;5;253m"; // the specific target / why body
const WHY = "\x1b[38;5;147m"; // lavender why label
const RED = "\x1b[38;5;203m"; // warning

const WRAP = 120; // wrap the why near this many characters
const MAX_WHY_LINES = 5; // enough to show a full explanation, not endless
const COL = 5; // label column width so "doing" / "why" line up

function rail(): string {
  return `${BRAND}▌${RESET} `;
}

// A rail row: a colored, padded section label, then the body two spaces over.
function row(label: string, labelStyle: string, body: string): string {
  return `${rail()}${labelStyle}${label.padEnd(COL)}${RESET}  ${body}`;
}

// Continuation line for a wrapped why: rail, then aligned under the why body.
function cont(body: string): string {
  return `${rail()}${" ".repeat(COL)}  ${body}`;
}

// Word-wrap the why to a few lines; if it overflows the cap, end with an ellipsis.
function wrapWhy(text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (next.length > width && cur) {
      lines.push(cur);
      cur = words[i];
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (i >= words.length) {
    if (cur) lines.push(cur);
    return lines;
  }
  let last = lines[lines.length - 1];
  while (last.length > Math.max(1, width - 1)) last = last.replace(/\s*\S+$/, "");
  lines[lines.length - 1] = last.replace(/[ .,;:]+$/, "") + "…";
  return lines;
}

export function renderStatus(snap: StatusSnapshot, width = WRAP): string {
  const out: string[] = [`${rail()}${BOLD}${BRAND}codey${RESET}`];

  if (!snap.action) {
    out.push(row("doing", `${BOLD}${LABEL}`, `${DIM}waiting for Claude${RESET}`));
    return out.join("\n");
  }

  const { tag, target } = snap.action;
  out.push(row("doing", `${BOLD}${LABEL}`, `${GRAY}Claude is ${tag}${RESET} ${TEXT}${target}${RESET}`));

  if (snap.warning) {
    out.push(row("stuck", `${BOLD}${RED}`, `${BOLD}${RED}${snap.warning}${RESET}`));
    return out.join("\n");
  }

  if (snap.why) {
    wrapWhy(snap.why, width, MAX_WHY_LINES).forEach((ln, idx) => {
      const body = `${BOLD}${TEXT}${ln}${RESET}`;
      out.push(idx === 0 ? row("why", `${BOLD}${WHY}`, body) : cont(body));
    });
  }

  return out.join("\n");
}
