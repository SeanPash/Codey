import { createServer as createHttpServer, type Server, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SessionSnapshot, LiveSnapshot } from "../types.js";
import type { SessionListItem } from "../cli/sessions.js";

export type RouteResult =
  | { type: "page" }
  | { type: "health" }
  | { type: "sessions" }
  | { type: "session"; id: string }
  | { type: "intervene"; id: string }
  | { type: "live" }
  | { type: "font"; file: string }
  | { type: "notfound" };

// Pure: map a request to an intent. Tested in isolation.
export function resolveRoute(method: string | undefined, url: string | undefined): RouteResult {
  if (!url) return { type: "notfound" };
  const path = url.split("?")[0];
  if (method === "GET") {
    if (path === "/" || path === "/index.html") return { type: "page" };
    if (path === "/health") return { type: "health" };
    if (path === "/api/sessions") return { type: "sessions" };
    if (path === "/api/live") return { type: "live" };
    const fm = /^\/fonts\/([A-Za-z0-9_-]+\.woff2?)$/.exec(path);
    if (fm && !fm[1].includes("..")) return { type: "font", file: fm[1] };
    const m = /^\/api\/session\/([^/]+)$/.exec(path);
    if (m) return { type: "session", id: decodeURIComponent(m[1]) };
  }
  if (method === "POST") {
    const m = /^\/api\/session\/([^/]+)\/intervene$/.exec(path);
    if (m) return { type: "intervene", id: decodeURIComponent(m[1]) };
  }
  return { type: "notfound" };
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export interface ServerDeps {
  pagePath: string;
  fontsDir: string;
  buildId: string;          // identity the launcher checks to detect a stale server
  listSessions: () => SessionListItem[];
  getSnapshot: (id: string) => SessionSnapshot;
  getLive: () => LiveSnapshot;
  intervene: (id: string, action: string) => boolean;
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

export function createServer(deps: ServerDeps): Server {
  return createHttpServer((req, res) => {
    const route = resolveRoute(req.method, req.url);
    try {
      if (route.type === "page") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(deps.pagePath, "utf8"));
      } else if (route.type === "health") {
        sendJson(res, 200, { build: deps.buildId });
      } else if (route.type === "sessions") {
        sendJson(res, 200, deps.listSessions());
      } else if (route.type === "session") {
        sendJson(res, 200, deps.getSnapshot(route.id));
      } else if (route.type === "live") {
        sendJson(res, 200, deps.getLive());
      } else if (route.type === "font") {
        const ct = route.file.endsWith(".woff2") ? "font/woff2" : "font/woff";
        res.writeHead(200, { "content-type": ct, "cache-control": "max-age=86400" });
        res.end(readFileSync(join(deps.fontsDir, route.file)));
      } else if (route.type === "intervene") {
        void readBody(req).then((body) => {
          let action = "";
          try { action = String((JSON.parse(body || "{}") as { action?: unknown }).action ?? ""); } catch { action = ""; }
          const ok = deps.intervene(route.id, action);
          sendJson(res, ok ? 200 : 400, { ok });
        });
      } else {
        sendJson(res, 404, { error: "not found" });
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err) });
    }
  });
}
