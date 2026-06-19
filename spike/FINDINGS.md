# Spike Findings (Task 1)

Date: 2026-06-19. Goal: de-risk the three spec assumptions before building Plan 1.

## 1. Hook payload field names (CONFIRMED)

Captured real `PreToolUse` and `PostToolUse` payloads by registering a probe hook and
running a headless `claude -p` that performed a `Read`. The field names the plan assumes
are all correct:

| Field | Present | Notes |
|-------|---------|-------|
| `hook_event_name` | yes | "PreToolUse" / "PostToolUse" |
| `tool_name` | yes | e.g. "Read" |
| `tool_input` | yes | object, e.g. `{ file_path }` |
| `tool_response` | yes (post) | object on success, e.g. `{ type, file }` |
| `session_id` | yes | |
| `transcript_path` | yes | absolute path to the session JSONL |

So `normalize.ts` (Task 3) can use these names as written. No plan change needed.

### Bonus fields also present (not required by Plan 1)
- `tool_use_id` — a real unique id on BOTH pre and post. This means precise pre/post
  pairing is possible, instead of the plan's FIFO-by-tool approximation (Task 7). Left as
  a future improvement so v1 stays on-plan; the data is available when we want it.
- `duration_ms` — present on the post event (exact tool duration).
- `cwd`, `permission_mode` — also present.

## 2. Headless Claude reuses login (CONFIRMED)

`claude -p --model haiku "Reply with exactly: OK"` printed `OK` in ~4s with no API-key
prompt, proving it reuses the existing Claude Code login. Well within the live-narration
budget (< ~5s). CLI version 2.1.183.

## 3. Token data in the transcript (CONFIRMED, informs Plan 2)

The transcript JSONL contains per-message `usage` with `input_tokens`, `output_tokens`,
`cache_creation_input_tokens`, `cache_read_input_tokens`, and more. Entries also carry
`timestamp` and `sessionId`. So per-task token attribution (summing tokens inside a
chunk's time window) is feasible for Plan 2. Not used in Plan 1.

## Observation to keep in mind (hang detection)

In one sample, an errored `Read` (file not found) produced only a `PreToolUse` and **no**
`PostToolUse`. A successful `Read` produced both. If some errored tools skip the post
event, the open-call pairing (Task 7) could treat them as perpetually open and emit a
false "hang" warning. Single sample, not conclusive, but worth watching when we test
hang detection on real sessions. A future switch to `tool_use_id`-based pairing plus an
upper bound on hang age would mitigate it.
