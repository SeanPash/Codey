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
});
