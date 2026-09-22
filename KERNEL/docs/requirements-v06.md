# Published Date Metadata

## Goal
Add a "published" date to every Link so the app can support time-based insights (timelines, story lifecycles, and clusters).

## Data Requirements
- Every link entry includes a "published" field
- "published" is an ISO 8601 date string (e.g. "2024-06-28" or "2024-06-28T15:04:05Z")
- When the source date is unknown, set "published" to null
- "published" is separate from "createdAt" (ingest time) and does not affect ids.

Update the model and initialization/ingestion of Links to have this new "published" attribute

## Display
When displaying a description, if there is a published attribute (not null), put the year in parenthesis at the end of the Description

- for MVP: append to the Description during Link initialization

example: "my example description", published "2000-01-01" becomes "my example description (2000)"

## Leverage published date in Sources

In the Sources view, by default, display the expanded domain list of links sorted by published date
- ascending order (earlier dates first)
- null dates after items with dates

