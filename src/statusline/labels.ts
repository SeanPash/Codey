export interface ActionLabel {
  tag: string;     // a gerund: reading, editing, running, searching, writing, waiting
  target: string;  // the thing being acted on
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function str(input: unknown, key: string): string | null {
  if (input && typeof input === "object") {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return null;
}

export function actionLabel(tool: string, input: unknown): ActionLabel {
  const file = str(input, "file_path") ?? str(input, "path");
  switch (tool) {
    case "Read": return { tag: "reading", target: file ? basename(file) : "a file" };
    case "Edit":
    case "MultiEdit": return { tag: "editing", target: file ? basename(file) : "a file" };
    case "Write": return { tag: "writing", target: file ? basename(file) : "a file" };
    case "Bash": {
      const c = str(input, "command");
      return { tag: "running", target: c ? c.split("\n")[0].slice(0, 40) : "a command" };
    }
    case "Grep":
    case "Glob": {
      const p = str(input, "pattern");
      return { tag: "searching", target: p ?? "the code" };
    }
  }
  const m = /^mcp__([^_]+)__(.+)$/.exec(tool);
  if (m) return { tag: "running", target: `${m[2].replace(/_/g, " ")} (${m[1]})` };
  return { tag: "working", target: tool };
}
