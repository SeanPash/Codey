export type ToolPhase = "pre" | "post";
export type Mode = "simple" | "deep";

export interface ToolEvent {
  id: string;          // unique per emitted event
  phase: ToolPhase;
  tool: string;        // e.g. "mcp__unity__execute_menu_item" or "Read"
  server: string | null; // "unity" for mcp__unity__*, else null
  input: unknown;      // present on "pre"
  inputHash: string;   // stable hash of tool + input (for loop detection)
  isError: boolean;    // meaningful on "post"
  errorText: string | null;
  timestamp: number;   // ms since epoch
  sessionId: string;
}

export type WarningKind = "loop" | "hang" | "repeat_error";

export interface Warning {
  kind: WarningKind;
  tool: string;
  message: string;
  count: number;       // repetitions (loop/repeat_error) or seconds (hang)
  timestamp: number;
}
