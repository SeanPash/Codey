import type { ToolEvent, Mode } from "../types.js";
import { chunkEvents } from "../caption/chunks.js";
import { buildCaption, type LiveCaption } from "../caption/caption.js";
import type { WhyEntry } from "../narration/history.js";

// Small local palette so the feed reads like the status bar without importing its internals.
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BRAND = "\x1b[38;5;75m";
const NUM = "\x1b[38;5;220m";
const TITLE = "\x1b[38;5;253m";
const BODY = "\x1b[38;5;250m";
const LAV = "\x1b[38;5;147m";
const RED = "\x1b[38;5;203m";
const RULE = "\x1b[38;5;240m";

// One step in the work log: a stage chunk, captioned, tagged with the prompt it belongs to.
export interface LogChunk {
  key: string;      // "turn:index", stable so the live tail prints exactly once
  turn: number;
  step: number;     // the chunk's number within its turn
  ts: number;
  caption: LiveCaption;
}

export interface FeedCursor {
  printedChunks: Set<string>;
  turnsHeadered: Set<number>;
}

// Which turn an event belongs to: the count of prompt boundaries at or before its ts.
function turnOf(ts: number, prompts: number[]): number {
  let t = 0;
  for (const p of prompts) {
    if (ts >= p) t++;
    else break;
  }
  return t;
}

// The last why produced inside a chunk's window, reused as its reason at no extra cost.
function whyFor(start: number, end: number, whys: WhyEntry[]): string | null {
  const inWindow = whys.filter((w) => w.ts >= start && w.ts < end);
  return inWindow.length ? inWindow[inWindow.length - 1].why : null;
}

// Build the work log: split events by prompt, group each turn into stage chunks, and caption
// each chunk at the session's mode. This is the same caption model the status line uses, so
// the feed and the HUD never disagree about what a step was.
export function feedChunks(events: ToolEvent[], prompts: number[], whys: WhyEntry[], mode: Mode): LogChunk[] {
  const byTurn = new Map<number, ToolEvent[]>();
  for (const e of events) {
    const t = turnOf(e.timestamp, prompts);
    (byTurn.get(t) ?? byTurn.set(t, []).get(t)!).push(e);
  }

  const out: LogChunk[] = [];
  for (const turn of [...byTurn.keys()].sort((a, b) => a - b)) {
    const chunks = chunkEvents(byTurn.get(turn)!);
    chunks.forEach((chunk, i) => {
      const end = chunks[i + 1]?.startTs ?? Infinity;
      const why = whyFor(chunk.startTs, end, whys);
      out.push({ key: `${turn}:${chunk.index}`, turn, step: chunk.index, ts: chunk.startTs, caption: buildCaption(chunk, mode, why) });
    });
  }
  return out;
}

function turnHeader(turn: number, prompts: number[]): string {
  const ts = prompts[turn - 1];
  const when = ts ? new Date(ts).toTimeString().slice(0, 5) : "";
  const label = when ? `Prompt ${turn} · ${when}` : `Before the first prompt`;
  return `\n${BOLD}${BRAND}══ ${label} ══${RESET}`;
}

// Render one chunk as a numbered work-log entry: a title line, then the plain-English body at
// the session's depth, then the outcome if the step ran into and worked through trouble.
function chunkBlock(c: LogChunk): string {
  const cap = c.caption;
  const sentence = cap.teach ?? cap.deep ?? cap.simple;
  const lines = [
    `${RULE}──────────────${RESET}`,
    `${BOLD}${NUM}${c.step}.${RESET} ${TITLE}${cap.title}${RESET}`,
    `   ${BODY}${sentence}${RESET}`,
  ];
  if (cap.outcome) {
    const tone = cap.stage === "debugging" && !/recover/i.test(cap.outcome) ? RED : LAV;
    lines.push(`   ${tone}${cap.outcome}${RESET}`);
  }
  return lines.join("\n");
}

export function renderFeedHeader(): string {
  return `${BOLD}${BRAND}codey${RESET} ${DIM}· session work log${RESET}`;
}

// Incremental output for live append. A chunk prints once it is sealed: a later chunk exists,
// so it is no longer the live tail the status line is still updating. This keeps the log
// append-only and stops a step from printing early and then growing under the reader.
export function advanceFeed(chunks: LogChunk[], cursor: FeedCursor, sealAll = false): { text: string; cursor: FeedCursor } {
  const parts: string[] = [];
  const printedChunks = new Set(cursor.printedChunks);
  const turnsHeadered = new Set(cursor.turnsHeadered);
  const lastKey = chunks[chunks.length - 1]?.key;

  // Prompt timestamps, rebuilt from the chunks so the header can show the turn's start time.
  const prompts = promptTimes(chunks);

  for (const c of chunks) {
    const sealed = sealAll || c.key !== lastKey;
    if (!sealed || printedChunks.has(c.key)) continue;
    if (!turnsHeadered.has(c.turn)) {
      parts.push(turnHeader(c.turn, prompts));
      turnsHeadered.add(c.turn);
    }
    parts.push(chunkBlock(c));
    printedChunks.add(c.key);
  }

  return { text: parts.join("\n"), cursor: { printedChunks, turnsHeadered } };
}

// The feed only carries chunk start times, not the raw prompt marks, so reconstruct a sparse
// prompt list good enough for the header's clock from the first chunk of each turn.
function promptTimes(chunks: LogChunk[]): number[] {
  const firstOfTurn = new Map<number, number>();
  for (const c of chunks) {
    if (c.turn >= 1 && !firstOfTurn.has(c.turn)) firstOfTurn.set(c.turn, c.ts);
  }
  const max = Math.max(0, ...firstOfTurn.keys());
  const out: number[] = [];
  for (let t = 1; t <= max; t++) out.push(firstOfTurn.get(t) ?? 0);
  return out;
}
