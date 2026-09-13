import { describe, expect, it, vi, afterEach } from "vitest";
import { Link } from "./link.js";
import { Tag } from "./tag.js";

describe("Link.loadAll", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it("loads bundled JSON-LD when offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const links = await Link.loadAll();

    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBe(605);
    expect(
      links.every(
        (link) =>
          typeof link.id === "string" &&
          link.id.length > 0 &&
          typeof link.description === "string" &&
          link.description.length > 0 &&
          typeof link.name === "string" &&
          link.name.length > 0 &&
          typeof link.url === "string" &&
          link.url.length > 0 &&
          (link.datePublished === null || typeof link.datePublished === "string") &&
          Array.isArray(link.keywords) &&
          link.keywords.length > 0
      )
    ).toBe(true);
    expect(
      links.every((link) => link.keywords.every((tag) => tag instanceof Tag))
    ).toBe(true);
  });
});
