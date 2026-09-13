import { isJsonRecord, type JsonRecord } from "../types";

/** Adapt the supplied compact schema.org ItemList profile into the app domain. */
export function linksFromJsonLd(data: unknown): JsonRecord[] {
  if (!isJsonRecord(data) || data["@context"] !== "https://schema.org" ||
      data["@type"] !== "ItemList" || !Array.isArray(data.itemListElement)) {
    throw new Error("Expected a schema.org ItemList with itemListElement entries.");
  }
  return data.itemListElement.map((item: unknown, index: number) => {
    if (!isJsonRecord(item) || typeof item["@type"] !== "string" ||
        typeof item.name !== "string" || !item.name.trim() ||
        typeof item.url !== "string" || !item.url.trim() ||
        !Array.isArray(item.keywords) || item.keywords.length === 0 ||
        !item.keywords.every(tag => typeof tag === "string" && tag.trim()) ||
        (item.archivedAt !== undefined && typeof item.archivedAt !== "string")) {
      throw new Error(`Invalid JSON-LD link at itemListElement[${index}].`);
    }
    return {
      id: item["@id"],
      name: item.name,
      url: item.url,
      keywords: [...item.keywords],
      datePublished: item.datePublished ?? null,
      description: item.description,
      archivedAt: item.archivedAt ?? "",
    };
  });
}
