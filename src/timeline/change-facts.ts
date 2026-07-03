// One grounded "change fact" per action: the actual substance of what an edit, write, search,
// or command did, built straight from the tool input. This is what lets a timeline explanation
// name the real change (a ".sw -> .stgl" rename, an added FLAG) instead of only naming a file.
// It reads only what Claude actually wrote or ran; it never guesses, and returns null when there
// is no change to report (a read, or a thinking turn), so the caller can stay honest.

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function str(input: unknown, key: string): string | null {
  if (input && typeof input === "object") {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
  }
  return null;
}

// The old/new pair for a single edit, phrased so the model can see a rename or a value swap.
// An empty old side reads as a pure addition; otherwise both sides show, each clipped.
function editFact(oldS: string | null, newS: string | null): string | null {
  if (newS == null) return null;
  const from = (oldS ?? "").trim();
  if (!from) return `added "${clip(newS, 120)}"`;
  return `replaced "${clip(from, 80)}" with "${clip(newS, 80)}"`;
}

// Fold a MultiEdit's edits array into one fact: the first concrete replacement plus a count of
// the rest, so a batch of edits stays readable without listing every pair.
function multiEditFact(input: unknown): string | null {
  const edits = input && typeof input === "object" ? (input as Record<string, unknown>).edits : null;
  if (!Array.isArray(edits) || edits.length === 0) return null;
  const first = edits[0] as Record<string, unknown>;
  const one = editFact(
    typeof first.old_string === "string" ? first.old_string : null,
    typeof first.new_string === "string" ? first.new_string : null,
  );
  if (!one) return null;
  const rest = edits.length - 1;
  return rest > 0 ? `${one} (and ${rest} more edit${rest > 1 ? "s" : ""})` : one;
}

// The grounded change substance for one action, or null when the action changed nothing.
export function changeFact(tool: string | null, input: unknown): string | null {
  if (!tool) return null;
  switch (tool) {
    case "Edit":
      return editFact(str(input, "old_string"), str(input, "new_string"));
    case "MultiEdit":
      return multiEditFact(input);
    case "NotebookEdit":
      return editFact(null, str(input, "new_source"));
    case "Write": {
      const content = str(input, "content") ?? str(input, "new_source");
      return content ? `wrote "${clip(content, 140)}"` : "wrote a new file";
    }
    case "Bash":
    case "PowerShell": {
      const cmd = str(input, "command");
      return cmd ? `ran: ${clip(cmd, 160)}` : null;
    }
    case "Grep":
    case "Glob": {
      const pat = str(input, "pattern");
      return pat ? `searched for "${clip(pat, 80)}"` : null;
    }
    default:
      return null;
  }
}
