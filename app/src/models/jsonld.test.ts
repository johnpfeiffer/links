import { describe, expect, it } from "vitest";
import { Link } from "./link";
import { linksFromJsonLd } from "./jsonld";
import { buildDomainStats } from "../components/SourcesSection";
import { collectTags, filterLinksByTags } from "./links";

const legacy = import.meta.glob("/src/content/*.json", { eager: true, import: "default" });
const converted = import.meta.glob<string>("/src/content/*.jsonld", { eager: true, query: "?raw", import: "default" });

describe("JSON-LD migration", () => {
  it.each(Object.entries(converted))("preserves every record and tag selection in %s", (path, text) => {
    const before = Object.values(legacy[path.replace(/jsonld$/, "json")]).flat();
    const after = linksFromJsonLd(JSON.parse(text));
    expect(after).toHaveLength(before.length);
    const normalize = (records) => Link.normalizeAll(records)
      .map(({ id, createdAt, ...record }) => record);
    expect(normalize(after)).toEqual(normalize(before));
    // Compare original fields too, including alternate URLs that the old loader dropped.
    after.forEach((record, index) => {
      expect(record.title).toEqual(before[index].title);
      expect(record.url).toEqual(before[index].url);
      expect(record.tags).toEqual(before[index].tags);
      expect(record.published).toEqual(before[index].published);
      expect(record["alternate-url"]).toEqual(before[index]["alternate-url"] ?? "");
    });
    const oldLinks = Link.normalizeAll(before);
    const newLinks = Link.normalizeAll(after);
    expect(collectTags(newLinks)).toEqual(collectTags(oldLinks));
    for (const tag of collectTags(oldLinks)) {
      const urls = (links) => filterLinksByTags(links, [tag]).map(link => link.url);
      expect(urls(newLinks)).toEqual(urls(oldLinks));
      const sources = links => buildDomainStats(links, [tag]).map(({ domain, count, links }) => ({ domain, count, urls: links.map(link => link.url) }));
      expect(sources(newLinks)).toEqual(sources(oldLinks));
    }
  });

  it.each([null, [], {}, { "@type": "ItemList", itemListElement: [{}] }])("rejects malformed content without silently dropping records", value => {
    expect(() => linksFromJsonLd(value)).toThrow();
  });

  it("preserves ids, descriptions and alternate URLs without mutating input", () => {
    const item = Object.freeze({ "@type": "Article", "@id": "article-1", name: "Example", url: "https://example.com", keywords: ["AI"], description: "Description", archivedAt: "https://archive.example.com" });
    const [raw] = linksFromJsonLd({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: [item] });
    const link = Link.from(raw);
    expect(link).toMatchObject({ id: "article-1", description: "Description", "alternate-url": item.archivedAt, published: null });
  });
});
