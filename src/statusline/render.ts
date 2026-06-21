import type { StatusView } from "./view.js";
import type { Mode } from "../types.js";

// ANSI palette. Terminals that ignore color still read the plain text fine.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BRAND = "\x1b[38;5;75m"; // the codey name, always sky blue
const GOLD = "\x1b[38;5;214m"; // the "task" label
const LAV = "\x1b[38;5;147m"; // the "why" label
const GRAY = "\x1b[38;5;250m"; // action sentence and prev rows
const TEXT = "\x1b[38;5;253m"; // the specific target / why body
const LABEL = "\x1b[38;5;245m"; // subdued row labels (prev / raw) that still read clearly
const GREEN = "\x1b[38;5;114m"; // the done check on history rows
const NUM = "\x1b[1m\x1b[38;5;220m"; // the task number, bright so it's easy to track
const RED = "\x1b[38;5;203m"; // warning

// The frame and banner take the mode's color so each mode reads differently at a
// glance: calm blue for simple, violet for deep, green for teach.
const MODE_COLOR: Record<Mode, string> = {
  simple: "\x1b[38;5;75m",
  deep: "\x1b[38;5;141m",
  teach: "\x1b[38;5;150m",
};

const WRAP = 120;
const MAX_WHY_LINES = 5;
const COL = 5; // label column width so "task" / "why" / "prev" line up
const RULE = 26; // divider rule length

function frame(rail: string) {
  const edge = (ch: string) => `${rail}${ch}${RESET} `;
  return {
    header(mode: Mode): string {
      const m = MODE_COLOR[mode] ?? MODE_COLOR.simple;
      return `${edge("╭")}${BOLD}${BRAND}CODEY${RESET} ${LABEL}·${RESET} ${BOLD}${m}${mode.toUpperCase()}${RESET}`;
    },
    row(label: string, labelStyle: string, body: string): string {
      return `${edge("│")}${labelStyle}${label.padEnd(COL)}${RESET}  ${body}`;
    },
    cont(body: string): string {
      return `${edge("│")}${" ".repeat(COL)}  ${body}`;
    },
    divider(): string {
      return `${rail}├${"─".repeat(RULE)}${RESET}`;
    },
    bottom(): string {
      return `${rail}╰${RESET}`;
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

// Format the task number, widening to a range when the card stands for a burst.
function tasknum(c: { seq: number; endSeq?: number }): string {
  return c.endSeq && c.endSeq !== c.seq ? `#${c.seq}–${c.endSeq}` : `#${c.seq}`;
}

export function renderStatus(view: StatusView, width = WRAP): string {
  const accent = MODE_COLOR[view.mode] ?? MODE_COLOR.simple;
  const f = frame(accent);
  const out: string[] = [f.header(view.mode)];

  if (view.thinking) {
    out.push(f.row("task", `${BOLD}${GOLD}`, `${LAV}Claude is thinking through your request…${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (!view.current) {
    out.push(f.row("task", `${BOLD}${GOLD}`, `${GRAY}waiting for Claude${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (view.prev.length) {
    // History rows stay compact: a check, the number, and the bare verb phrase.
    // The "Claude is" prefix is only on the live task row below.
    for (const p of view.prev) {
      out.push(f.row("prev", LABEL, `${GREEN}✓${RESET} ${NUM}${tasknum(p)}${RESET} ${GRAY}${p.tag} ${p.target}${RESET}`));
    }
    out.push(f.divider());
  }

  if (view.current.raw) {
    out.push(f.row("raw", LABEL, `${TEXT}${view.current.raw}${RESET}`));
  }
  // The pointer sits where the done checks sit on the prev rows, so the numbers
  // read top to bottom as an ordered checklist: ✓ for finished, ▸ for the live one.
  out.push(
    f.row(
      "task",
      `${BOLD}${GOLD}`,
      `${BOLD}${accent}▸${RESET} ${NUM}${tasknum(view.current)}${RESET} ${GRAY}Claude is ${view.current.tag}${RESET} ${TEXT}${view.current.target}${RESET}`,
    ),
  );

  if (view.warning) {
    out.push(f.divider());
    out.push(f.row("stuck", `${BOLD}${RED}`, `${BOLD}${RED}${view.warning}${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (view.why) {
    out.push(f.divider());
    wrapWhy(view.why, width, MAX_WHY_LINES).forEach((ln, idx) => {
      const body = `${BOLD}${TEXT}${ln}${RESET}`;
      out.push(idx === 0 ? f.row("why", `${BOLD}${LAV}`, body) : f.cont(body));
    });
  }

  out.push(f.bottom());
  return out.join("\n");
}
