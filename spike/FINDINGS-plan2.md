# Spike Findings (Plan 2, Task 1)

Date: 2026-06-20. Goal: de-risk token attribution and segmentation before building the
browser timeline. Builds on the Plan 1 spike (`FINDINGS.md`), which already confirmed the
hook payload carries `transcript_path` and `cwd`, and that the transcript JSONL holds
per-message `usage`.

Transcript inspected: a real session JSONL under
`~/.claude/projects/C--Users-seanp-Documents-GitHub-Codey/` (108 lines). CLI version line
recorded in each record (`version` field); Plan 1 spike noted 2.1.183.

## 1. Transcript record shapes (CONFIRMED)

The field names `parseTranscript` (Task 4) assumes are all correct:

- **Assistant line:** `type: "assistant"`, top-level `timestamp` (ISO string, e.g.
  `2026-06-20T15:59:56.202Z`), and `message.usage` with `input_tokens`, `output_tokens`,
  `cache_read_input_tokens`, `cache_creation_input_tokens` (plus extra keys we ignore).
- **Assistant `message.content` blocks:** the block types seen across the file are
  `thinking`, `text`, `tool_use`, `tool_result`. A `tool_use` block has keys
  `type, id, name, input` (`name` e.g. "Bash", `id` a string, `input` an object).
- **Tool result** appears on a later `type: "user"` line as a `tool_result` block with keys
  `tool_use_id, type, content`.

### Important nuance: `is_error` is absent on success

On a successful `tool_result`, **`is_error` is not present** (value is `undefined`), not
`false`. The content was a plain string in the sample. `parseTranscript` already guards
this correctly with `b.is_error === true` (treats absent as not-an-error) and `resultText`
handles both string and array-of-text content. No code change needed.

## 2. Token math sanity check (CONFIRMED)

Summed the first 5 assistant turns of a real session:

- work (sum of `output_tokens`) = **2,359**
- context (sum of `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`) =
  **122,408**

Context is ~52x the work number. This matches the receipt model: output is the small
"work Claude did" number per action; input+cache is the large "mostly cached, cheap"
context line. `attributeChunk` (Task 4) splits exactly this way.

## 3. Timestamp alignment (CONFIRMED robust to skew)

Transcript timestamps are ISO strings with millisecond resolution
(`2026-06-20T15:59:54.792Z` ... `16:02:29.409Z` across the session). Plan 1 stores hook
event timestamps as `Date.now()` ms. The two describe the same actions within sub-second
to a few seconds of each other. Bucketing transcript turns into a chunk window
`[chunkStart, nextChunkStart)` keyed off event timestamps is robust to that skew, because
chunk boundaries are coarse (whole tasks), far larger than the skew.

## 4. Headless segmentation cost (CONFIRMED via Plan 1)

Plan 1 spike already measured `claude -p --model haiku` at ~4s with no key prompt, reusing
the existing login. That is the same wrapper Task 6 reuses (`runSegmentation`, 30s budget).
A one-shot segmentation pass over a numbered event list is well within budget, and it runs
as a cached background refresh so it never blocks a poll. Not re-run here to avoid a billed
call; the latency/auth risk is already retired.

## Conclusion

No plan changes required. `parseTranscript`'s field names match the current CLI. The
`is_error`-absent-on-success case is already handled. Proceed with Task 2.
