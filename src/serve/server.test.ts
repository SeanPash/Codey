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

  it("routes font requests and rejects traversal", () => {
    expect(resolveRoute("GET", "/fonts/Inter-400.woff2")).toEqual({ type: "font", file: "Inter-400.woff2" });
    expect(resolveRoute("GET", "/fonts/W95FA.woff")).toEqual({ type: "font", file: "W95FA.woff" });
    expect(resolveRoute("GET", "/fonts/../secret")).toEqual({ type: "notfound" });
  });
});
