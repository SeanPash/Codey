import type { ToolEvent, Mode } from "../types.js";
import { scheduleWhy } from "./read-time.js";
import { formatDuration } from "../timeline/duration.js";
import type { StatusSnapshot } from "./state.js";
import type { StatusView } from "./view.js";
import type { WhyEntry } from "../narration/history.js";
import { budgetLeftLabel, budgetPausedMessage, type Budget } from "../budget/budget.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption, type LiveCaption } from "../caption/caption.js";
import { buildRecap } from "../caption/recap.js";
import { stripEllipsis, hasShellNoise } from "../caption/sanitize.js";
import { stripDashes, stripMarkdown } from "../util/text.js";

// Pick the sentence for the current mode: simple is one line, deep and teach reach for the
// richer fields when they exist and fall back gracefully when they do not.
function pickSentence(caption: LiveCaption, mode: Mode): string {
  if (mode === "deep") return caption.deep ?? caption.simple;
  if (mode === "teach") return caption.teach ?? caption.deep ?? caption.simple;
  return caption.simple;
}

// How much of the HUD's body each mode gets. Simple is one short sentence on one line. Deep and
// teach are the paid modes: they get two full sentences that may wrap onto a second line, so a
// real mechanism explanation shows in full instead of being thrown away for the generic caption.
// The cap matches roughly two wrapped terminal lines; only when even the first whole sentence
// overflows that do we fall back to the shorter deterministic caption (never a mid-thought cut).
const SENTENCE_BUDGET: Record<Mode, { sentences: number; chars: number }> = {
  simple: { sentences: 1, chars: 140 },
  deep: { sentences: 2, chars: 240 },
  teach: { sentences: 2, chars: 320 },
};

// Split on sentence ends, keeping the punctuation, so each piece is a whole thought.
function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Keep whole sentences from `text` up to the mode's budget. Returns "" when not even the first
// sentence fits within the char cap, so the caller can fall back to a shorter complete line.
function fitWithin(text: string, sentences: number, chars: number): string {
  const kept: string[] = [];
  for (const s of splitSentences(text)) {
    if (kept.length >= sentences) break;
    const joined = [...kept, s].join(" ");
    if (joined.length > chars) break;
    kept.push(s);
  }
  return kept.join(" ");
}

// Clamp at a word boundary so a runaway single sentence still shows instead of being dropped.
// The trailing ellipsis is honest: it signals the thought was cut, which only happens when the
// model returns one sentence longer than the whole budget.
function clampToChars(text: string, chars: number): string {
  const t = text.trim();
  if (t.length <= chars) return t;
  const cut = t.slice(0, chars);
  const sp = cut.lastIndexOf(" ");
  return (sp > chars * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

// The body for a paid mode (deep/teach): show the real AI why, keeping whole sentences within
// the mode's budget, and clamping only when a single sentence runs past the whole budget. The
// generated why is the point of these modes, so it is never swapped out for the free caption.
function fitWhy(text: string, mode: Mode): string {
  const { sentences, chars } = SENTENCE_BUDGET[mode];
  return fitWithin(text, sentences, chars) || clampToChars(text, chars);
}

// The HUD's second line: prefer the AI-grounded sentence, but only as whole sentences within
// the mode's budget. When it is too long to show complete, use the short deterministic caption
// instead. Never returns a line cut off mid-thought, so the renderer never has to add an ellipsis.
function fitSentence(primary: string, fallback: string, mode: Mode): string {
  const { sentences, chars } = SENTENCE_BUDGET[mode];
  const fit = fitWithin(primary, sentences, chars);
  if (fit) return fit;
  const fb = fitWithin(fallback, sentences, chars);
  return fb || fallback;
}

// The closing footer, shown at the bottom of every finished prompt so there is always a clear
// "this turn is done, here is where to see more" line, whether or not a recap was generated.
const DONE_FOOTER = "Run /codey:timeline for the full breakdown.";

export function composeView(
  events: ToolEvent[],
  snap: StatusSnapshot,
  now: number,
  whys: WhyEntry[] = [],
  budget: Budget | null = null,
): StatusView {
  const budgetLeft = budgetLeftLabel(budget);
  const paused = budgetPausedMessage(budget);
  const newestTs = events.reduce((m, e) => Math.max(m, e.timestamp), Number.NEGATIVE_INFINITY);
  // Claude is between turns: a prompt arrived after the last tool finished, so nothing
  // new is running yet.
  const thinking = snap.promptAt != null && snap.promptAt > newestTs;
  // Claude has finished: the stop hook stamped a doneAt at or after the last tool and no
  // newer prompt is pending. Then we recap instead of pointing at a live phase.
  const done = !thinking && snap.doneAt != null && snap.doneAt >= newestTs;

  // Time on the current turn: ticks while Claude works, freezes at the turn's total length
  // once it finishes. Null before any prompt is stamped.
  let elapsed: string | null = null;
  if (snap.promptAt != null && snap.promptAt > 0) {
    const endTs = done && snap.doneAt != null ? snap.doneAt : now;
    elapsed = formatDuration(Math.max(0, endTs - snap.promptAt));
  }

  const base = { mode: snap.mode, elapsed, budgetLeft };

  if (thinking) {
    return { ...base, state: "thinking", stage: "Thinking", sentence: "Claude is thinking about your request.", warning: null, hint: null };
  }

  if (done) {
    // The close is recapped from the turn's own events, not Claude's chat reply, so it stays
    // honest: "Updated" only when an edit ran, "verified" only when a test or build ran. The
    // footer always sits beneath it, pointing at the fuller browser breakdown.
    const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
    const recap = buildRecap(events.filter((e) => e.timestamp >= turnStart));
    return { ...base, state: "done", stage: "Done", sentence: recap.sentence, warning: null, hint: DONE_FOOTER };
  }

  // The live phase is scoped to the current turn so it resets cleanly on each new prompt.
  // Before any prompt is stamped, the whole session counts as one turn.
  const turnStart = snap.promptAt ?? Number.NEGATIVE_INFINITY;
  const chunks = chunkEvents(events.filter((e) => e.timestamp >= turnStart));

  if (chunks.length === 0) {
    return { ...base, state: "idle", stage: "Idle", sentence: "Waiting for Claude.", warning: snap.warning, hint: null };
  }

  // The current phase is simply the latest chunk: it stays put until the stage changes, so the
  // line holds a meaningful caption instead of flickering once per tool call.
  const current = chunks[chunks.length - 1];
  // When the budget is spent we stop narrating and the caption falls back to its free
  // deterministic wording. The why history is scoped to the current turn so a leftover
  // explanation from the previous prompt never shows under this turn's stage: the
  // explanation always matches the work on screen.
  const turnWhys = whys.filter((w) => w.ts >= turnStart);
  const rawWhy = paused ? null : scheduleWhy(turnWhys, now) ?? snap.why;
  const cleanWhy = rawWhy ? stripMarkdown(stripDashes(stripEllipsis(rawWhy))) : null;
  // Deep and teach are the paid modes: the generated why is the whole point, so show it (clamped
  // to fit) and never swap it for the free deterministic caption. We only reject a why that is
  // literally raw shell text. The deterministic line shows for these modes only before the first
  // why has been generated. Simple keeps its tighter one-line fit-or-fallback behavior.
  const richMode = snap.mode === "deep" || snap.mode === "teach";
  const whyForDisplay = cleanWhy && !hasShellNoise(cleanWhy) ? cleanWhy : null;
  // The line-one chip title is the deterministic purpose label and never depends on the why.
  const title = buildCaption(current, snap.mode, null).title;

  let sentence: string;
  if (richMode && whyForDisplay) {
    sentence = fitWhy(whyForDisplay, snap.mode);
  } else {
    const caption = buildCaption(current, snap.mode, cleanWhy);
    const plain = cleanWhy ? buildCaption(current, snap.mode, null) : caption;
    sentence = fitSentence(pickSentence(caption, snap.mode), pickSentence(plain, snap.mode), snap.mode);
  }
  const hint = paused;

  return {
    ...base,
    // The line-one chip leads with the purpose ("Adding math.js"), not the bare stage, so the
    // HUD says what Claude is working on at a glance.
    state: "live",
    stage: title,
    sentence,
    warning: snap.warning,
    hint,
  };
}
