// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { Tag } from "../models/tag.js";
import ChatPage from "./ChatPage.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const links = [
  {
    id: "ai-1",
    name: "AI Systems",
    description: "A practical AI systems essay",
    url: "https://example.com/ai",
    datePublished: "2024-01-01",
    keywords: [Tag.fromLabel("AI")],
  },
  {
    id: "eng-1",
    name: "Engineering Leadership",
    description: "A software leadership talk",
    url: "https://example.com/eng",
    datePublished: null,
    keywords: [Tag.fromLabel("Engineering")],
  },
];

async function renderChatRoute(initialPath = "/links/_chat") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const router = createMemoryRouter(
    [
      {
        id: "root",
        loader: () => ({ links }),
        element: <Outlet />,
        children: [
          {
            path: "_chat",
            element: <ChatPage />,
          },
          {
            path: ":app/_chat",
            element: <ChatPage />,
          },
        ],
      },
    ],
    {
      initialEntries: [initialPath],
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
  };

  return { container, cleanup };
}

async function submit(container, message) {
  const input = container.querySelector("textarea");
  const form = container.querySelector("form");
  const valueSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    "value"
  )?.set;

  await act(async () => {
    valueSetter.call(input, message);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("ChatPage integration", () => {
  it("builds the links navigation for root and app-prefixed chat routes", async () => {
    const rootRoute = await renderChatRoute("/_chat");
    const rootBackLink = Array.from(rootRoute.container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Back to links"
    );
    expect(rootBackLink?.getAttribute("href")).toBe("/tags");
    await rootRoute.cleanup();

    const appRoute = await renderChatRoute("/links/_chat");
    const appBackLink = Array.from(appRoute.container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent?.trim() === "Back to links"
    );
    expect(appBackLink?.getAttribute("href")).toBe("/links/tags");
    await appRoute.cleanup();
  });

  it("posts to the Cloudflare worker endpoint and renders validated links only", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: JSON.stringify({
          recommendations: [{ linkIds: ["ai-1", "missing"] }],
        }),
        interactionId: "interaction-1",
      }),
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const { container, cleanup } = await renderChatRoute();

    await submit(container, "I want AI links");

    expect(fetchMock).toHaveBeenCalledWith(
      "/links/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(container.textContent).toContain(
      "Ask for recommendations based on a top or scenario..."
    );
    expect(container.textContent).toContain("Recommendations used: 1 / 3");
    expect(container.textContent).toContain("A practical AI systems essay");
    expect(container.textContent).not.toContain("missing");

    await cleanup();
    globalThis.fetch = originalFetch;
  });

  it("disables submissions after three recommendation answers", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        message: JSON.stringify({
          recommendations: [{ linkIds: ["ai-1"] }],
        }),
      }),
    }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const { container, cleanup } = await renderChatRoute();

    await submit(container, "first");
    await submit(container, "second");
    await submit(container, "third");

    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Send"
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("Recommendations used: 3 / 3");
    expect(button.disabled).toBe(true);

    await cleanup();
    globalThis.fetch = originalFetch;
  });

  it("renders the newest recommendation answer before older answers", async () => {
    const responseLinkIds = ["ai-1", "eng-1"];
    const fetchMock = vi.fn(async () => {
      const linkId = responseLinkIds.shift();

      return {
        ok: true,
        json: async () => ({
          message: JSON.stringify({
            recommendations: [{ linkIds: [linkId] }],
          }),
        }),
      };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const { container, cleanup } = await renderChatRoute();

    await submit(container, "older request");
    await submit(container, "newer request");

    const pageText = container.textContent;
    expect(pageText.indexOf("newer request")).toBeLessThan(
      pageText.indexOf("older request")
    );
    expect(pageText.indexOf("A software leadership talk")).toBeLessThan(
      pageText.indexOf("A practical AI systems essay")
    );

    await cleanup();
    globalThis.fetch = originalFetch;
  });

  it("shows a spinner while waiting for the chat response", async () => {
    let resolveFetch;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const { container, cleanup } = await renderChatRoute();

    await submit(container, "I want AI links");

    expect(container.textContent).toContain("Getting recommendations...");
    expect(container.querySelector(".MuiCircularProgress-root")).not.toBeNull();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          message: JSON.stringify({
            recommendations: [{ linkIds: ["ai-1"] }],
          }),
        }),
      });
    });

    expect(container.textContent).not.toContain("Getting recommendations...");
    expect(container.textContent).toContain("A practical AI systems essay");

    await cleanup();
    globalThis.fetch = originalFetch;
  });
});
