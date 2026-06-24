import type { StatusView, StatusState } from "./view.js";
import type { Mode } from "../types.js";

// ANSI palette. Terminals that drop color still read the plain text fine.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const BRAND = "\x1b[38;5;75m";  // the Codey name, always sky blue
const DIM = "\x1b[38;5;244m";   // separators, timer, and hints sit quietly behind the text
const TEXT = "\x1b[38;5;253m";  // the live sentence, the line the eye lands on
const GREEN = "\x1b[38;5;114m"; // the done state
const RED = "\x1b[38;5;203m";   // a stuck warning

// Each mode carries its own accent so the line reads differently at a glance.
const MODE_COLOR: Record<Mode, string> = {
  simple: "\x1b[38;5;75m",
  deep: "\x1b[38;5;141m",
  teach: "\x1b[38;5;150m",
  ask: "\x1b[38;5;180m",
};

const WRAP = 120;

// The phase chip takes the state's color: the mode accent while live, green when done, and a
// quiet gray when idle, so the HUD's status reads from color before you parse the words.
function stageColor(state: StatusState, mode: Mode): string {
  if (state === "done") return GREEN;
  if (state === "idle") return DIM;
  return MODE_COLOR[mode] ?? MODE_COLOR.simple;
}

function modeLabel(mode: Mode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

// Keep the line-one stage chip tidy: a long purpose ("Updating the math tests to cover the new
// behavior") would push the timer off the edge, so clip it at a word boundary and add an
// ellipsis. The full sentence still says everything on line two.
const STAGE_MAX = 34;
function clipStage(stage: string): string {
  if (stage.length <= STAGE_MAX) return stage;
  const cut = stage.slice(0, STAGE_MAX);
  const sp = cut.lastIndexOf(" ");
  return (sp > STAGE_MAX * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

const SEP = `${DIM}│${RESET}`;

// Visible width ignoring color codes, so wrapping counts real characters.
function visLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

// Wrap the sentence to the terminal width so a long line stays inside the HUD instead of
// spilling. Most captions are one line; this only kicks in for the long ones.
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (visLen(next) > width && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// Line one: Codey, the mode, the phase chip, and the turn timer, with the budget cue trailing
// quietly. Done drops the mode so the line reads as a clean close.
function statusBar(view: StatusView): string {
  const accent = stageColor(view.state, view.mode);
  const parts = [`${BOLD}${BRAND}Codey${RESET}`];
  if (view.state !== "done") parts.push(`${MODE_COLOR[view.mode] ?? MODE_COLOR.simple}${modeLabel(view.mode)}${RESET}`);
  parts.push(`${BOLD}${accent}${clipStage(view.stage)}${RESET}`);
  if (view.elapsed) parts.push(`${DIM}${view.elapsed}${RESET}`);
  const budget = view.budgetLeft ? ` ${DIM}· ${view.budgetLeft}${RESET}` : "";
  return parts.join(` ${SEP} `) + budget;
}

export function renderStatus(view: StatusView, width = WRAP): string {
  const out = [statusBar(view)];

  // A stuck warning is the most important thing on screen, so it takes line two outright.
  if (view.warning) {
    out.push(`${BOLD}${RED}${view.warning}${RESET}`);
    return out.join("\n");
  }

  const body = view.state === "done" ? GREEN : TEXT;
  const lines = wrap(view.sentence, width);
  lines.forEach((ln) => out.push(`${body}${ln}${RESET}`));

  if (view.hint) out.push(`${DIM}${view.hint}${RESET}`);

  return out.join("\n");
}
