// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import LinksList from "./LinksList.jsx";
import { Tag } from "../models/tag.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

async function renderLinksList(props) {
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
        element: <LinksList {...props} />,
      },
    ],
    {
      initialEntries: ["/"],
      future: futureConfig,
    }
  );

  await act(async () => {
    root.render(<RouterProvider router={router} future={futureConfig} />);
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

describe("LinksList", () => {
  it("renders 'No links found' when links array is empty", async () => {
    const { container, cleanup } = await renderLinksList({
      links: [],
      enabledTags: [],
    });

    expect(container.textContent).toContain("No links found");

    await cleanup();
  });

  it("renders link descriptions as external links", async () => {
    const links = [
      {
        id: "1",
        url: "https://example.com/one",
        name: "Title One",
        description: "Description One",
        keywords: [Tag.fromLabel("AI")],
      },
      {
        id: "2",
        url: "https://example.com/two",
        name: "Title Two",
        description: "Description Two",
        keywords: [Tag.fromLabel("History")],
      },
    ];

    const { container, cleanup } = await renderLinksList({
      links,
      enabledTags: [],
    });

    const anchors = Array.from(
      container.querySelectorAll('a[target="_blank"]')
    );
    const hrefs = anchors.map((a) => a.getAttribute("href"));
    const texts = anchors.map((a) => a.textContent);

    expect(hrefs).toEqual([
      "https://example.com/one",
      "https://example.com/two",
    ]);
    expect(texts).toEqual(["Description One", "Description Two"]);

    await cleanup();
  });

  it("highlights enabled tags on rendered links", async () => {
    const links = [
      {
        id: "1",
        url: "https://example.com/one",
        name: "Title One",
        description: "Description One",
        keywords: [Tag.fromLabel("AI"), Tag.fromLabel("History")],
      },
    ];

    const { container, cleanup } = await renderLinksList({
      links,
      enabledTags: [Tag.fromLabel("AI")],
    });

    const chips = Array.from(container.querySelectorAll(".MuiChip-root"));
    const aiChip = chips.find((chip) => chip.textContent === "AI");
    const historyChip = chips.find((chip) => chip.textContent === "History");

    expect(aiChip?.classList.contains("MuiChip-colorPrimary")).toBe(true);
    expect(historyChip?.classList.contains("MuiChip-colorPrimary")).toBe(false);

    await cleanup();
  });

  it("preserves the application name in rendered tag links", async () => {
    const links = [
      {
        id: "1",
        url: "https://example.com/one",
        name: "Title One",
        description: "Description One",
        keywords: [Tag.fromLabel("AI"), Tag.fromLabel("History")],
      },
    ];

    const { container, cleanup } = await renderLinksList({
      app: "links",
      links,
      enabledTags: [Tag.fromLabel("AI")],
    });

    const historyChipLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "History"
    );

    expect(historyChipLink?.getAttribute("href")).toBe("/links/tags/ai/history");

    await cleanup();
  });
});
