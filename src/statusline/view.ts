import type { Mode } from "../types.js";

export interface CardView {
  seq: number;
  tag: string;
  target: string;
  raw: string | null;
}

export interface StatusView {
  mode: Mode;
  current: CardView | null;
  prev: CardView[]; // task-only rows, oldest first
  why: string | null;
  warning: string | null;
}
