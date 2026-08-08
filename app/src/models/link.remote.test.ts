import { afterEach, describe, expect, it, vi } from "vitest";

const REMOTE_FILES = ["ai.json", "business.json", "engineering.json", "history.json", "people.json"];

describe("Link.loadAll remote content", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each content file with the default HTTP cache mode so GitHub's 5 minute TTL applies", async () => {
    const payload = {
      Engineering: [{ title: "Example", url: "https://example.com", tags: ["Engineering"] }],
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
  });
});
