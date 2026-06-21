import type { StatusSnapshot } from "./state.js";
import type { Mode } from "../types.js";

// ANSI palette. Terminals that ignore color still read the plain text fine.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BRAND = "\x1b[38;5;75m"; // the codey name, always sky blue
const GOLD = "\x1b[38;5;214m"; // the "task" label
const LAV = "\x1b[38;5;147m"; // the "why" label
const GRAY = "\x1b[38;5;250m"; // action sentence and the mode badge
const TEXT = "\x1b[38;5;253m"; // the specific target / why body
const RED = "\x1b[38;5;203m"; // warning

// The frame and badge take the mode's color so each mode reads differently
// at a glance: calm blue for simple, violet for deep, green for teach.
const MODE_COLOR: Record<Mode, string> = {
  simple: "\x1b[38;5;75m",
  deep: "\x1b[38;5;141m",
  teach: "\x1b[38;5;150m",
};

const WRAP = 120; // wrap the why near this many characters
const MAX_WHY_LINES = 5; // enough to show a full explanation, not endless
const COL = 5; // label column width so "task" / "why" / "stuck" line up

// A vertical-left frame: the header sits on the top corner, body rows hang off
// the bar, and a bottom corner closes the card. It groups the section without a
// right edge, so it never breaks on a narrow or oddly sized terminal.
function frame(railColor: string) {
  const edge = (ch: string) => `${railColor}${ch}${RESET} `;
  return {
    // The branded title row, e.g. "codey · deep".
    header(mode: Mode): string {
      return `${edge("╭")}${BOLD}${BRAND}codey${RESET} ${DIM}${GRAY}· ${mode}${RESET}`;
    },
    // A labeled body row: padded color label, then the body two spaces over.
    row(label: string, labelStyle: string, body: string): string {
      return `${edge("│")}${labelStyle}${label.padEnd(COL)}${RESET}  ${body}`;
    },
    // A wrapped-why continuation line, aligned under the why body.
    cont(body: string): string {
      return `${edge("│")}${" ".repeat(COL)}  ${body}`;
    },
    // The closing corner under the last row.
    bottom(): string {
      return `${railColor}╰${RESET}`;
    },
  };
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
  const f = frame(MODE_COLOR[snap.mode] ?? MODE_COLOR.simple);
  const out: string[] = [f.header(snap.mode)];

  if (!snap.action) {
    out.push(f.row("task", `${BOLD}${GOLD}`, `${DIM}waiting for Claude${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  const { tag, target } = snap.action;
  out.push(f.row("task", `${BOLD}${GOLD}`, `${GRAY}Claude is ${tag}${RESET} ${TEXT}${target}${RESET}`));

  if (snap.warning) {
    out.push(f.row("stuck", `${BOLD}${RED}`, `${BOLD}${RED}${snap.warning}${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (snap.why) {
    wrapWhy(snap.why, width, MAX_WHY_LINES).forEach((ln, idx) => {
      const body = `${BOLD}${TEXT}${ln}${RESET}`;
      out.push(idx === 0 ? f.row("why", `${BOLD}${LAV}`, body) : f.cont(body));
    });
  }

  out.push(f.bottom());
  return out.join("\n");
}
