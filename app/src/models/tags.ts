import type { TagRecord, TagRouteNamespace } from "../types";

export function isTagEnabled(enabledTags: readonly TagRecord[], tag: TagRecord | null | undefined): boolean {
  if (!tag || !tag.key) return false;
  return enabledTags.some((enabledTag) => enabledTag.key === tag.key);
}

export function buildTagFilterPath(
  app: string | null | undefined,
  tags: readonly TagRecord[],
  routeNamespace: TagRouteNamespace = "tags"
): string {
  const segments = [];
  const trimmedApp = String(app ?? "").trim();

  if (trimmedApp) {
    segments.push(encodeURIComponent(trimmedApp));
  }

  segments.push(routeNamespace);

  tags.forEach((tag) => {
    if (!tag || !tag.key) return;
    segments.push(encodeURIComponent(tag.key));
  });

  return `/${segments.join("/")}`;
}

export function buildTagsPath(app: string | null | undefined, tags: readonly TagRecord[]): string {
  return buildTagFilterPath(app, tags, "tags");
}

export function buildTagTogglePath(
  app: string | null | undefined,
  enabledTags: readonly TagRecord[] | null | undefined,
  tag: TagRecord | null | undefined,
  routeNamespace: TagRouteNamespace = "tags"
): string {
  const currentTags = Array.isArray(enabledTags) ? enabledTags : [];
  if (!tag || !tag.key) return buildTagFilterPath(app, currentTags, routeNamespace);

  const isEnabled = isTagEnabled(currentTags, tag);
  const nextTags = isEnabled
    ? currentTags.filter((enabledTag) => enabledTag?.key !== tag.key)
    : [...currentTags, tag];

  return buildTagFilterPath(app, nextTags, routeNamespace);
}
