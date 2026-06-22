import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultRoot } from "../store/session-store.js";
import { stripDashes } from "../util/text.js";
import type { ExplainDepth } from "./explain-prompt.js";

// What a cached explanation is attached to. Task and action explanations and per-prompt
// summaries all share one store, keyed by scope so they never collide.
export type ExplainScope = "task" | "action" | "summary";

type Store = Record<string, string>;

function cachePath(sessionId: string, root: string): string {
  return join(root, sessionId, "explanations.json");
}

// The id alone (without content hash or depth) identifies the thing being explained, so we
// can prune its stale entries when its content changes.
function idPrefix(scope: ExplainScope, id: string): string {
  return `${scope}:${id}:`;
}

function key(scope: ExplainScope, id: string, contentHash: string, depth: ExplainDepth): string {
  return `${idPrefix(scope, id)}${contentHash}:${depth}`;
}

function read(sessionId: string, root: string): Store {
  const p = cachePath(sessionId, root);
  if (!existsSync(p)) return {};
  try {
    const o = JSON.parse(readFileSync(p, "utf8"));
    return o && typeof o === "object" ? (o as Store) : {};
  } catch {
    return {};
  }
}

export function readExplanation(
  sessionId: string, scope: ExplainScope, id: string, contentHash: string, depth: ExplainDepth,
  root: string = defaultRoot(),
): string | null {
  const store = read(sessionId, root);
  const hit = store[key(scope, id, contentHash, depth)];
  // Clean on the way out too, so entries written before the no-dash rule still surface clean.
  return hit == null ? null : stripDashes(hit);
}

export function writeExplanation(
  sessionId: string, scope: ExplainScope, id: string, contentHash: string, depth: ExplainDepth, text: string,
  root: string = defaultRoot(),
): void {
  const store = read(sessionId, root);
  // Drop any stale entry for this same thing at a different content hash, so the file does
  // not grow without bound as a task's content evolves. Other depths at the live hash stay.
  const prefix = idPrefix(scope, id);
  const live = key(scope, id, contentHash, depth);
  for (const k of Object.keys(store)) {
    if (k.startsWith(prefix) && !k.startsWith(`${prefix}${contentHash}:`) && k !== live) delete store[k];
  }
  store[live] = stripDashes(text);
  mkdirSync(join(root, sessionId), { recursive: true });
  writeFileSync(cachePath(sessionId, root), JSON.stringify(store));
}
