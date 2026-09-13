import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { collectTags, filterLinksByTags } from "./links.js";
import { Link } from "./link.js";
import { Tag } from "./tag.js";

describe("Link.normalizeAll", () => {
  it("skips invalid links and normalizes required fields", () => {
    const createdIds = [];
    const createId = () => {
      const nextId = `id-${createdIds.length + 1}`;
      createdIds.push(nextId);
      return nextId;
    };
    const rawLinks = [
      {
        name: "  Good ",
        url: " https://example.com ",
        keywords: [" TagOne ", "tagTwo"],
      },
      {
        name: "",
        url: "https://bad.example.com",
        keywords: ["Bad"],
      },
      {
        name: "Missing tags",
        url: "https://missing.example.com",
      },
    ];

    const normalized = Link.normalizeAll(rawLinks, { createId });

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].id, "id-1");
    assert.equal(normalized[0].name, "Good");
    assert.equal(normalized[0].url, "https://example.com");
    assert.deepEqual(
      normalized[0].keywords.map((tag) => tag.label),
      ["TagOne", "tagTwo"]
    );
  });

  it("ensures ids are unique when duplicates appear", () => {
    const rawLinks = [
      {
        id: "same",
        name: "Link One",
        url: "https://one.example.com",
        keywords: ["One"],
      },
      {
        id: "same",
        name: "Link Two",
        url: "https://two.example.com",
        keywords: ["Two"],
      },
    ];

    const normalized = Link.normalizeAll(rawLinks, {
      createId: () => "generated",
    });

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].id, "same");
    assert.equal(normalized[1].id, "generated");
  });
});

describe("filterLinksByTags", () => {
  it("filters links by all requested tags (case-insensitive)", () => {
    const links = [
      {
        id: "1",
        name: "One",
        url: "https://one",
        keywords: [Tag.fromLabel("AI"), Tag.fromLabel("Podcast")],
      },
      {
        id: "2",
        name: "Two",
        url: "https://two",
        keywords: [Tag.fromLabel("AI")],
      },
    ];

    const filtered = filterLinksByTags(links, [
      Tag.fromLabel("ai"),
      Tag.fromLabel("podcast"),
    ]);

    assert.deepEqual(filtered.map((link) => link.id), ["1"]);
  });

  it("returns all links when tags is empty or null", () => {
    const links = [
      {
        id: "1",
        name: "One",
        url: "https://one",
        keywords: [Tag.fromLabel("AI")],
      },
      {
        id: "2",
        name: "Two",
        url: "https://two",
        keywords: [Tag.fromLabel("News")],
      },
    ];

    [[], null, undefined].forEach((tags) => {
      const result = filterLinksByTags(links, tags);
      assert.equal(result.length, 2, `expected all links for tags=${tags}`);
    });
  });
});

describe("collectTags", () => {
  it("returns unique tags sorted alphabetically", () => {
    const links = [
      {
        id: "1",
        name: "One",
        url: "https://one",
        keywords: [Tag.fromLabel("AI"), Tag.fromLabel("Podcast")],
      },
      {
        id: "2",
        name: "Two",
        url: "https://two",
        keywords: [Tag.fromLabel("ai"), Tag.fromLabel("News")],
      },
    ];

    const tags = collectTags(links);

    assert.deepEqual(
      tags.map((tag) => tag.label),
      ["AI", "News", "Podcast"]
    );
  });

  it("returns empty array for empty links", () => {
    assert.deepEqual(collectTags([]), []);
  });
});
