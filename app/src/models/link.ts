import { Tag } from "./tag";
import type { LinkRecord, TagRecord } from "../types";
import { linksFromJsonLd } from "./jsonld";
import { isJsonRecord } from "../types";

const REMOTE_BASE_URL =
  "https://raw.githubusercontent.com/johnpfeiffer/favorites/refs/heads/main/content";
const REMOTE_FILES = ["ai.jsonld", "business.jsonld", "engineering.jsonld", "history.jsonld", "people.jsonld"];

interface LinkInit {
  id?: string;
  url: string;
  name: string;
  description?: string;
  keywords: TagRecord[];
  createdAt?: string;
  datePublished?: string | null;
  archivedAt?: string;
}

type CreateId = () => string;
let loadPromise: Promise<Link[]> | undefined;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadAllRemote(): Promise<Link[]> {
  loadPromise ??= (async () => {
    const results = await Promise.all(REMOTE_FILES.map((file) => fetchJson(`${REMOTE_BASE_URL}/${file}`)));
    const rawLinks: unknown[] = [];
    results.forEach(data => rawLinks.push(...linksFromJsonLd(data)));
    return Link.normalizeAll(rawLinks);
  })();
  return loadPromise;
}

export class Link implements LinkRecord {
  id: string;
  url: string;
  name: string;
  description: string;
  keywords: Tag[];
  createdAt: string;
  datePublished: string | null;
  archivedAt: string;

  constructor({ id, url, name, description, keywords, createdAt, datePublished, archivedAt }: LinkInit) {
    this.archivedAt = archivedAt ?? "";
    this.url = url;
    this.name = name;
    const resolvedDescription = typeof description === "string" && description.trim() ? description.trim() : name;
    this.datePublished = datePublished ?? null;
    this.description = Link.appendDatePublishedYear(resolvedDescription, this.datePublished);
    this.keywords = keywords;
    this.id = id ?? Link.createId();
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  static createId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  static normalizeDatePublished(rawDatePublished: unknown, link: unknown): string | null {
    if (rawDatePublished === null || rawDatePublished === undefined) return null;
    if (typeof rawDatePublished === "string") return rawDatePublished.trim() || null;
    console.warn("Invalid datePublished value; expected ISO string or null.", { datePublished: rawDatePublished, link });
    return null;
  }

  static extractDatePublishedYear(datePublished: string | null | undefined): string | null {
    if (typeof datePublished !== "string") return null;
    const parsed = new Date(datePublished);
    if (!Number.isNaN(parsed.valueOf())) return String(parsed.getUTCFullYear());
    return datePublished.match(/^(\d{4})/)?.[1] ?? null;
  }

  static appendDatePublishedYear(description: string, datePublished: string | null | undefined): string {
    const trimmed = description.trim();
    if (!trimmed) return trimmed;
    const year = Link.extractDatePublishedYear(datePublished);
    if (!year) return trimmed;
    const suffix = `(${year})`;
    return trimmed.endsWith(suffix) ? trimmed : `${trimmed} ${suffix}`;
  }

  static normalizeKeywords(rawKeywords: unknown, link: unknown): Tag[] | null {
    if (!Array.isArray(rawKeywords)) return null;
    const uniqueTags = new Map<string, Tag>();
    rawKeywords.forEach((tagValue) => {
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
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    const keywords = Link.normalizeKeywords(raw.keywords, raw);
    if (!url || !name || !keywords || keywords.length === 0) {
      console.warn("Skipping invalid link; missing url, name, or keywords.", raw);
      return null;
    }
    const rawId = typeof raw.id === "string" || typeof raw.id === "number" ? String(raw.id).trim() : "";
    const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : undefined;
    try {
      return new Link({
        id: rawId || createId(),
        url,
        name,
        description,
        keywords,
        ...(createdAt ? { createdAt } : {}),
        datePublished: Link.normalizeDatePublished(raw.datePublished, raw),
        archivedAt: typeof raw.archivedAt === "string" ? raw.archivedAt.trim() : "",
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
      console.warn("Remote content failed; falling back to bundled JSON-LD.", error);
    }
    const contentModules = import.meta.glob<string>("/src/content/*.jsonld", { query: "?raw", import: "default" });
    const modules = await Promise.all(Object.values(contentModules).map(loader => loader()));
    const rawLinks = modules.flatMap(text => linksFromJsonLd(JSON.parse(text)));
    return Link.normalizeAll(rawLinks);
  }
}
