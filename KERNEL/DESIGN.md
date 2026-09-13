---
name: Pfeiffer
description: Use MUI defaults, only specify overrides.
colors:
typography:
---
# Theme

Minimalist.

The aesthetic is deliberately plain.

No distractions: do not add extraneous decoration or objects.

Easy to focus on what's important, unobtrusive. 

Light Mode.

# Standards and Compatibility 

Standards - use as compatible and standard fonts as possible.

Defaults are universal, prefer defaults.

Prefer ASCII art or UTF-8 over images.

## Patterns

Progressive disclosure:
- Unobtrusive menus at the top left or top right
- Sources on the left, details on the right
- Start collapsed and summarized, expand downward or to the right

Clarity:
- provide a spinner or UI element to indicate loading when the user has to wait.
- if text or content continues downward below then provide a scroll bar or simple and obvious way to continue
- have at least a 1 px border thickness so that items and text do not run into each other or overlap 
- make it easy to read: use at least 14px font
- avoid extraneous scrollbars: most datasets can just use the browser's existing vertical scrollbars, and compacting the text and UI is preferred over horizontal scrollbars

## Implementation Decisions

Use material-ui , <https://github.com/mui/material-ui>

e.g. <https://github.com/mui/material-ui/tree/master/examples/material-ui-vite-ts>

Colors: MUI defaults
Fonts: MUI defaults


Prefer relative links rather than absolute links.

# References

<https://github.com/google-labs-code/design.md>

*version: 2026-08-11*

