import type { Mode } from "../types.js";

export interface CardView {
  seq: number;
  endSeq?: number; // present when the row covers a grouped burst, e.g. #3-7
  tag: string;
  target: string;
  raw: string | null;
}

export interface SummaryView {
  sentence: string | null; // the narrator's plain-English recap of the finished turn
  items: CardView[]; // the last few completed steps, as a done checklist
}

export interface StatusView {
  mode: Mode;
  current: CardView | null;
  prev: CardView[]; // task-only rows, oldest first
  why: string | null;
  warning: string | null;
  thinking: boolean; // true between a prompt and Claude's first tool call
  summary: SummaryView | null; // present once Claude has finished a turn
  budgetLeft: string | null; // e.g. "3.8k left" when a budget cap is armed, else null
}
