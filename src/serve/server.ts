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
  | { type: "now"; id: string }
  | { type: "intervene"; id: string }
  | { type: "rename"; id: string }
  | { type: "explain"; id: string }
  | { type: "delete"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "restore"; id: string }
  | { type: "live" }
  | { type: "font"; file: string }
  | { type: "notfound" };

// decodeURIComponent throws on a malformed escape (e.g. "%E0%A4%A"), so wrap it: a bad id
// becomes null and routes to notfound instead of crashing the request handler.
function decodeId(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

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
    const mnow = /^\/api\/session\/([^/]+)\/now$/.exec(path);
    if (mnow) { const id = decodeId(mnow[1]); return id == null ? { type: "notfound" } : { type: "now", id }; }
    const m = /^\/api\/session\/([^/]+)$/.exec(path);
    if (m) { const id = decodeId(m[1]); return id == null ? { type: "notfound" } : { type: "session", id }; }
  }
  if (method === "POST") {
    const mi = /^\/api\/session\/([^/]+)\/intervene$/.exec(path);
    if (mi) { const id = decodeId(mi[1]); return id == null ? { type: "notfound" } : { type: "intervene", id }; }
    const mn = /^\/api\/session\/([^/]+)\/name$/.exec(path);
    if (mn) { const id = decodeId(mn[1]); return id == null ? { type: "notfound" } : { type: "rename", id }; }
    const me = /^\/api\/session\/([^/]+)\/explain$/.exec(path);
    if (me) { const id = decodeId(me[1]); return id == null ? { type: "notfound" } : { type: "explain", id }; }
    const md = /^\/api\/session\/([^/]+)\/dismiss$/.exec(path);
    if (md) { const id = decodeId(md[1]); return id == null ? { type: "notfound" } : { type: "dismiss", id }; }
    const mr = /^\/api\/session\/([^/]+)\/restore$/.exec(path);
    if (mr) { const id = decodeId(mr[1]); return id == null ? { type: "notfound" } : { type: "restore", id }; }
  }
  if (method === "DELETE") {
    const m = /^\/api\/session\/([^/]+)$/.exec(path);
    if (m) { const id = decodeId(m[1]); return id == null ? { type: "notfound" } : { type: "delete", id }; }
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
  getNow: (id: string) => unknown;
  getLive: () => LiveSnapshot;
  intervene: (id: string, action: string) => boolean;
  rename: (id: string, name: string) => boolean;
  remove: (id: string) => boolean;
  dismiss: (id: string) => boolean;
  restore: (id: string) => boolean;
  explain: (id: string, body: unknown) => Promise<{ text: string | null; cached: boolean; paused: boolean }>;
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
        // no-store so a rebuilt timeline page is never served from the browser cache. The page is
        // small and only loaded by hand, so skipping the cache costs nothing and avoids the stale
        // "I still see the old version" trap after an update.
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(readFileSync(deps.pagePath, "utf8"));
      } else if (route.type === "health") {
        sendJson(res, 200, { build: deps.buildId });
      } else if (route.type === "sessions") {
        sendJson(res, 200, deps.listSessions());
      } else if (route.type === "session") {
        sendJson(res, 200, deps.getSnapshot(route.id));
      } else if (route.type === "now") {
        sendJson(res, 200, deps.getNow(route.id));
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
      } else if (route.type === "rename") {
        void readBody(req).then((body) => {
          let name = "";
          try { name = String((JSON.parse(body || "{}") as { name?: unknown }).name ?? ""); } catch { name = ""; }
          const ok = deps.rename(route.id, name);
          sendJson(res, ok ? 200 : 400, { ok });
        });
      } else if (route.type === "explain") {
        void readBody(req).then(async (body) => {
          let parsed: unknown = {};
          try { parsed = JSON.parse(body || "{}"); } catch { parsed = {}; }
          try {
            const result = await deps.explain(route.id, parsed);
            sendJson(res, 200, result);
          } catch (err) {
            sendJson(res, 500, { error: String(err) });
          }
        });
      } else if (route.type === "delete") {
        const ok = deps.remove(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else if (route.type === "dismiss") {
        const ok = deps.dismiss(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else if (route.type === "restore") {
        const ok = deps.restore(route.id);
        sendJson(res, ok ? 200 : 400, { ok });
      } else {
        sendJson(res, 404, { error: "not found" });
      }
    } catch (err) {
      sendJson(res, 500, { error: String(err) });
    }
  });
}
