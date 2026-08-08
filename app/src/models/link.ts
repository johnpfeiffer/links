import { Tag } from "./tag";
import type { JsonRecord, LinkRecord, TagRecord } from "../types";
import { isJsonRecord } from "../types";

const REMOTE_BASE_URL =
  "https://raw.githubusercontent.com/johnpfeiffer/favorites/refs/heads/main/content";
const REMOTE_FILES = ["ai.json", "business.json", "engineering.json", "history.json", "people.json"];

interface LinkInit {
  id?: string;
  url: string;
  title: string;
  description?: string;
  tags: TagRecord[];
  createdAt?: string;
  published?: string | null;
}

type CreateId = () => string;
let loadPromise: Promise<Link[]> | undefined;

function pushLinksFromJson(rawLinks: unknown[], data: unknown, label: string): void {
  if (Array.isArray(data)) {
    rawLinks.push(...data);
    return;
  }
  if (isJsonRecord(data)) {
    Object.values(data).forEach((value) => {
      if (Array.isArray(value)) rawLinks.push(...value);
      else console.warn(`Invalid content section in ${label}`, value);
    });
    return;
  }
  console.warn(`Invalid content format in ${label}`, data);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadAllRemote(): Promise<Link[]> {
  loadPromise ??= (async () => {
    const results = await Promise.all(REMOTE_FILES.map((file) => fetchJson(`${REMOTE_BASE_URL}/${file}`)));
    const rawLinks: unknown[] = [];
    results.forEach((data, index) => pushLinksFromJson(rawLinks, data, REMOTE_FILES[index] ?? "remote content"));
    return Link.normalizeAll(rawLinks);
  })();
  return loadPromise;
}

export class Link implements LinkRecord {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: Tag[];
  createdAt: string;
  published: string | null;

  constructor({ id, url, title, description, tags, createdAt, published }: LinkInit) {
    this.url = url;
    this.title = title;
    const resolvedDescription = typeof description === "string" && description.trim() ? description.trim() : title;
    this.published = published ?? null;
    this.description = Link.appendPublishedYear(resolvedDescription, this.published);
    this.tags = tags;
    this.id = id ?? Link.createId();
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  static createId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  static normalizePublished(rawPublished: unknown, link: unknown): string | null {
    if (rawPublished === null || rawPublished === undefined) return null;
    if (typeof rawPublished === "string") return rawPublished.trim() || null;
    console.warn("Invalid published value; expected ISO string or null.", { published: rawPublished, link });
    return null;
  }

  static extractPublishedYear(published: string | null | undefined): string | null {
    if (typeof published !== "string") return null;
    const parsed = new Date(published);
    if (!Number.isNaN(parsed.valueOf())) return String(parsed.getUTCFullYear());
    return published.match(/^(\d{4})/)?.[1] ?? null;
  }

  static appendPublishedYear(description: string, published: string | null | undefined): string {
    const trimmed = description.trim();
    if (!trimmed) return trimmed;
    const year = Link.extractPublishedYear(published);
    if (!year) return trimmed;
    const suffix = `(${year})`;
    return trimmed.endsWith(suffix) ? trimmed : `${trimmed} ${suffix}`;
  }

  static normalizeTags(rawTags: unknown, link: unknown): Tag[] | null {
    if (!Array.isArray(rawTags)) return null;
    const uniqueTags = new Map<string, Tag>();
    rawTags.forEach((tagValue) => {
      const tag = tagValue instanceof Tag ? tagValue : Tag.fromLabel(tagValue);
      if (!tag) {
        console.warn("Invalid tag skipped.", { tag: tagValue, link });
        return;
      }
      uniqueTags.set(tag.key, tag);
    });
    return [...uniqueTags.values()];
  }

  static from(raw: unknown, { createId = Link.createId }: { createId?: CreateId } = {}): Link | null {
    if (!isJsonRecord(raw)) {
      console.warn("Skipping invalid link; not an object.", raw);
      return null;
    }
    const url = typeof raw.url === "string" ? raw.url.trim() : "";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    const tags = Link.normalizeTags(raw.tags, raw);
    if (!url || !title || !tags || tags.length === 0) {
      console.warn("Skipping invalid link; missing url, title, or tags.", raw);
      return null;
    }
    const rawId = typeof raw.id === "string" || typeof raw.id === "number" ? String(raw.id).trim() : "";
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : undefined;
    try {
      return new Link({
        id: rawId || createId(),
        url,
        title,
        description,
        tags,
        ...(createdAt ? { createdAt } : {}),
        published: Link.normalizePublished(raw.published, raw),
      });
    } catch (error) {
      console.warn("Skipping invalid link; unable to construct Link instance.", raw, error);
      return null;
    }
  }

  static normalizeAll(rawLinks: readonly unknown[], { createId = Link.createId }: { createId?: CreateId } = {}): Link[] {
    const normalized: Link[] = [];
    const seenIds = new Set<string>();
    rawLinks.forEach((raw) => {
      const link = Link.from(raw, { createId });
      if (!link) return;
      if (seenIds.has(link.id)) {
        const nextId = createId();
        console.warn("Duplicate link id detected. Generated a new id.", { id: link.id, nextId });
        link.id = nextId;
      }
      seenIds.add(link.id);
      normalized.push(link);
    });
    return normalized;
  }

  static async loadAll(): Promise<Link[]> {
    try {
      return await loadAllRemote();
    } catch (error) {
      console.warn("Remote content failed; falling back to bundled JSON.", error);
    }
    const contentModules = import.meta.glob<unknown>("/src/content/*.json");
    const modules = await Promise.all(Object.entries(contentModules).map(async ([path, loader]) => {
      try {
        return { path, data: await loader() };
      } catch (error) {
        console.warn(`Failed to load ${path}.`, error);
        return null;
      }
    }));
    const rawLinks: unknown[] = [];
    modules.forEach((entry) => {
      if (!entry) return;
      const module = entry.data;
      const data = isJsonRecord(module) && "default" in module ? module.default : module;
      pushLinksFromJson(rawLinks, data, entry.path);
    });
    return Link.normalizeAll(rawLinks);
  }
}
