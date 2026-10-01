// @vitest-environment jsdom
import React, { act } from "react";
import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
  useLocation,
} from "react-router-dom";
import AllTagsSection from "./AllTagsSection.jsx";
import { Tag } from "../models/tag.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function waitForResult(getResult, { timeoutMs = 1000, intervalMs = 10 } = {}) {
  const start = Date.now();
  let result = getResult();

  while (!result && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    result = getResult();
  }

  return result;
}

function TestHomePage() {
  const { app, tags, enabledTags } = useLoaderData();

  return (
    <>
      <AllTagsSection app={app} tags={tags} enabledTags={enabledTags} />
      <LocationDisplay />
    </>
  );
}

function LocationDisplay() {
  const location = useLocation();
  return React.createElement("div", { "data-testid": "location" }, location.pathname);
}

describe("AllTagsSection integration", () => {
  it("navigates to the tag path when clicking a tag", async () => {
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
    try {
      const tags = [Tag.fromLabel("Example Tag")];
      const routes = [
        {
          path: "*",
          loader: () => ({
            app: "links",
            tags,
            enabledTags: [],
          }),
          element: <TestHomePage />,
        },
      ];
      const router = createMemoryRouter(routes, {
        initialEntries: ["/links/tags"],
      });

      await act(async () => {
        root.render(
          <RouterProvider
            router={router}
          />
        );
      });

      let summaryButton;
      await act(async () => {
        summaryButton = await waitForResult(() =>
          container.querySelector('[aria-expanded]')
        );
      });
      expect(summaryButton).toBeTruthy();

      await act(async () => {
        summaryButton.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
        );
      });

      let tagLink;
      await act(async () => {
        tagLink = await waitForResult(() =>
          Array.from(container.querySelectorAll("a")).find(
            (anchor) => anchor.textContent && anchor.textContent.includes("Example Tag")
          )
        );
      });
      expect(tagLink).toBeTruthy();

      await act(async () => {
        tagLink.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
        );
      });

      const locationDisplay = container.querySelector('[data-testid="location"]');
      expect(locationDisplay?.textContent).toBe("/links/tags/example-tag");

      await act(async () => {
        root.unmount();
      });
      container.remove();
    } finally {
      globalThis.Request = OriginalRequest;
    }
  });
});
