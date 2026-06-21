import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "../serve/server.js";
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
    listSessions: () => listSessions(),
    getSnapshot: (id) => loadSnapshot(id),
    getLive: () => loadLive(),
    intervene: (id, action) => recordIntervention(id, action),
  });
  server.listen(opts.port, () => {
    console.log(`Codey timeline at http://localhost:${opts.port}`);
    if (opts.session) console.log(`(session: ${opts.session})`);
  });
}
