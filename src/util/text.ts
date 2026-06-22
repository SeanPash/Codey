// Codey never shows em dashes (or en dashes) in the copy it generates. The generation prompts
// ask the model to avoid them, but models slip, so this is the backstop: dash-style clause
// breaks become a comma, the way a person would rewrite them by hand. Run every generated
// string (task/action explanations, prompt recaps, live narration) through here before it is
// cached or shown.
export function stripDashes(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, ", ") // em/en dash, with any surrounding spaces
    .replace(/ - /g, ", ")                  // a spaced hyphen used as a clause break
    .replace(/ ,/g, ",")                    // no stray space before a comma we created
    .replace(/,\s*,/g, ",")                 // collapse a doubled comma
    .replace(/\s{2,}/g, " ")                // tidy any run of spaces
    .trim();
}
