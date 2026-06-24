// Pull the real names out of a change: the function, test, or symbol an edit added. This is
// what lets a caption say "adding a mean test" instead of "changing specific lines". It reads
// only the text Claude wrote (new_string, file content), never guesses, and falls back to an
// empty list when there is nothing nameable, so the caller can phrase honestly.

// Identifiers that are language scaffolding or test plumbing, not the subject of the change.
// A caption about "expect" or "console" would say nothing, so these never count as symbols.
const NOISE = new Set([
  "console", "assert", "log", "error", "warn", "info", "debug",
  "expect", "require", "import", "export", "return", "throw", "await", "async",
  "if", "for", "while", "switch", "case", "catch", "try", "else", "do",
  "function", "const", "let", "var", "class", "new", "typeof", "instanceof",
  "this", "super", "void", "delete", "yield",
  "Number", "String", "Boolean", "Array", "Object", "JSON", "Math", "Map", "Set",
  "Promise", "Date", "RegExp", "Symbol", "parseInt", "parseFloat",
  "it", "test", "describe", "beforeEach", "afterEach", "beforeAll", "afterAll",
]);

// The text a change actually added, gathered from whichever field this tool carries it in.
function addedText(tool: string, input: unknown): string {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (tool === "Write" && typeof o.content === "string") return o.content;
  if (tool === "Edit" && typeof o.new_string === "string") return o.new_string;
  if (tool === "NotebookEdit" && typeof o.new_source === "string") return o.new_source;
  if (tool === "MultiEdit" && Array.isArray(o.edits)) {
    return o.edits
      .map((e) => (e && typeof e === "object" ? (e as Record<string, unknown>).new_string : null))
      .filter((s): s is string => typeof s === "string")
      .join("\n");
  }
  return "";
}

function push(list: string[], name: string | undefined): void {
  const n = (name ?? "").trim();
  if (n.length >= 2 && !NOISE.has(n) && !list.includes(n)) list.push(n);
}

// The symbols a change introduced, most telling first: test names, then declarations, then the
// functions it calls. Capped to a few so a caption names the subject without listing the file.
export function extractSymbols(tool: string, input: unknown, max = 3): string[] {
  const text = addedText(tool, input);
  if (!text) return [];
  const out: string[] = [];

  // Test names are the clearest statement of intent ("returns the mean"), so they lead.
  for (const m of text.matchAll(/\b(?:it|test|describe)\s*\(\s*["'`]([^"'`]+)["'`]/g)) {
    push(out, m[1]);
  }
  // Declarations name the thing being built.
  for (const m of text.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) push(out, m[1]);
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) push(out, m[1]);
  for (const m of text.matchAll(/\bdef\s+([A-Za-z_$][\w$]*)/g)) push(out, m[1]);
  // Called functions are the next best signal of what the change is about.
  for (const m of text.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) push(out, m[1]);

  return out.slice(0, max);
}
