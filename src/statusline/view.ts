import type { Mode } from "../types.js";

// What the status line is showing right now. A compact HUD, not a framed log: one state,
// one phase chip, one sentence. The render layer turns this into at most two lines.
export type StatusState = "live" | "thinking" | "done" | "idle";

export interface StatusView {
  mode: Mode;
  state: StatusState;
  stage: string;             // the phase chip for line one: "Editing", "Thinking", "Done"
  sentence: string;          // the plain-English line two
  elapsed: string | null;    // time on the current turn, or its final length when done
  warning: string | null;    // a "stuck" alert that takes over line two, or null
  budgetLeft: string | null; // a small "3.8k left" cue for line one, or null when uncapped
  hint: string | null;       // a dim pointer (explain hint, paused notice, see-more), or null
}
