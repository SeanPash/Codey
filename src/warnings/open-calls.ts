import type { ToolEvent } from "../types.js";

// Returns the "pre" events that have no later matching "post" for the same tool.
export function computeOpenCalls(events: ToolEvent[]): ToolEvent[] {
  const openByTool = new Map<string, ToolEvent[]>();
  for (const e of events) {
    const queue = openByTool.get(e.tool) ?? [];
    if (e.phase === "pre") {
      queue.push(e);
    } else if (queue.length > 0) {
      queue.shift(); // close the oldest open pre of this tool
    }
    openByTool.set(e.tool, queue);
  }
  return [...openByTool.values()].flat().sort((a, b) => a.timestamp - b.timestamp);
}
