import { describe, it, expect } from "vitest";
import { resolveRoute } from "./server.js";

describe("resolveRoute", () => {
  it("routes the root to the page", () => {
    expect(resolveRoute("GET", "/")).toEqual({ type: "page" });
    expect(resolveRoute("GET", "/index.html")).toEqual({ type: "page" });
  });

  it("routes the sessions list", () => {
    expect(resolveRoute("GET", "/api/sessions")).toEqual({ type: "sessions" });
  });

  it("routes a session snapshot and decodes the id", () => {
    expect(resolveRoute("GET", "/api/session/abc?t=1")).toEqual({ type: "session", id: "abc" });
  });

  it("routes GET /api/session/:id/now to now, not snapshot", () => {
    expect(resolveRoute("GET", "/api/session/abc/now")).toEqual({ type: "now", id: "abc" });
  });

  it("rejects non-GET and unknown paths", () => {
    expect(resolveRoute("POST", "/")).toEqual({ type: "notfound" });
    expect(resolveRoute("GET", "/nope")).toEqual({ type: "notfound" });
  });

  it("routes a POST intervene and decodes the id", () => {
    expect(resolveRoute("POST", "/api/session/abc/intervene")).toEqual({ type: "intervene", id: "abc" });
  });

  it("does not treat a GET on the intervene path as a snapshot", () => {
    expect(resolveRoute("GET", "/api/session/abc/intervene")).toEqual({ type: "notfound" });
  });

  it("routes the live endpoint", () => {
    expect(resolveRoute("GET", "/api/live")).toEqual({ type: "live" });
  });

  it("routes the health check", () => {
    expect(resolveRoute("GET", "/health")).toEqual({ type: "health" });
  });

  it("routes font requests and rejects traversal", () => {
    expect(resolveRoute("GET", "/fonts/Inter-400.woff2")).toEqual({ type: "font", file: "Inter-400.woff2" });
    expect(resolveRoute("GET", "/fonts/W95FA.woff")).toEqual({ type: "font", file: "W95FA.woff" });
    expect(resolveRoute("GET", "/fonts/../secret")).toEqual({ type: "notfound" });
  });

  it("routes POST /api/session/:id/name to rename", () => {
    expect(resolveRoute("POST", "/api/session/abc/name")).toEqual({ type: "rename", id: "abc" });
  });

  it("routes POST /api/session/:id/explain to explain", () => {
    expect(resolveRoute("POST", "/api/session/abc/explain")).toEqual({ type: "explain", id: "abc" });
  });

  it("does not treat a GET on the explain path as a snapshot", () => {
    expect(resolveRoute("GET", "/api/session/abc/explain")).toEqual({ type: "notfound" });
  });

  it("routes DELETE /api/session/:id to delete", () => {
    expect(resolveRoute("DELETE", "/api/session/abc")).toEqual({ type: "delete", id: "abc" });
  });

  it("GET /api/session/:id still resolves to session (not delete)", () => {
    expect(resolveRoute("GET", "/api/session/abc")).toEqual({ type: "session", id: "abc" });
  });

  it("POST /api/session/:id/intervene still resolves to intervene", () => {
    expect(resolveRoute("POST", "/api/session/abc/intervene")).toEqual({ type: "intervene", id: "abc" });
  });

  it("decodes percent-encoded ids in rename and delete routes", () => {
    expect(resolveRoute("POST", "/api/session/my%20session/name")).toEqual({ type: "rename", id: "my session" });
    expect(resolveRoute("DELETE", "/api/session/my%20session")).toEqual({ type: "delete", id: "my session" });
  });
});
