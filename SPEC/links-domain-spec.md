# Links Domain Specification

This specification is derived from `/KERNEL/` and must not override it.

## Data Model

### Link

Trace: `INV-001`, `INV-002`, `INV-003`, `INV-014`, `INV-015`, `INV-016`

A loaded invariant `Link` is a record with exactly these fields:

- `id`: non-empty string, unique across all links.
- `url`: non-empty string.
- `title`: non-empty string.
- `tags`: non-empty set of non-empty strings.
- `published`: `null` when unknown, otherwise an ISO 8601 date string.
- `description`: non-empty trimmed string.
- `alternate-url`: URL string when known, otherwise an empty string.

If source data omits `description`, the loaded link derives it from `title`. If a year can be derived from `published`, the description ends with that year as a single ` (YYYY)` suffix.

`createdAt` may exist as ingest/runtime metadata, but it is not part of the invariant `link` record and must not affect ids.

Invalid source records must not break the application. They may be skipped or normalized with console warnings, matching the requirements documents.

### Tag

Trace: `INV-004`, `INV-005`, `INV-006`

A tag has:

- a user-facing label string.
- a URL slug derived from the label.

Slug normalization is idempotent and must:

- lowercase input.
- strip special characters.
- replace whitespace with `-`.

Each slug identifies at most one tag label. Duplicate slugs in URL selection are invalid and should be canonicalized away rather than represented internally.

Every presented tag must be connected to at least one loaded link unless it is one of the favorite tags: `AI`, `Business`, `Engineering`, `History`, `People`, `Podcast`, `Book`.

## Routing And Selection

Trace: `INV-006`, `INV-007`, `INV-008`, `INV-009`, `INV-010`

The URL drives the SPA and is structured as:

`DOMAIN / optional APPLICATIONNAME / NAMESPACE / optional selected tag slugs`

- `DOMAIN` is the host, such as `example.com`.
- `APPLICATIONNAME` is the deployed app name, such as `links`; it may be empty.
- a namespace appears only after `DOMAIN/APPLICATIONNAME`.
- when `APPLICATIONNAME` is empty, the namespace follows the domain root directly.
- the app base route redirects to the `/tags` namespace.
- `/tags` identifies the Links View.
- `/sources` identifies the Sources View.
- route segments after the namespace are selected tag slugs.
- selected slugs are case-insensitive inputs and should be emitted in canonical lowercase form.
- duplicate selected slugs should be removed from the canonical representation.
- generated navigation links must preserve the current `APPLICATIONNAME`.

Examples for `APPLICATIONNAME = links`:

- `/links/` redirects to `/links/tags`.
- `/links/tags/ai/podcast` identifies the Links View with selected slugs `ai` and `podcast`.
- `/links/sources/ai/podcast` identifies the Sources View with selected slugs `ai` and `podcast`.

Examples for empty `APPLICATIONNAME`:

- `/` redirects to `/tags`.
- `/tags/ai/podcast` identifies the Links View.
- `/sources/ai/podcast` identifies the Sources View.

When selected slugs are present, a link is included if every selected slug matches one of its normalized tag labels.

When no slugs are selected, all links are included.

The Links View count equals the number of unique currently included links.

## Sources

Trace: `INV-011`, `INV-012`, `INV-013`

A `Source` is the canonical domain derived from a currently included link with a valid URL. Canonicalization strips a leading `www.` prefix. Invalid URLs do not produce Sources.

A link is a member of a Source if and only if:

- the link is currently included by `INV-007` or `INV-008`.
- the link URL is valid.
- the link canonical domain equals the Source.

A Source count equals its member link count. Sources with count `0` are not included in the current view.

## Chat Recommendations

Trace: `INV-017`, `INV-018`

Chat responses are recommendation responses over the existing loaded links collection.

A chat recommendation must:

- be connected to at least one existing link.
- reference only link ids that resolve to exactly one loaded link.
- not include the same link more than once in the same recommendation.
- provide the recommended link attributes exactly as loaded; chat must not mutate link data, create links, rewrite titles, rewrite URLs, rewrite tags, rewrite `published`, rewrite `description`, or rewrite `alternate-url`.

Chat session state must expose a visible recommendation count. A session allows at most `3` recommendation answers. When the visible recommendation count reaches `3`, new request submission is disabled and chat is disabled.

The backend integrations are the existing Worker endpoint at `/links/chat` and
the generalized Decisions gateway at `/api/decisions`. The security boundary is:

- React SPA calls exactly one selected endpoint per submission.
- Worker allows only exact-origin CORS requests for the hosting origin or explicitly configured allowed origins.
- provider credentials and the Jev model selection remain server-side.
- Turnstile, rate limiting, low token caps, model calls, and response shaping are future implementation gates.

The existing LLM provider remains Google Gemini/Gemma without behavioral
change. The parallel Jev path sends one Choice question over the same bounded
candidate subset and consumes the structured probabilities returned by
OpenRouter Decisions. Its native Choice request stays within the gateway's
`255`-option maximum, including the reserved no-match option. A Jev response is
usable only when it contains the typed Choice answer contract; recommendations
are grounded first and then limited to candidates whose probabilities exceed
`none_of_the_above`. The derived chat invariants require final responses to be
link-grounded regardless of provider. Provider selection adds no state predicate
to `INV-017` or `INV-018`, so the TLA+ specification is unchanged.

## Views

### Links View

Derived from requirements v1 through v4:

- asynchronously load link content.
- show a loading state while content is pending.
- show favorite/popular tags above all tags: `AI`, `Business`, `Engineering`, `History`, `People`, `Podcast`, `Book`.
- show all tags in an expandable section.
- show enabled tags after plain text `Filtered by`.
- show included link count before the list.
- show each link description as a clickable URL with tags below.
- clicking a disabled tag appends that tag slug to the URL.
- clicking an enabled tag removes that slug from the URL.
- below Sources navigation, show `Ask for Recommendations` linking to `/:app/_chat` when an app name is present and `/_chat` when the app name is empty.

### Chat View

Derived from requirements v7:

- route namespace: `/_chat`, after any application name when present.
- provide navigation back to the Links View.
- show intro text above the freeform text box: `Ask for recommendations based on a top or scenario...`.
- show separate `Ask LLM` and `Ask Jev` buttons while retaining LLM as the default form action.
- show the engine label on every successful answer.
- show the visible recommendation count near the provider buttons.
- show the newest recommendation answer above older answers so recent responses stay closest to the request controls.
- disable both provider actions while a request is pending and after `3` combined recommendation answers.
- do not count failures or a Jev `none_of_the_above` result as recommendation answers.
- preserve the backend API route `POST /links/chat`.
- add the stateless backend API route `POST /api/decisions` without sending prior Gemini interaction ids.

### Sources View

Derived from requirements v5 and v6:

- route namespace: `/sources`, after any application name.
- aggregate currently included valid links by canonical source domain.
- sort domains by link count descending.
- show rank number and link count for each domain.
- allow each domain list to expand and collapse.
- show individual links in published date order, ascending, with null dates last.
- provide navigation back to the Links View.

## UI Constraints

Derived from requirements v2:

- plain white page background.
- tag controls use white backgrounds.
- base font size is 16px.
- layout uses at least 90% of screen width where practical.
- responsive behavior must remain usable on mobile and resized desktop windows.
- prefer ASCII over icons and images.

## Documentation Requirements

Derived from `/KERNEL/AGENTS.md` and `/KERNEL/README.md`:

- generated facts and decisions should be recorded in documentation.
- meaningful feature/refactor work should update architecture documentation with Mermaid diagrams for system design and user journey.
- unverifiable requirements must be escalated rather than silently converted into implementation work.
