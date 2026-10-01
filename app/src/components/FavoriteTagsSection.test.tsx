// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import FavoriteTagsSection from "./FavoriteTagsSection.jsx";
import { Tag } from "../models/tag.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function renderFavoriteTags(props) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const OriginalRequest = globalThis.Request;
  globalThis.Request = class TestRequest {
    constructor(input, init = {}) {
      this.url = typeof input === "string" ? input : input?.url ?? String(input);
      this.signal = init.signal;
      this.method = init.method ?? "GET";
      this.headers = init.headers ?? new Headers();
      this.body = init.body ?? null;
    }
  };
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: <FavoriteTagsSection {...props} />,
      },
    ],
    {
      initialEntries: ["/"],
    }
  );

  await act(async () => {
    root.render(
      <RouterProvider router={router} />
    );
  });

  const cleanup = async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.Request = OriginalRequest;
  };

  return { container, cleanup };
}

describe("FavoriteTagsSection", () => {
  it("renders favorite tags in order with links", async () => {
    const { container, cleanup } = await renderFavoriteTags({
      app: "links",
      enabledTags: [],
    });
    const links = Array.from(container.querySelectorAll("a"));
    const labels = links.map((anchor) => anchor.textContent?.trim());
    const hrefs = links.map((anchor) => anchor.getAttribute("href"));

    expect(labels).toEqual(["AI", "Business", "Engineering", "History", "People", "Podcast", "Book"]);
    expect(hrefs).toEqual([
      "/links/tags/ai",
      "/links/tags/business",
      "/links/tags/engineering",
      "/links/tags/history",
      "/links/tags/people",
      "/links/tags/podcast",
      "/links/tags/book",
    ]);

    await cleanup();
  });

  it("removes enabled tags in toggle links", async () => {
    const { container, cleanup } = await renderFavoriteTags({
      app: "links",
      enabledTags: [Tag.fromLabel("AI")],
    });
    const aiLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "AI"
    );

    expect(aiLink?.getAttribute("href")).toBe("/links/tags");

    await cleanup();
  });

  it("builds root /tags links when the application name is empty", async () => {
    const { container, cleanup } = await renderFavoriteTags({
      app: "",
      enabledTags: [],
    });
    const aiLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "AI"
    );

    expect(aiLink?.getAttribute("href")).toBe("/tags/ai");

    await cleanup();
  });
});
