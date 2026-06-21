export interface NameInputs {
  firstChunkName: string | null;  // timeline.json chunks[0].name
  firstPrompt: string | null;     // first user message
  sessionId: string;
  mtimeMs: number;
}

const PLACEHOLDER = new Set(["Working", "Task 2", "Continued working."]);

function clamp(s: string, n: number): string {
  const oneLine = s.split("\n")[0].trim();
  return oneLine.length > n ? oneLine.slice(0, n - 1).trimEnd() + "…" : oneLine;
}

// Pick the most human name available. The AI task name is concise and titled; the first
// prompt is the user's own words; the id is the last resort.
export function sessionDisplayName(i: NameInputs): string {
  if (i.firstChunkName && !PLACEHOLDER.has(i.firstChunkName)) return clamp(i.firstChunkName, 48);
  if (i.firstPrompt) return clamp(i.firstPrompt, 48);
  return `Session ${i.sessionId.slice(0, 8)}`;
}
