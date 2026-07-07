import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rmSync } from "node:fs";
import { createServer } from "../serve/server.js";
import { buildIdFrom } from "../serve/build-id.js";
import { loadSnapshot, loadLive, loadNow, runExplain, backfillTokens } from "../serve/load-snapshot.js";
import { recordIntervention } from "../intervene/record.js";
import { listSessions } from "./sessions.js";
import { defaultRoot } from "../store/session-store.js";
import { pruneEventless } from "../store/session-prune.js";
import { writeCustomName } from "../store/session-name-store.js";
import { writeSaved } from "../store/session-saved-store.js";
import { dismiss, restore } from "../store/dismissed-store.js";
import {
  addSessionToGroup,
  createGroup,
  deleteGroup,
  listGroups,
  listSessionIdsInGroup,
  removeSessionFromAllGroups,
  removeSessionFromGroup,
  renameGroup,
} from "../store/session-group-store.js";

const here = dirname(fileURLToPath(import.meta.url));
// dist/cli/serve.js and dist/serve/public/index.html after build; src mirrors the layout.
function publicDir(): string {
  return join(here, "..", "serve", "public");
}

// A session id maps straight onto a folder under the sessions root, so reject anything that
// could climb out of it. Applied to every handler that joins the id onto a path.
function safeId(id: string): boolean {
  return !!id && !id.includes("/") && !id.includes("\\") && !id.includes("..");
}

export function runServe(opts: { session?: string; port: number }): void {
  // Remove stale event-less session folders left by phantom headless invocations.
  try {
    pruneEventless(defaultRoot(), Date.now(), 30 * 60_000);
  } catch {
    // Never block serving due to a prune failure.
  }

  // Backfill per-session token totals in the background so "Most tokens" sorting works for sessions
  // the user has not opened yet. Fire-and-forget: it must never delay the server coming up.
  setImmediate(() => { try { backfillTokens(defaultRoot()); } catch { /* best-effort */ } });

  const server = createServer({
    pagePath: join(publicDir(), "index.html"),
    fontsDir: join(publicDir(), "fonts"),
    buildId: buildIdFrom(fileURLToPath(import.meta.url)),
    listSessions: () => listSessions(),
    listGroups: () => listGroups(defaultRoot()),
    createGroup: (name) => createGroup(defaultRoot(), name),
    renameGroup: (id, name) => renameGroup(defaultRoot(), id, name),
    deleteGroup: (id) => deleteGroup(defaultRoot(), id),
    addSessionToGroup: (groupId, sessionId) => safeId(sessionId) && addSessionToGroup(defaultRoot(), groupId, sessionId),
    removeSessionFromGroup: (groupId, sessionId) => safeId(sessionId) && removeSessionFromGroup(defaultRoot(), groupId, sessionId),
    listGroupSessions: (groupId) => {
      const ids = new Set(listSessionIdsInGroup(defaultRoot(), groupId));
      return listSessions().filter((s) => ids.has(s.id));
    },
    getSnapshot: (id, saver, rich) => {
      if (!safeId(id)) throw new Error("invalid session id");
      return loadSnapshot(id, undefined, saver, rich);
    },
    getNow: (id) => {
      if (!safeId(id)) throw new Error("invalid session id");
      return loadNow(id);
    },
    getLive: (saver) => loadLive(undefined, saver),
    intervene: (id, action) => safeId(id) && recordIntervention(id, action),
    rename: (id, name) => {
      if (!safeId(id)) return false;
      try {
        writeCustomName(join(defaultRoot(), id), name);
        return true;
      } catch {
        return false;
      }
    },
    setSaved: (id, saved) => {
      if (!safeId(id)) return false;
      try {
        writeSaved(join(defaultRoot(), id), saved);
        return true;
      } catch {
        return false;
      }
    },
    remove: (id) => {
      if (!safeId(id)) return false;
      try {
        removeSessionFromAllGroups(defaultRoot(), id);
        rmSync(join(defaultRoot(), id), { recursive: true, force: true });
        return true;
      } catch {
        return false;
      }
    },
    dismiss: (id) => {
      if (!safeId(id)) return false;
      try { dismiss(defaultRoot(), id); return true; } catch { return false; }
    },
    restore: (id) => {
      if (!safeId(id)) return false;
      try { restore(defaultRoot(), id); return true; } catch { return false; }
    },
    explain: (id, body) => runExplain(id, body),
  });
  // If the port is already taken, fail loudly instead of dying silently. The launcher relies
  // on a failed bind so a stale server can never quietly outlive the one we meant to start.
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${opts.port} is already in use.`);
    } else {
      console.error(`Timeline server error: ${err.message}`);
    }
    process.exit(1);
  });
  // Bind to loopback only. The timeline shows a session's full activity, so it must never be
  // reachable from other machines on the network; it is meant for the local user alone.
  server.listen(opts.port, "127.0.0.1", () => {
    console.log(`Codey timeline at http://localhost:${opts.port}`);
    if (opts.session) console.log(`(session: ${opts.session})`);
  });
}
