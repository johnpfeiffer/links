import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  CHAT_API_PATH,
  DECISIONS_API_PATH,
  MAX_CHAT_RECOMMENDATION_ANSWERS,
  buildChatPrompt,
  buildJevRequest,
  chatIsDisabled,
  parseChatRecommendations,
  parseJevRecommendations,
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

  it("preserves the existing chat prompt output and candidate ordering", () => {
    assert.equal(
      buildChatPrompt({ message: "Recommend AI learning links", links }),
      [
        "You recommend links from a fixed catalog.",
        "Use only candidate ids from the catalog below.",
        "Return JSON only with this shape: {\"recommendations\":[{\"linkIds\":[\"existing-id\"]}]}",
        "Do not invent links, names, urls, ids, or keywords.",
        "User request: Recommend AI learning links",
        "Catalog:",
        '{"id":"ai-1","name":"AI Systems","description":"A practical AI systems essay","url":"https://example.com/ai","datePublished":"2024-01-01","keywords":["AI"]}',
        '{"id":"eng-1","name":"Engineering Leadership","description":"A software leadership talk","url":"https://example.com/eng","datePublished":null,"keywords":["Engineering"]}',
        "Return at most 3 recommendations.",
      ].join("\n")
    );
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

describe("Jev recommendation requests", () => {
  it("builds one Choice question from the same bounded existing candidates", () => {
    const manyLinks = Array.from({ length: 100 }, (_, index) => ({
      ...links[index % links.length],
      id: `link-${index}`,
      name: `Candidate ${index}`,
      description: `Candidate ${index} ${"detail ".repeat(30)}`,
    }));
    const message = "  Recommend AI learning links  ";
    const prompt = buildChatPrompt({ message, links: manyLinks });
    const promptIds = prompt
      .split("\n")
      .filter((line) => line.startsWith('{"id":'))
      .map((line) => JSON.parse(line).id);
    const request = buildJevRequest({ message, links: manyLinks });
    const criteria = request.questions.best_link.criteria;
    const candidateIds = Object.keys(criteria).filter(
      (id) => id !== "none_of_the_above"
    );

    assert.equal(DECISIONS_API_PATH, "/api/decisions");
    assert.equal(request.state.user_request, message.trim());
    assert.deepEqual(candidateIds, promptIds);
    assert.ok(candidateIds.length > 0);
    assert.ok(candidateIds.length < manyLinks.length);
    assert.ok(Object.keys(criteria).length <= 255);
    assert.deepEqual(criteria[candidateIds[0]], {
      title: manyLinks[0].name,
      description: manyLinks[0].description.trim(),
      tags: ["AI"],
    });
    assert.equal(
      criteria.none_of_the_above,
      "No candidate meaningfully helps with the request."
    );
  });
});

describe("Jev recommendation parsing", () => {
  it("sorts probabilities, drops unknown and duplicate ids, and returns at most three links", () => {
    const rankingLinks = [
      ...links,
      { ...links[0], id: "third", name: "Third" },
      { ...links[0], id: "fourth", name: "Fourth" },
      { ...links[0] },
    ];
    const parsed = parseJevRecommendations(
      {
        answers: {
          best_link: {
            type: "choice",
            choice: "missing",
            probabilities: {
              missing: 0.99,
              "eng-1": 0.7,
              "ai-1": 0.8,
              third: 0.6,
              fourth: 0.5,
              none_of_the_above: 0.1,
            },
          },
        },
      },
      rankingLinks
    );

    assert.equal(parsed.noStrongMatch, false);
    assert.deepEqual(
      parsed.recommendations[0].links.map((link) => link.id),
      ["ai-1", "eng-1", "third"]
    );
  });

  it("returns no recommendation when none of the above has the highest probability", () => {
    const parsed = parseJevRecommendations(
      {
        answers: {
          best_link: {
            type: "choice",
            choice: "none_of_the_above",
            probabilities: {
              "ai-1": 0.2,
              none_of_the_above: 0.8,
            },
          },
        },
      },
      links
    );

    assert.equal(parsed.noStrongMatch, true);
    assert.deepEqual(parsed.recommendations, []);
  });

  it("recommends only grounded candidates that beat none of the above", () => {
    const parsed = parseJevRecommendations(
      {
        answers: {
          best_link: {
            type: "choice",
            choice: "ai-1",
            probabilities: {
              "ai-1": 0.7,
              none_of_the_above: 0.2,
              "eng-1": 0.1,
            },
          },
        },
      },
      links
    );

    assert.equal(parsed.noStrongMatch, false);
    assert.deepEqual(
      parsed.recommendations[0].links.map((link) => link.id),
      ["ai-1"]
    );
  });

  it("compares none of the above only with grounded candidates", () => {
    const parsed = parseJevRecommendations(
      {
        answers: {
          best_link: {
            type: "choice",
            choice: "missing",
            probabilities: {
              missing: 0.9,
              none_of_the_above: 0.8,
              "ai-1": 0.2,
            },
          },
        },
      },
      links
    );

    assert.equal(parsed.noStrongMatch, true);
    assert.deepEqual(parsed.recommendations, []);
  });

  it("rejects responses that are not native Choice answers", () => {
    const parsed = parseJevRecommendations(
      {
        answers: {
          best_link: {
            probabilities: { "ai-1": 0.9, none_of_the_above: 0.1 },
          },
        },
      },
      links
    );

    assert.equal(parsed.noStrongMatch, false);
    assert.deepEqual(parsed.recommendations, []);
  });
});
