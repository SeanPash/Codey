import type { ToolEvent } from "../types.js";
import { actionLabel, rawTarget, shortTarget } from "../statusline/labels.js";
import { classifyStage, type Stage } from "./stage.js";
import { describeShellIntent } from "./shell.js";

// One meaningful run of work: a stretch of tool calls that all belong to the same stage,
// summarized once. This is the unit every surface renders, instead of a row per tool call.
export interface WorkChunk {
  stage: Stage;
  index: number;      // 1-based position in the chunk list, the work-log step number
  startIndex: number; // index of the chunk's first event in the source array, for the timeline
  count: number;      // how many actions were folded into this chunk
  tool: string;       // the first action's tool, a representative
  targets: string[];  // plain short names touched, in order ("a.ts", "the tests")
  raw: string | null; // the first action's raw detail, revealed only when truly useful
  startTs: number;
  endTs: number;
  failed: boolean;    // an action in this chunk errored
  resolved: boolean;  // it failed, but a later action of the same tool then succeeded
}

// A run of the same stage that pauses longer than this is treated as a separate chunk, so
// work picked up again after a break reads as a fresh step rather than one endless run.
const IDLE_SPLIT_MS = 90_000;

interface Building extends WorkChunk {
  tools: string[];          // tool of each folded action, to spot a same-tool recovery
  failedTools: string[];    // tools whose action errored, pending a later success
}

// Map each pre event to whether its matching post errored. Pairs by tool_use id when present,
// else falls back to the next unconsumed post of the same tool.
function outcomes(events: ToolEvent[]): Map<ToolEvent, boolean> {
  const byId = new Map<string, boolean>();
  for (const e of events) {
    if (e.phase === "post" && e.toolUseId) byId.set(e.toolUseId, e.isError);
  }
  const postsByTool = new Map<string, boolean[]>();
  for (const e of events) {
    if (e.phase === "post" && !e.toolUseId) {
      const list = postsByTool.get(e.tool) ?? [];
      list.push(e.isError);
      postsByTool.set(e.tool, list);
    }
  }
  const out = new Map<ToolEvent, boolean>();
  for (const e of events) {
    if (e.phase !== "pre") continue;
    if (e.toolUseId && byId.has(e.toolUseId)) {
      out.set(e, byId.get(e.toolUseId)!);
      continue;
    }
    const list = postsByTool.get(e.tool);
    if (list && list.length) out.set(e, list.shift()!);
  }
  return out;
}

function shellFields(input: unknown): { command: string | null; description: string | null } {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const command = typeof o.command === "string" ? o.command : null;
  const description = typeof o.description === "string" ? o.description : null;
  return { command, description };
}

// The short subject a chunk names. A shell command resolves to its real purpose ("the
// installed plugin config") instead of a tool-shaped phrase ("a few shell commands").
function shortName(tool: string, input: unknown): string {
  if (tool === "Bash" || tool === "PowerShell") {
    const { command, description } = shellFields(input);
    if (command) return describeShellIntent(command, description).subject;
  }
  return shortTarget(actionLabel(tool, input).target);
}

export function chunkEvents(events: ToolEvent[]): WorkChunk[] {
  const failedBy = outcomes(events);
  const built: Building[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.phase !== "pre") continue;
    const failed = failedBy.get(e) ?? false;
    const stage = classifyStage(e.tool, e.input, failed);
    const name = shortName(e.tool, e.input);
    const last = built[built.length - 1];

    // A chunk continues while the stage holds and the gap stays short. Editing and
    // debugging belong together, since debugging is a failed change being worked through,
    // so a recovery does not split the chunk.
    const stageMatches =
      last &&
      (last.stage === stage ||
        (mutating(last.stage) && mutating(stage)));
    const close = last && e.timestamp - last.endTs <= IDLE_SPLIT_MS;

    if (last && stageMatches && close) {
      last.count++;
      if (last.targets.length < 6) last.targets.push(name);
      last.endTs = e.timestamp;
      last.tools.push(e.tool);
      // A debugging action anywhere pulls the whole chunk into the debugging stage.
      if (stage === "debugging") last.stage = "debugging";
      if (failed) {
        last.failed = true;
        last.failedTools.push(e.tool);
      } else if (last.failedTools.includes(e.tool)) {
        last.resolved = true;
      }
    } else {
      built.push({
        stage,
        index: built.length + 1,
        startIndex: i,
        count: 1,
        tool: e.tool,
        targets: [name],
        raw: rawTarget(e.tool, e.input),
        startTs: e.timestamp,
        endTs: e.timestamp,
        failed,
        resolved: false,
        tools: [e.tool],
        failedTools: failed ? [e.tool] : [],
      });
    }
  }

  return built.map(({ tools, failedTools, ...chunk }) => chunk);
}

// Editing and debugging are two sides of the same activity (changing code, then fixing what
// the change broke), so they share a chunk instead of fragmenting into separate steps.
function mutating(stage: Stage): boolean {
  return stage === "editing" || stage === "debugging";
}
