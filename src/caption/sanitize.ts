// Guards that keep a caption reading like clean English instead of a debug dump. Codey builds
// captions from real evidence (file names, search terms, shell text), so the danger is not a
// vague line but a raw one: a command pasted into prose, or a long comma list of internals. These
// helpers are the deterministic floor every surface runs its sentences and titles through.

// Shell syntax that never reads as part of a sentence: a pipe, a command substitution, a logical
// operator, an env assignment, a home-relative path, or a redirect.
const SHELL_NOISE = /[|`]|\$\(|&&|\|\||~\/|=\$|\$\{|\d?\s*[<>]\s*&?/;

// A trailing "..." or "…" reads as an unfinished thought. A caption is always a complete sentence,
// so a dangling ellipsis is replaced with a period. Text without an ellipsis is returned untouched
// (a generated why is shown verbatim, never re-punctuated).
export function stripEllipsis(text: string): string {
  if (!/(\.{3,}|…)\s*$/.test(text)) return text;
  const t = text.replace(/\s*(\.{3,}|…)\s*$/, "").trimEnd();
  return t ? t + "." : t;
}

// True when a string looks like raw evidence dumped into prose rather than a phrased thought: it
// carries shell syntax, or strings too many comma-separated items together. Used to reject a
// generated explanation that came back as a list, so the surface falls back to a clean sentence.
export function looksLikeEvidenceDump(text: string): boolean {
  if (SHELL_NOISE.test(text)) return true;
  const commas = (text.match(/,/g) || []).length;
  return commas >= 3;
}

// Keep the first few words of a phrase, dropping a trailing connective so a clamp never ends on
// "and" or "the". This is how a long shell description becomes a short subject or title fragment
// without turning into a sprawling run-on.
export function clampWords(text: string, max: number): string {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  const kept = words.slice(0, max);
  while (kept.length > 1 && /^(and|or|the|a|an|of|to|for|in|on|with|that|which)$/i.test(kept[kept.length - 1])) {
    kept.pop();
  }
  return kept.join(" ");
}

// A subject must be a short noun phrase. A phrase carrying shell syntax is not readable inline, so
// collapse it to a plain noun; an over-long phrase is clamped to its leading words.
export function tidySubject(name: string, maxWords = 5): string {
  const n = (name ?? "").trim();
  if (!n) return n;
  if (SHELL_NOISE.test(n)) return "the command";
  return clampWords(n, maxWords);
}
