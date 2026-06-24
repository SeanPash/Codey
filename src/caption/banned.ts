// Generic filler that means Codey failed to say anything real. A primary visible caption
// (the statusline sentence, a timeline card, the work-log feed) must never fall back to
// these when files, search terms, commands, or diffs were available to name instead. The
// list is the guard the caption tests sweep against, so a regression shows up as a failing
// test rather than a vague line in front of the user.
export const BANNED_PHRASES: RegExp[] = [
  /see how it works/i,
  /follow how it works/i,
  /adjust how it works/i,
  /see how the pieces fit together/i,
  // Empty "thinking" filler: a row or explanation that says the agent thought without saying
  // about what. These are the exact strings the old timeline emitted for a bare thinking turn.
  /thinking it through/i,
  /working through the approach before acting/i,
  /paused and reflected/i,
  /figure out what the right next step should be/i,
  // A status line once collapsed two git reads into "git state and git state"; never again.
  /git state and git state/i,
  /\bbefore changing anything\b/i,
  /\bchanging specific lines\b/i,
  /\bchanging files in place\b/i,
  /\bfind the part it needs\b/i,
  /\bmap how they connect\b/i,
  /\bchecking the code\b/i,
  /\bsearching the project for the code\b/i,
  /\breading files to understand them\b/i,
  /\bseveral files\b/i,
  /\ba few files\b/i,
  /\bvarious files\b/i,
  /\bseveral related files\b/i,
  /\brelated project files\b/i,
  /\bin one change\b/i,
  /\brunning shell commands\b/i,
  /\bchecking shell commands\b/i,
  /\ba few shell commands\b/i,
  /\bediting files\b/i,
  /\bupdating files\b/i,
  /\bmaking changes\b/i,
  /\bimproving the implementation\b/i,
  /\bworking on the task\b/i,
];

// The first banned phrase a string trips, or null. Returned (not just a boolean) so a test
// failure can name exactly which phrase leaked through.
export function firstBannedPhrase(text: string): string | null {
  for (const re of BANNED_PHRASES) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

export function hasBannedPhrase(text: string): boolean {
  return firstBannedPhrase(text) !== null;
}

// Filler that only a generated explanation produces: the model hedging that a step (usually a
// bare thinking turn) had no real content, then narrating the hedge instead of the work. An
// explanation that trips this says nothing, so the caller suppresses it and shows no panel
// rather than print "the agent paused and reflected" in front of the user.
const VACUOUS_EXPLANATION: RegExp[] = [
  /\bpaused (to|and) (think|reflect)/i,
  /\b(the agent|claude) (paused|stopped) (to|and)\b/i,
  /\breflected on (its|the|what)/i,
  /\bno (specific|concrete|clear|particular) (reason|detail|information|context)\b/i,
  /\bnothing (specific|concrete|particular) (to (say|add|explain)|here)\b/i,
];

// True when a generated explanation is empty filler and should not be shown.
export function isVacuousExplanation(text: string): boolean {
  if (hasBannedPhrase(text)) return true;
  return VACUOUS_EXPLANATION.some((re) => re.test(text));
}
