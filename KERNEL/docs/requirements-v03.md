
# Feature - adding or removing a tag filter

A tag will have two states: enabled or disabled (also known as: added or removed)

"Filtered by" should be plain text

## Tag as a Model

Given all of the focus on Tag functionality - ensure it is a separate model to centralize the normalization and behaviors, and the functionality is testable

A tag has two parts:

1. the visual "label" displayed to the user (can have case sensitivity and spaces like "Example Tag")
2. the "slug" (segment in the URL) - this is the unique key

Treat URL segments (especially the "tags") as case-insensitive inputs: normalize to lowercase
- always generate lowercase links
- remove special characters ("Example. #Tag-" becomes example-tag)

Therefore the key used for all internal references is effectively the "slug"

Example: "Example Tag" is shown to the user but the URL (and internal references) use example-slug

## Enabling a Tag

- A tag is considered added/enabled if the tag is in the URL Path
- A tag that is enabled will have its text and outline turn blue
- At the top of the listing of Links, a list of tags that are enabled is displayed after the text "Filtered by" 

A tag default state is "disabled", and its behavior is just a URL that adds the tag to the end of the existing URL

Given: DOMAIN/APPNAME/tag1/tag2 should display on the screen "tag1" and "tag2" in the "enabled/added" state

When "tag3" is clicked then the new URL should be DOMAIN/APPNAME/tag1/tag2/tag3

## Disabling a Tag

When a tag is currently enabled (listed in the URL, blue text and outline), its URL is the current URL with its "tag/filter" removed
- thus any click will navigate to a page with the tag/filter disabled
- this should also cover the edge case if the tag is in the url multiple times - but should not affect the domain or application name

Example: example.com/example/example/foobar becomes example.com/example/foobar

(domain/appname/tag1/tag2 becomes domain/appname/tag2)


# URLs and Tag Edge Case Whitespace

When a tag has whitespace in the string the URLs should use a dash

Also: ensure the application enforces canonical urls and paths with lowercase

