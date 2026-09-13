import { afterEach, describe, expect, it, vi } from "vitest";

const REMOTE_FILES = ["ai.jsonld", "business.jsonld", "engineering.jsonld", "history.jsonld", "people.jsonld"];

describe("Link.loadAll remote content", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("fetches each content file with the default HTTP cache mode so GitHub's 5 minute TTL applies", async () => {
    const payload = {
      "@context": "https://schema.org", "@type": "ItemList",
      itemListElement: [{ "@type": "Article", name: "Example", url: "https://example.com", keywords: ["Engineering"] }],
    };
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }));
    vi.stubGlobal("fetch", fetchMock);

    const { Link } = await import("./link.js");
    const links = await Link.loadAll();

    expect(fetchMock).toHaveBeenCalledTimes(REMOTE_FILES.length);
    REMOTE_FILES.forEach((file, index) => {
      const [url, init] = fetchMock.mock.calls[index];
      expect(String(url)).toContain(`/content/${file}`);
      expect(init).toEqual({ cache: "default" });
    });
    expect(links).toHaveLength(REMOTE_FILES.length);
    expect(await Link.loadAll()).toBe(links);
    expect(fetchMock).toHaveBeenCalledTimes(REMOTE_FILES.length);
  });

  it("falls back to all bundled records when one remote file has invalid content", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ "@type": "ItemList", itemListElement: [{}] }) })));
    const { Link } = await import("./link.js");
    const links = await Link.loadAll();
    expect(links).toHaveLength(628);
    expect(new Set(links.map(link => link.id)).size).toBe(628);
  });
});
