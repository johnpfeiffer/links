import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { Link } from "./link.js";
import { Tag } from "./tag.js";

describe("Link", () => {
  it("sets expected fields with defaults", () => {
    const link = new Link({
      id: "link-1",
      name: "Example",
      url: "https://example.com",
      keywords: [Tag.fromLabel("Tag")],
    });

    assert.equal(link.id, "link-1");
    assert.equal(link.name, "Example");
    assert.equal("title" in link, false);
    assert.equal(link.description, "Example");
    assert.equal(link.url, "https://example.com");
    assert.deepEqual(
      link.keywords.map((tag) => tag.label),
      ["Tag"]
    );
    assert.equal("tags" in link, false);
    assert.equal(typeof link.createdAt, "string");
    assert.equal(link.datePublished, null);
    assert.equal("published" in link, false);
  });
});

describe("Link.from", () => {
  it("trims fields and drops invalid tags", () => {
    const link = Link.from({
      name: "  Good ",
      url: " https://example.com ",
      keywords: [" TagOne ", "tagTwo", "   ", 123],
    });

    assert.equal(link.name, "Good");
    assert.equal(link.url, "https://example.com");
    assert.deepEqual(
      link.keywords.map((tag) => tag.label),
      ["TagOne", "tagTwo"]
    );
  });

  it("appends the datePublished year to the description", () => {
    const link = Link.from({
      name: "Example name",
      url: "https://example.com",
      datePublished: "2000-01-01",
      keywords: ["Tag"],
    });

    assert.equal(link.datePublished, "2000-01-01");
    assert.equal(link.description, "Example name (2000)");
    assert.equal(link.name, "Example name");
  });

  it("handles datePublished and description edge cases (table driven)", () => {
    const cases = [
      {
        name: "null datePublished leaves description untouched",
        input: { description: "Already fine", datePublished: null },
        expected: { description: "Already fine", datePublished: null },
      },
      {
        name: "description already includes year suffix",
        input: { description: "Already fine (2000)", datePublished: "2000-01-01" },
        expected: { description: "Already fine (2000)" },
      },
      {
        name: "invalid datePublished value becomes null",
        input: { description: "Example", datePublished: 123 },
        expected: { description: "Example", datePublished: null },
      },
      {
        name: "blank description falls back to name",
        input: { description: "   ", datePublished: "1999-12-31" },
        expected: { description: "Example name (1999)" },
      },
    ];

    cases.forEach(({ name, input, expected }) => {
      const link = Link.from({
        name: "Example name",
        url: "https://example.com",
        keywords: ["Tag"],
        ...input,
      });

      assert.equal(link.description, expected.description, name);
      if ("datePublished" in expected) {
        assert.equal(link.datePublished, expected.datePublished, name);
      }
    });
  });

  it("returns null for missing required fields", () => {
    assert.equal(Link.from({ name: "No url", keywords: ["Tag"] }), null);
    assert.equal(Link.from({ url: "https://example.com", keywords: ["Tag"] }), null);
    assert.equal(
      Link.from({ url: "https://example.com", name: "No tags" }),
      null
    );
  });

  it("returns null for non-object input", () => {
    [null, undefined, "string", 42].forEach((input) => {
      assert.equal(Link.from(input), null, `expected null for ${input}`);
    });
  });

  it("deduplicates tags by key", () => {
    const link = Link.from({
      name: "Example",
      url: "https://example.com",
      keywords: ["AI", "ai", " AI "],
    });

    assert.equal(link.keywords.length, 1);
    assert.equal(link.keywords[0].label, "AI");
  });
});
