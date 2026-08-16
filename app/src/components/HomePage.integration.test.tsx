// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useLocation,
  useRouteLoaderData,
} from "react-router-dom";
import { parseUrlPath } from "../lib/parseUrlPath";
import { collectTags, filterLinksByTags } from "../models/links";
import { Link } from "../models/link";
import HomePage from "./HomePage";
import LinksSection from "./LinksSection";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const linkA = Link.from({
  tags: ["AI", "Podcast"],
  url: "https://a.example.com",
  title: "AI Podcast Link",
});

const linkB = Link.from({
  tags: ["AI"],
  url: "https://b.example.com",
  title: "AI Only Link",
});

const linkC = Link.from({
  tags: ["History"],
  url: "https://c.example.com",
  title: "History Link",
});

const testLinks = [linkA, linkB, linkC];

function TestHomePage() {
  const location = useLocation();
  const loaderData = useRouteLoaderData("root");
  const links = loaderData?.links ?? [];
  const { app, tags } = parseUrlPath(location.pathname);
  const allTags = collectTags(links);
  const tagByKey = new Map(allTags.map((tag) => [tag.key, tag]));
  const enabledTags = tags.map((tag) => tagByKey.get(tag.key) ?? tag);
  const filteredLinks = filterLinksByTags(links, enabledTags);

  return (
    <>
      <LinksSection
        app={app}
        links={filteredLinks}
        enabledTags={enabledTags}
        tags={allTags}
      />
      <div data-testid="location">{location.pathname}</div>
    </>
  );
}

async function renderAtPath(initialPath) {
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

  const routes = [
    {
      id: "root",
      loader: () => ({ links: testLinks }),
      element: <Outlet />,
      children: [
        {
          index: true,
          element: <TestHomePage />,
        },
        {
          path: "tags/*",
          element: <TestHomePage />,
        },
        {
          path: ":app",
          element: <TestHomePage />,
        },
        {
          path: ":app/tags/*",
          element: <TestHomePage />,
        },
      ],
    },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
    future: futureConfig,
  });

  await act(async () => {
    root.render(
      <RouterProvider router={router} future={futureConfig} />
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

describe("HomePage integration", () => {
  it("shows all links when no tags are in the URL path", async () => {
    const { container, cleanup } = await renderAtPath("/links/tags");

    const anchors = Array.from(container.querySelectorAll('a[href]'));
    const hrefs = anchors.map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("https://a.example.com");
    expect(hrefs).toContain("https://b.example.com");
    expect(hrefs).toContain("https://c.example.com");
    expect(container.textContent).toContain("Showing 3 links");

    await cleanup();
  });

  it("filters to only matching links when tags are in the URL path", async () => {
    const { container, cleanup } = await renderAtPath("/links/tags/ai");

    const anchors = Array.from(container.querySelectorAll('a[href]'));
    const hrefs = anchors.map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("https://a.example.com");
    expect(hrefs).toContain("https://b.example.com");
    expect(hrefs).not.toContain("https://c.example.com");
    expect(hrefs).toContain("/links/tags");
    expect(hrefs).toContain("/links/tags/ai/podcast");
    expect(container.textContent).toContain("Showing 2 links");

    await cleanup();
  });

  it("filters with multiple tags (AND logic)", async () => {
    const { container, cleanup } = await renderAtPath("/links/tags/ai/podcast");

    const anchors = Array.from(container.querySelectorAll('a[href]'));
    const hrefs = anchors.map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("https://a.example.com");
    expect(hrefs).not.toContain("https://b.example.com");
    expect(hrefs).not.toContain("https://c.example.com");
    expect(container.textContent).toContain("Showing 1 links");

    await cleanup();
  });

  it("shows 'No links found' when no links match", async () => {
    const { container, cleanup } = await renderAtPath("/links/tags/nonexistent");

    expect(container.textContent).toContain("No links found");
    expect(container.textContent).toContain("Showing 0 links");

    await cleanup();
  });
});

async function renderActualHomePageAtPath(initialPath) {
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

  const routes = [
    {
      id: "root",
      loader: () => ({ links: testLinks }),
      element: <Outlet />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "tags/*",
          element: <HomePage />,
        },
        {
          path: ":app",
          element: <HomePage />,
        },
        {
          path: ":app/tags/*",
          element: <HomePage />,
        },
      ],
    },
  ];

  const router = createMemoryRouter(routes, {
    initialEntries: [initialPath],
    future: futureConfig,
  });

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

describe("HomePage Sources navigation", () => {
  it("shows Sources navigation when the application name is empty", async () => {
    const { container, cleanup } = await renderActualHomePageAtPath("/tags");
    const sourcesLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Sources"
    );

    expect(sourcesLink?.getAttribute("href")).toBe("/sources");

    await cleanup();
  });

  it("shows Recommendations navigation when the application name is empty", async () => {
    const { container, cleanup } = await renderActualHomePageAtPath("/tags");
    const chatLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Ask for Recommendations"
    );

    expect(chatLink?.getAttribute("href")).toBe("/_chat");

    await cleanup();
  });

  it("preserves app name and selected tags in Sources navigation", async () => {
    const { container, cleanup } = await renderActualHomePageAtPath("/links/tags/ai");
    const sourcesLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Sources"
    );

    expect(sourcesLink?.getAttribute("href")).toBe("/links/sources/ai");

    await cleanup();
  });

  it("preserves app name in Recommendations navigation", async () => {
    const { container, cleanup } = await renderActualHomePageAtPath("/links/tags/ai");
    const chatLink = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Ask for Recommendations"
    );

    expect(chatLink?.getAttribute("href")).toBe("/links/_chat");

    await cleanup();
  });
});
