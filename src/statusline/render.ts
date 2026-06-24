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

// Line one: Codey, the mode, the phase chip, and the turn timer, with the budget cue trailing
// quietly. Done drops the mode and adds a "Summary" chip so it is clear line two is a completion
// summary, not live narration. While live, a short hint (the explain pointer, a paused notice)
// rides on this line too, so the body stays two lines.
function statusBar(view: StatusView): string {
  const accent = stageColor(view.state, view.mode);
  const parts = [`${BOLD}${BRAND}Codey${RESET}`];
  if (view.state !== "done") parts.push(`${MODE_COLOR[view.mode] ?? MODE_COLOR.simple}${modeLabel(view.mode)}${RESET}`);
  parts.push(`${BOLD}${accent}${clipStage(view.stage)}${RESET}`);
  if (view.state === "done") parts.push(`${DIM}Summary${RESET}`);
  if (view.elapsed) parts.push(`${DIM}${view.elapsed}${RESET}`);
  const budget = view.budgetLeft ? ` ${DIM}· ${view.budgetLeft}${RESET}` : "";
  const hint = view.state !== "done" && view.hint ? ` ${DIM}· ${view.hint}${RESET}` : "";
  return parts.join(` ${SEP} `) + budget + hint;
}

export function renderStatus(view: StatusView, _width = WRAP): string {
  const out = [statusBar(view)];

  // A stuck warning is the most important thing on screen, so it takes line two outright.
  if (view.warning) {
    out.push(`${BOLD}${RED}${view.warning}${RESET}`);
    return out.join("\n");
  }

  // Line two is the sentence, printed whole. The composer already trims it to complete sentences
  // within a budget, so we never cut it off mid-thought with an ellipsis; an over-long line just
  // wraps in the terminal, while the fuller detail lives in the browser timeline.
  const body = view.state === "done" ? GREEN : TEXT;
  out.push(`${body}${view.sentence.trim()}${RESET}`);

  // Only the done close keeps a dim footer on its own line ("Run /codey:timeline ..."); live
  // states fold their hint onto the status bar so the HUD never grows past two lines.
  if (view.state === "done" && view.hint) out.push(`${DIM}${view.hint}${RESET}`);

  return out.join("\n");
}
