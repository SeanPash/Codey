import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "../serve/server.js";
import { buildIdFrom } from "../serve/build-id.js";
import { loadSnapshot, loadLive } from "../serve/load-snapshot.js";
import { recordIntervention } from "../intervene/record.js";
import { listSessions } from "./sessions.js";

const here = dirname(fileURLToPath(import.meta.url));
// dist/cli/serve.js and dist/serve/public/index.html after build; src mirrors the layout.
function publicDir(): string {
  return join(here, "..", "serve", "public");
}

export function runServe(opts: { session?: string; port: number }): void {
  const server = createServer({
    pagePath: join(publicDir(), "index.html"),
    fontsDir: join(publicDir(), "fonts"),
    buildId: buildIdFrom(fileURLToPath(import.meta.url)),
    listSessions: () => listSessions(),
    getSnapshot: (id) => loadSnapshot(id),
    getLive: () => loadLive(),
    intervene: (id, action) => recordIntervention(id, action),
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
  server.listen(opts.port, () => {
    console.log(`Codey timeline at http://localhost:${opts.port}`);
    if (opts.session) console.log(`(session: ${opts.session})`);
  });
}
