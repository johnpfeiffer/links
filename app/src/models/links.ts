
import type { LinkRecord, TagRecord } from "../types";

export function filterLinksByTags(
  links: readonly LinkRecord[],
  tags: readonly TagRecord[] | null | undefined
): LinkRecord[] {
  if (!tags || tags.length === 0) return [...links];
  const normalizedTags = tags.map((tag) => tag?.key).filter(Boolean);
  if (normalizedTags.length === 0) return [...links];

  return links.filter((link) => {
    const tagSet = new Set(link.keywords.map((tag) => tag.key));
    return normalizedTags.every((tagKey) => tagSet.has(tagKey));
  });
}

export function collectTags(links: readonly LinkRecord[]): TagRecord[] {
  const tagMap = new Map<string, TagRecord>();
  links.forEach((link) => {
    link.keywords.forEach((tag) => {
      const key = tag?.key;
      if (!key) return;
      if (!tagMap.has(key)) {
        tagMap.set(key, tag);
      }
    });
  });

  return Array.from(tagMap.entries())
    .sort(([, left], [, right]) => left.label.localeCompare(right.label))
    .map(([, value]) => value);
}
