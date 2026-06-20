import { createServer as createHttpServer, type Server, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import type { SessionSnapshot } from "../types.js";
import type { SessionListItem } from "../cli/sessions.js";

export type RouteResult =
  | { type: "page" }
  | { type: "sessions" }
  | { type: "session"; id: string }
  | { type: "notfound" };

// Pure: map a request to an intent. Tested in isolation.
export function resolveRoute(method: string | undefined, url: string | undefined): RouteResult {
  if (method !== "GET" || !url) return { type: "notfound" };
  const path = url.split("?")[0];
  if (path === "/" || path === "/index.html") return { type: "page" };
  if (path === "/api/sessions") return { type: "sessions" };
  const m = /^\/api\/session\/([^/]+)$/.exec(path);
  if (m) return { type: "session", id: decodeURIComponent(m[1]) };
  return { type: "notfound" };
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export interface ServerDeps {
  pagePath: string;
  listSessions: () => SessionListItem[];
  getSnapshot: (id: string) => SessionSnapshot;
}

export function createServer(deps: ServerDeps): Server {
  return createHttpServer((req, res) => {
    const route = resolveRoute(req.method, req.url);
    try {
      if (route.type === "page") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(deps.pagePath, "utf8"));
      } else if (route.type === "sessions") {
        sendJson(res, 200, deps.listSessions());
      } else if (route.type === "session") {
        sendJson(res, 200, deps.getSnapshot(route.id));
      } else {
        sendJson(res, 404, { error: "not found" });
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err) });
    }
  });
}
