// Codey never shows em dashes (or en dashes) in the copy it generates. The generation prompts
// ask the model to avoid them, but models slip, so this is the backstop: dash-style clause
// breaks become a comma, the way a person would rewrite them by hand. Run every generated
// string (task/action explanations, prompt recaps, live narration) through here before it is
// cached or shown.
export function stripDashes(s: string): string {
  return s
    .replace(/[ \t]*[—–][ \t]*/g, ", ")     // em/en dash, with any surrounding spaces
    .replace(/ - /g, ", ")                  // a spaced hyphen used as a clause break
    .replace(/ ,/g, ",")                    // no stray space before a comma we created
    .replace(/,[ \t]*,/g, ",")              // collapse a doubled comma
    .replace(/[^\S\n]{2,}/g, " ")           // tidy runs of spaces, but keep newlines so sections survive
    .replace(/[ \t]*\n[ \t]*/g, "\n")       // trim spaces around line breaks
    .replace(/\n{3,}/g, "\n\n")             // at most one blank line between sections
    .trim();
}

// The status line and ticker are plain text, but the model often wraps code in markdown
// (`loss()`, **bold**). Those characters render literally in a terminal, so strip the markup
// while keeping the word itself. Run generated narration through here before it is shown.
export function stripMarkdown(s: string): string {
  return s
    .replace(/`+/g, "")            // inline code fences around names
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/(^|\s)\*([^*]+)\*/g, "$1$2") // italics, but not a literal "a * b"
    .replace(/\s{2,}/g, " ")
    .trim();
}
