import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
// Pure: map a request to an intent. Tested in isolation.
export function resolveRoute(method, url) {
    if (!url)
        return { type: "notfound" };
    const path = url.split("?")[0];
    if (method === "GET") {
        if (path === "/" || path === "/index.html")
            return { type: "page" };
        if (path === "/api/sessions")
            return { type: "sessions" };
        const m = /^\/api\/session\/([^/]+)$/.exec(path);
        if (m)
            return { type: "session", id: decodeURIComponent(m[1]) };
    }
    if (method === "POST") {
        const m = /^\/api\/session\/([^/]+)\/intervene$/.exec(path);
        if (m)
            return { type: "intervene", id: decodeURIComponent(m[1]) };
    }
    return { type: "notfound" };
}
function sendJson(res, code, body) {
    res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}
function readBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => resolve(data));
        req.on("error", () => resolve(""));
    });
}
export function createServer(deps) {
    return createHttpServer((req, res) => {
        const route = resolveRoute(req.method, req.url);
        try {
            if (route.type === "page") {
                res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
                res.end(readFileSync(deps.pagePath, "utf8"));
            }
            else if (route.type === "sessions") {
                sendJson(res, 200, deps.listSessions());
            }
            else if (route.type === "session") {
                sendJson(res, 200, deps.getSnapshot(route.id));
            }
            else if (route.type === "intervene") {
                void readBody(req).then((body) => {
                    let action = "";
                    try {
                        action = String(JSON.parse(body || "{}").action ?? "");
                    }
                    catch {
                        action = "";
                    }
                    const ok = deps.intervene(route.id, action);
                    sendJson(res, ok ? 200 : 400, { ok });
                });
            }
            else {
                sendJson(res, 404, { error: "not found" });
            }
        }
        catch (err) {
            sendJson(res, 500, { error: String(err) });
        }
    });
}
