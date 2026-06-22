export interface NameInputs {
  firstChunkName: string | null;  // timeline.json chunks[0].name
  firstPrompt: string | null;     // first user message
  sessionId: string;
  mtimeMs: number;
  customName?: string | null;     // user-set name; wins over everything when present
}

const PLACEHOLDER = new Set(["Working", "Task 2", "Continued working."]);

// Keep titles short enough to read at a glance: a few words, never the whole prompt.
const MAX_TITLE = 38;

function clamp(s: string, n: number): string {
  const oneLine = s.split("\n")[0].trim();
  if (oneLine.length <= n) return oneLine;
  // Trim on a word boundary so we don't cut mid-word.
  const cut = oneLine.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

// Pick the most human name available. The AI task name is concise and titled; the first
// prompt is the user's own words; the id is the last resort.
// A user-set customName wins over all automatic names when present and non-empty.
export function sessionDisplayName(i: NameInputs): string {
  if (i.customName && i.customName.trim()) return clamp(i.customName.trim(), MAX_TITLE);
  if (i.firstChunkName && !PLACEHOLDER.has(i.firstChunkName)) return clamp(i.firstChunkName, MAX_TITLE);
  if (i.firstPrompt) return clamp(i.firstPrompt, MAX_TITLE);
  return `Session ${i.sessionId.slice(0, 8)}`;
}

// The folder a terminal is working in, used as a recognizable tag. Null when unknown.
export function projectFrom(cwd: string | null): string | null {
  if (!cwd) return null;
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

// A stable color for a session id so the same terminal looks the same everywhere. We map a
// simple hash to a hue and return an hsl string; saturation/lightness are fixed to stay
// readable on the dark theme.
export function sessionColor(sessionId: string): string {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 62%)`;
}
