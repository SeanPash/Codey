import type { StatusView } from "./view.js";
import type { Mode } from "../types.js";
import { pastTense, shortTarget } from "./labels.js";

// ANSI palette. Terminals that ignore color still read the plain text fine.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BRAND = "\x1b[38;5;75m"; // the codey name, always sky blue
const GOLD = "\x1b[38;5;214m"; // the "task" label
const LAV = "\x1b[38;5;147m"; // the "why" label
const GRAY = "\x1b[38;5;250m"; // action sentence and prev rows
const TEXT = "\x1b[38;5;253m"; // the specific target / why body
const LABEL = "\x1b[38;5;110m"; // row labels (prev / raw / why), soft blue so the column stands out
const DOT = "\x1b[38;5;248m"; // the · in the header, bright enough to read
const GREEN = "\x1b[38;5;114m"; // the done check on history rows
const NUM = "\x1b[1m\x1b[38;5;220m"; // the task number, bright so it's easy to track
const RED = "\x1b[38;5;203m"; // warning

// The frame and banner take the mode's color so each mode reads differently at a
// glance: calm blue for simple, violet for deep, green for teach.
const MODE_COLOR: Record<Mode, string> = {
  simple: "\x1b[38;5;75m",
  deep: "\x1b[38;5;141m",
  teach: "\x1b[38;5;150m",
  ask: "\x1b[38;5;180m", // warm sand, distinct from the narration styles
};

const WRAP = 120;
const MAX_WHY_LINES = 5;
const COL = 5; // label column width so "task" / "why" / "prev" line up
const RULE = 26; // divider rule length
const RAW_MAX = 64; // raw detail is clamped to one line so a heredoc can't blow up the box

// Keep the raw detail to a single readable line: first line only, ellipsis if long.
function clampRaw(raw: string): string {
  const line = raw.split("\n")[0].trim();
  return line.length > RAW_MAX ? line.slice(0, RAW_MAX - 1) + "…" : line;
}

// Visible width of a line, ignoring ANSI color codes, so we can center it.
function visLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

// Title case for the mode banner: "Deep", not "DEEP". Quieter to read at a glance.
function modeLabel(mode: Mode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function frame(rail: string) {
  const edge = (ch: string) => `${rail}${ch}${RESET} `;
  return {
    header(mode: Mode): string {
      const m = MODE_COLOR[mode] ?? MODE_COLOR.simple;
      const title = `${BOLD}${BRAND}Codey${RESET} ${DOT}·${RESET} ${BOLD}${m}${modeLabel(mode)}${RESET}`;
      return `${edge("╭")}${title} ${rail}${"─".repeat(8)}${RESET}`;
    },
    row(label: string, labelStyle: string, body: string): string {
      return `${edge("│")}${labelStyle}${label.padEnd(COL)}${RESET}  ${body}`;
    },
    cont(body: string): string {
      return `${edge("│")}${" ".repeat(COL)}  ${body}`;
    },
    // A flush list line for the finished-turn recap: sits tight to the bar so the
    // sentence and the done-steps read as a clean column, not floating mid-box.
    item(body: string): string {
      return `${edge("│")}${body}`;
    },
    // An indented list line for the named-section layout, so rows sit a step in from
    // the bar instead of hugging it.
    listItem(body: string): string {
      return `${edge("│")}  ${body}`;
    },
    // A centered recap line: the summary sentence and completed-task rows sit in the
    // middle of the box rather than hugging the left bar, so the finished turn reads
    // as its own balanced panel.
    centered(body: string, width: number): string {
      const pad = Math.max(0, Math.floor((width - visLen(body)) / 2) - 2);
      return `${edge("│")}${" ".repeat(pad)}${body}`;
    },
    // A plain rule, or one carrying a small section label so the parts read as
    // distinct sections rather than one long block.
    divider(label?: string): string {
      if (!label) return `${rail}├${"─".repeat(RULE)}${RESET}`;
      const right = Math.max(2, RULE - label.length - 3);
      return `${rail}├─ ${LABEL}${label}${RESET}${rail} ${"─".repeat(right)}${RESET}`;
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

  // Claude finished its turn: recap what got done instead of pointing at a live task.
  // The recap sentence sits under a "summary" rule, the steps under a "completed tasks"
  // rule, both centered so the finished turn reads as its own balanced panel.
  if (view.summary) {
    const s = view.summary;
    out.push(f.divider("summary"));
    if (s.sentence) {
      wrapWhy(s.sentence, width, MAX_WHY_LINES).forEach((ln) => out.push(f.centered(`${BOLD}${TEXT}${ln}${RESET}`, width)));
    }
    if (s.items.length) {
      out.push(f.divider("completed tasks"));
      for (const it of s.items) {
        out.push(f.centered(`${GREEN}✓${RESET} ${NUM}${tasknum(it)}${RESET} ${GRAY}${pastTense(it.tag)} ${shortTarget(it.target)}${RESET}`, width));
      }
    }
    out.push(f.bottom());
    return out.join("\n");
  }

  if (!view.current) {
    out.push(f.divider("Current task"));
    out.push(f.listItem(`${GRAY}waiting for Claude${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (view.prev.length) {
    out.push(f.divider("Previous tasks"));
    for (const p of view.prev) {
      out.push(
        f.listItem(`${GREEN}✓${RESET} ${NUM}${tasknum(p)}${RESET} ${GRAY}${pastTense(p.tag)} ${shortTarget(p.target)}${RESET}`),
      );
    }
  }

  out.push(f.divider("Current task"));
  out.push(
    f.listItem(
      `${BOLD}${accent}▸${RESET} ${NUM}${tasknum(view.current)}${RESET} ${GRAY}${view.current.tag}${RESET} ${TEXT}${shortTarget(view.current.target)}${RESET}`,
    ),
  );
  if (view.current.raw) {
    out.push(f.cont(`     ↳ ${LABEL}running${RESET}  ${TEXT}${clampRaw(view.current.raw)}${RESET}`));
  }

  if (view.warning) {
    out.push(f.divider("Stuck"));
    out.push(f.listItem(`${BOLD}${RED}${view.warning}${RESET}`));
    out.push(f.bottom());
    return out.join("\n");
  }

  if (view.why) {
    out.push(f.divider("Explanation"));
    wrapWhy(view.why, width, MAX_WHY_LINES).forEach((ln) => out.push(f.listItem(`${BOLD}${TEXT}${ln}${RESET}`)));
  }

  out.push(f.bottom());
  return out.join("\n");
}
