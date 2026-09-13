import { describe, expect, it } from "vitest";
import { Link } from "./link";
import { linksFromJsonLd } from "./jsonld";

const converted = import.meta.glob<string>("/src/content/*.jsonld", { eager: true, query: "?raw", import: "default" });

describe("bundled JSON-LD content", () => {
  it.each(Object.entries(converted))("loads every current record from %s without changing its fields", (_path, text) => {
    const source = JSON.parse(text);
    const links = linksFromJsonLd(source);

    expect(links).toEqual(source.itemListElement.map(item => ({
      id: item["@id"],
      name: item.name,
      url: item.url,
      keywords: item.keywords,
      datePublished: item.datePublished ?? null,
      description: item.description,
      archivedAt: item.archivedAt ?? "",
    })));
  });

  it.each([null, [], {}, { "@type": "ItemList", itemListElement: [{}] }])("rejects malformed content without silently dropping records", value => {
    expect(() => linksFromJsonLd(value)).toThrow();
  });

  it("preserves ids, descriptions and alternate URLs without mutating input", () => {
    const item = Object.freeze({ "@type": "Article", "@id": "article-1", name: "Example", url: "https://example.com", keywords: ["AI"], description: "Description", archivedAt: "https://archive.example.com" });
    const [raw] = linksFromJsonLd({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: [item] });
    const link = Link.from(raw);
    expect(link).toMatchObject({ id: "article-1", description: "Description", archivedAt: item.archivedAt, datePublished: null });
    expect("alternate-url" in link).toBe(false);
  });
});
