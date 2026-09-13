import type { ChatRecommendation, JsonRecord, LinkRecord } from "../types";
import { isJsonRecord } from "../types";

export const CHAT_API_PATH = "/links/chat";
export const MAX_CHAT_RECOMMENDATION_ANSWERS = 3;
const WORKER_MESSAGE_LIMIT = 8_000;
const PROMPT_HEADROOM = 400;

function compactText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wordsFor(value: unknown): string[] {
  return compactText(value).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1);
}

function keywordLabelsFor(link: Partial<LinkRecord> | null | undefined): string[] {
  return Array.isArray(link?.keywords)
    ? link.keywords.map((tag) => compactText(tag.label ?? tag.key)).filter(Boolean)
    : [];
}

function scoreLinkForMessage(link: LinkRecord, messageWords: readonly string[]): number {
  if (messageWords.length === 0) return 0;
  const haystack = wordsFor([link.name, link.description, link.url, keywordLabelsFor(link).join(" ")].join(" "));
  const haystackSet = new Set(haystack);
  return messageWords.reduce((score, word) => score + (haystackSet.has(word) ? 1 : 0), 0);
}

function candidateLinksFor(message: string, links: readonly LinkRecord[]): LinkRecord[] {
  const messageWords = wordsFor(message);
  return [...links]
    .map((link, index) => ({ link, index, score: scoreLinkForMessage(link, messageWords) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ link }) => link);
}

function serializeCandidate(link: LinkRecord): string {
  return JSON.stringify({
    id: compactText(link.id),
    name: compactText(link.name),
    description: compactText(link.description || link.name),
    url: compactText(link.url),
    datePublished: link.datePublished,
    keywords: keywordLabelsFor(link),
  });
}

export function chatIsDisabled(recommendationCount: number): boolean {
  return recommendationCount >= MAX_CHAT_RECOMMENDATION_ANSWERS;
}

export function buildChatPrompt({ message, links }: { message: string; links: readonly LinkRecord[] }): string {
  const question = compactText(message);
  const candidates = candidateLinksFor(question, links);
  const prefix = [
    "You recommend links from a fixed catalog.",
    "Use only candidate ids from the catalog below.",
    "Return JSON only with this shape: {\"recommendations\":[{\"linkIds\":[\"existing-id\"]}]}",
    "Do not invent links, names, urls, ids, or keywords.",
    `User request: ${question}`,
    "Catalog:",
  ].join("\n");
  const suffix = "\nReturn at most 3 recommendations.";
  const maxLength = WORKER_MESSAGE_LIMIT - PROMPT_HEADROOM;
  const lines: string[] = [];
  for (const link of candidates) {
    const line = serializeCandidate(link);
    const nextPrompt = `${prefix}\n${[...lines, line].join("\n")}${suffix}`;
    if (nextPrompt.length > maxLength) break;
    lines.push(line);
  }
  return `${prefix}\n${lines.join("\n")}${suffix}`;
}

function tryParseJson(value: string): JsonRecord | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isJsonRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonCandidate(message: unknown): JsonRecord | null {
  const text = compactText(message);
  const direct = tryParseJson(text);
  if (direct) return direct;
  const original = String(message ?? "");
  const fenced = original.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return tryParseJson(fenced[1].trim());
  const firstBrace = original.indexOf("{");
  const lastBrace = original.lastIndexOf("}");
  return firstBrace !== -1 && lastBrace > firstBrace ? tryParseJson(original.slice(firstBrace, lastBrace + 1)) : null;
}

function idsForRecommendation(recommendation: unknown): unknown[] {
  if (!isJsonRecord(recommendation)) return [];
  if (Array.isArray(recommendation.linkIds)) return recommendation.linkIds;
  return typeof recommendation.linkId === "string" ? [recommendation.linkId] : [];
}

export function parseChatRecommendations(message: unknown, links: readonly LinkRecord[]): ChatRecommendation[] {
  const data = parseJsonCandidate(message);
  const linkById = new Map(links.map((link) => [link.id, link]));
  const rawRecommendations = data && Array.isArray(data.recommendations) ? data.recommendations : [];
  return rawRecommendations
    .map((recommendation) => {
      const seen = new Set<string>();
      const resolvedLinks = idsForRecommendation(recommendation)
        .map((id) => typeof id === "string" ? id.trim() : "")
        .filter((id) => {
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((id) => linkById.get(id))
        .filter((link): link is LinkRecord => Boolean(link));
      return { links: resolvedLinks };
    })
    .filter((recommendation) => recommendation.links.length > 0);
}
