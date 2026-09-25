import type { ChatRecommendation, JsonRecord, LinkRecord } from "../types";
import { isJsonRecord } from "../types";

export const CHAT_API_PATH = "/links/chat";
export const DECISIONS_API_PATH = "/api/decisions";
export const MAX_CHAT_RECOMMENDATION_ANSWERS = 3;
export const NONE_OF_THE_ABOVE_ID = "none_of_the_above";
const MAX_JEV_CHOICE_OPTIONS = 255;
const MAX_JEV_CANDIDATES = MAX_JEV_CHOICE_OPTIONS - 1;
const WORKER_MESSAGE_LIMIT = 8_000;
const PROMPT_HEADROOM = 400;
const CHAT_PROMPT_SUFFIX = "\nReturn at most 3 recommendations.";

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

function chatPromptPrefix(question: string): string {
  return [
    "You recommend links from a fixed catalog.",
    "Use only candidate ids from the catalog below.",
    "Return JSON only with this shape: {\"recommendations\":[{\"linkIds\":[\"existing-id\"]}]}",
    "Do not invent links, names, urls, ids, or keywords.",
    `User request: ${question}`,
    "Catalog:",
  ].join("\n");
}

function boundedCandidateLinks(
  question: string,
  links: readonly LinkRecord[]
): { links: LinkRecord[]; serialized: string[] } {
  const prefix = chatPromptPrefix(question);
  const maxLength = WORKER_MESSAGE_LIMIT - PROMPT_HEADROOM;
  const boundedLinks: LinkRecord[] = [];
  const serialized: string[] = [];
  for (const link of candidateLinksFor(question, links)) {
    const line = serializeCandidate(link);
    const nextPrompt = `${prefix}\n${[...serialized, line].join("\n")}${CHAT_PROMPT_SUFFIX}`;
    if (nextPrompt.length > maxLength) break;
    boundedLinks.push(link);
    serialized.push(line);
  }
  return { links: boundedLinks, serialized };
}

export function buildChatPrompt({ message, links }: { message: string; links: readonly LinkRecord[] }): string {
  const question = compactText(message);
  const candidates = boundedCandidateLinks(question, links);
  return `${chatPromptPrefix(question)}\n${candidates.serialized.join("\n")}${CHAT_PROMPT_SUFFIX}`;
}

interface JevCandidateCriterion {
  title: string;
  description: string;
  tags: string[];
}

interface JevRequest {
  state: { user_request: string };
  questions: {
    best_link: {
      type: "choice";
      instructions: string;
      criteria: Record<string, JevCandidateCriterion | string>;
    };
  };
}

export function buildJevRequest(
  { message, links }: { message: string; links: readonly LinkRecord[] }
): JevRequest {
  const question = compactText(message);
  const candidates = boundedCandidateLinks(question, links).links.slice(
    0,
    MAX_JEV_CANDIDATES
  );
  const criteria: Record<string, JevCandidateCriterion | string> = {};

  for (const link of candidates) {
    if (link.id === NONE_OF_THE_ABOVE_ID || Object.hasOwn(criteria, link.id)) continue;
    criteria[link.id] = {
      title: compactText(link.name),
      description: compactText(link.description || link.name),
      tags: keywordLabelsFor(link),
    };
  }
  criteria[NONE_OF_THE_ABOVE_ID] = "No candidate meaningfully helps with the request.";

  return {
    state: { user_request: question },
    questions: {
      best_link: {
        type: "choice",
        instructions:
          "Which catalog link most directly helps the user accomplish the stated goal? Choose none_of_the_above when no candidate is genuinely useful.",
        criteria,
      },
    },
  };
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

export interface JevRecommendationResult {
  recommendations: ChatRecommendation[];
  noStrongMatch: boolean;
}

interface JevChoiceAnswer {
  choice: string;
  probabilities: JsonRecord;
}

function choiceAnswerFrom(payload: unknown): JevChoiceAnswer | null {
  if (!isJsonRecord(payload) || !isJsonRecord(payload.answers)) return null;
  const answer = payload.answers.best_link;
  if (
    !isJsonRecord(answer) ||
    answer.type !== "choice" ||
    typeof answer.choice !== "string" ||
    !answer.choice.trim() ||
    !isJsonRecord(answer.probabilities) ||
    Object.keys(answer.probabilities).length === 0
  ) {
    return null;
  }
  if (
    answer.confidence !== undefined &&
    (
      typeof answer.confidence !== "number" ||
      !Number.isFinite(answer.confidence) ||
      answer.confidence < 0 ||
      answer.confidence > 1
    )
  ) {
    return null;
  }
  if (
    Object.values(answer.probabilities).some(
      (probability) =>
        typeof probability !== "number" ||
        !Number.isFinite(probability) ||
        probability < 0 ||
        probability > 1
    )
  ) {
    return null;
  }
  return {
    choice: answer.choice,
    probabilities: answer.probabilities,
  };
}

export function parseJevRecommendations(
  payload: unknown,
  links: readonly LinkRecord[]
): JevRecommendationResult {
  const answer = choiceAnswerFrom(payload);
  if (!answer) {
    return { recommendations: [], noStrongMatch: false };
  }

  const ranked = Object.entries(answer.probabilities)
    .map((entry) => entry as [string, number])
    .map(([id, probability], index) => ({ id, probability, index }));
  const noneProbability = ranked.find(({ id }) => id === NONE_OF_THE_ABOVE_ID)?.probability;
  if (noneProbability === undefined) {
    return { recommendations: [], noStrongMatch: false };
  }

  const linkById = new Map(links.map((link) => [link.id, link]));
  const seen = new Set<string>();
  const groundedCandidates = ranked
    .filter(({ id }) => id !== NONE_OF_THE_ABOVE_ID)
    .map(({ id, probability, index }) => ({
      id,
      probability,
      index,
      link: linkById.get(id),
    }))
    .filter(({ id, link }) => {
      if (!link || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  const highestCandidateProbability = Math.max(
    ...groundedCandidates.map(({ probability }) => probability),
    Number.NEGATIVE_INFINITY
  );

  if (
    answer.choice === NONE_OF_THE_ABOVE_ID ||
    noneProbability >= highestCandidateProbability
  ) {
    return { recommendations: [], noStrongMatch: true };
  }

  const resolvedLinks = groundedCandidates
    .filter(({ probability }) => probability > noneProbability)
    .sort((left, right) => right.probability - left.probability || left.index - right.index)
    .slice(0, 3)
    .map(({ link }) => link as LinkRecord);

  return {
    recommendations: resolvedLinks.length > 0 ? [{ links: resolvedLinks }] : [],
    noStrongMatch: false,
  };
}
