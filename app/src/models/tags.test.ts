import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { Tag } from "./tag.js";
import {
  buildTagsPath,
  buildTagTogglePath,
  isTagEnabled,
} from "./tags.js";

describe("isTagEnabled", () => {
  it("matches tags case-insensitively", () => {
    assert.equal(
      isTagEnabled([Tag.fromLabel("AI"), Tag.fromLabel("Podcast")], Tag.fromLabel("ai")),
      true
    );
    assert.equal(
      isTagEnabled([Tag.fromLabel("AI"), Tag.fromLabel("Podcast")], Tag.fromLabel("news")),
      false
    );
  });
});

describe("buildTagsPath", () => {
  it("builds canonical /tags paths for an empty application name", () => {
    assert.equal(buildTagsPath("", [Tag.fromLabel("ai")]), "/tags/ai");
    assert.equal(
      buildTagsPath("", [Tag.fromLabel("ai"), Tag.fromLabel("podcast")]),
      "/tags/ai/podcast"
    );
  });

  it("preserves the application name before the /tags namespace", () => {
    assert.equal(buildTagsPath("links", [Tag.fromLabel("ai")]), "/links/tags/ai");
    assert.equal(
      buildTagsPath("links", [Tag.fromLabel("ai"), Tag.fromLabel("podcast")]),
      "/links/tags/ai/podcast"
    );
  });

  it("replaces whitespace with dashes in canonical /tags paths", () => {
    assert.equal(
      buildTagsPath("links", [Tag.fromLabel("Business History"), Tag.fromLabel("AI")]),
      "/links/tags/business-history/ai"
    );
  });

  it("builds the links namespace route when no tags are selected", () => {
    assert.equal(buildTagsPath("", []), "/tags");
    assert.equal(buildTagsPath("links", []), "/links/tags");
  });
});

describe("buildTagTogglePath", () => {
  it("adds a disabled tag to the canonical /tags path", () => {
    const enabled = [Tag.fromLabel("tag1")];
    const next = buildTagTogglePath("", enabled, Tag.fromLabel("tag2"));

    assert.equal(next, "/tags/tag1/tag2");
  });

  it("preserves the application name when adding a disabled tag", () => {
    const enabled = [Tag.fromLabel("tag1")];
    const next = buildTagTogglePath("links", enabled, Tag.fromLabel("tag2"));

    assert.equal(next, "/links/tags/tag1/tag2");
  });

  it("removes an enabled tag from the canonical /tags path", () => {
    const enabled = [Tag.fromLabel("tag1"), Tag.fromLabel("tag2")];
    const next = buildTagTogglePath("", enabled, Tag.fromLabel("tag1"));

    assert.equal(next, "/tags/tag2");
  });

  it("returns the links namespace route after removing the final enabled tag", () => {
    const rootNext = buildTagTogglePath("", [Tag.fromLabel("ai")], Tag.fromLabel("ai"));
    const appNext = buildTagTogglePath("links", [Tag.fromLabel("ai")], Tag.fromLabel("ai"));

    assert.equal(rootNext, "/tags");
    assert.equal(appNext, "/links/tags");
  });

  it("adds and removes tags within the sources namespace", () => {
    const enabled = [Tag.fromLabel("tag1")];

    assert.equal(
      buildTagTogglePath("links", enabled, Tag.fromLabel("tag2"), "sources"),
      "/links/sources/tag1/tag2"
    );
    assert.equal(
      buildTagTogglePath("links", enabled, Tag.fromLabel("tag1"), "sources"),
      "/links/sources"
    );
  });
});
