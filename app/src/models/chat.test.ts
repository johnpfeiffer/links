import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  CHAT_API_PATH,
  MAX_CHAT_RECOMMENDATION_ANSWERS,
  buildChatPrompt,
  chatIsDisabled,
  parseChatRecommendations,
} from "./chat.js";

const links = [
  {
    id: "ai-1",
    name: "AI Systems",
    description: "A practical AI systems essay",
    url: "https://example.com/ai",
    datePublished: "2024-01-01",
    keywords: [{ label: "AI", key: "ai" }],
  },
  {
    id: "eng-1",
    name: "Engineering Leadership",
    description: "A software leadership talk",
    url: "https://example.com/eng",
    datePublished: null,
    keywords: [{ label: "Engineering", key: "engineering" }],
  },
];

describe("chat recommendation parsing", () => {
  it("keeps only unique recommendations that resolve to existing links", () => {
    const parsed = parseChatRecommendations(
      JSON.stringify({
        recommendations: [
          { linkIds: ["ai-1", "ai-1", "missing"] },
          { linkIds: ["missing"] },
          { linkId: "eng-1" },
        ],
      }),
      links
    );

    assert.deepEqual(
      parsed.map((recommendation) => recommendation.links.map((link) => link.id)),
      [["ai-1"], ["eng-1"]]
    );
  });

  it("parses JSON embedded in provider text", () => {
    const parsed = parseChatRecommendations(
      'Sure.\n```json\n{"recommendations":[{"linkIds":["ai-1"]}]}\n```',
      links
    );

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].links[0], links[0]);
  });
});

describe("chat prompt and session limits", () => {
  it("builds a backend-compatible prompt within the worker message limit", () => {
    const prompt = buildChatPrompt({
      message: "Recommend AI learning links",
      links,
    });

    assert.equal(CHAT_API_PATH, "/links/chat");
    assert.match(prompt, /Return JSON only/);
    assert.match(prompt, /ai-1/);
    assert.match(prompt, /eng-1/);
    assert.ok(prompt.length <= 8000);
  });

  it("disables chat at the maximum recommendation count", () => {
    assert.equal(MAX_CHAT_RECOMMENDATION_ANSWERS, 3);
    assert.equal(chatIsDisabled(0), false);
    assert.equal(chatIsDisabled(1), false);
    assert.equal(chatIsDisabled(2), false);
    assert.equal(chatIsDisabled(3), true);
    assert.equal(chatIsDisabled(4), true);
  });
});
