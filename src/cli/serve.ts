import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "../serve/server.js";
import { listSessions } from "./sessions.js";
import { SessionStore, defaultRoot } from "../store/session-store.js";
import type { SessionSnapshot } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
// dist/cli/serve.js and dist/serve/public/index.html after build; src mirrors the layout.
function pagePath(): string {
  return join(here, "..", "serve", "public", "index.html");
}

// Temporary snapshot until Task 5's assembler lands.
function rawSnapshot(id: string): SessionSnapshot {
  const events = new SessionStore(id, defaultRoot()).readAll();
  return {
    sessionId: id,
    sessionName: id,
    live: false,
    totalTokens: 0,
    taskCount: 0,
    priciestTaskName: null,
    chunks: [],
    // raw passthrough for the early page; not part of the final type
    ...( { events } as object ),
  } as SessionSnapshot;
}

export function runServe(opts: { session?: string; port: number }): void {
  const server = createServer({
    pagePath: pagePath(),
    listSessions: () => listSessions(),
    getSnapshot: (id) => rawSnapshot(id),
  });
  server.listen(opts.port, () => {
    console.log(`Codey timeline at http://localhost:${opts.port}`);
    if (opts.session) console.log(`(session: ${opts.session})`);
  });
}
