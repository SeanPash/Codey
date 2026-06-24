// Generic filler that means Codey failed to say anything real. A primary visible caption
// (the statusline sentence, a timeline card, the work-log feed) must never fall back to
// these when files, search terms, commands, or diffs were available to name instead. The
// list is the guard the caption tests sweep against, so a regression shows up as a failing
// test rather than a vague line in front of the user.
export const BANNED_PHRASES: RegExp[] = [
  /see how it works/i,
  /see how the pieces fit together/i,
  /\bbefore changing anything\b/i,
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
