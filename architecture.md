# Architecture

This document records derived implementation facts. `/KERNEL/` remains the authority.

## System Design

```mermaid
flowchart TD
  User["User opens recommendations"] --> Home["HomePage<br/>Links View"]
  User --> Footer["Global Footer<br/>built-by + LinkedIn/GitHub source links"]
  Home --> UI["React ChatPage<br/>/_chat or /:app/_chat"]
  UI --> Loader["Root loader<br/>Link.loadAll"]
  Loader --> Links["Existing normalized links"]
  UI --> Prompt["chat model helper<br/>buildChatPrompt"]
  Prompt --> API["POST /links/chat"]
  API --> Worker["Cloudflare Worker chat example"]
  Worker --> Provider["Gemini provider"]
  Provider --> Worker
  Worker --> Parser["parseChatRecommendations"]
  Parser --> Validate["Resolve ids against existing links"]
  Validate --> Render["Render only existing link attributes"]
```

Content loading: `Link.loadAll` fetches the five favorites JSON files from
`raw.githubusercontent.com` (`main`) with the default HTTP cache mode, so GitHub's 5-minute
CDN TTL (`cache-control: max-age=300`) bounds content staleness. The bundled
`app/src/content/*.json` copies are only an offline fallback and are refreshed manually
from the favorites repo.

## Type-Safety Gates

The application is authored in TypeScript with strict compiler settings in `app/tsconfig.json`.
Untrusted remote content and chat responses enter as `unknown` and are narrowed before use; static
types complement rather than replace those runtime checks.

```mermaid
flowchart LR
  Content["Remote or bundled JSON"] --> Unknown["unknown input"]
  Api["Chat API response"] --> Unknown
  Unknown --> Narrow["Runtime record checks"]
  Narrow --> Models["Typed Link / Tag / Chat contracts"]
  Models --> Ui["Typed React component props and state"]
  Models --> Tests["Vitest tests"]
  Ui --> Compile["tsc --project tsconfig.json"]
  Tests --> Check["npm run check"]
  Compile --> Check
  Check --> Build["Vite production build"]
```

The visible chat UI route is separate from `/links/chat` because `/links/chat` is the Cloudflare Worker API route in the imported backend example. The UI is reachable from the Links View at `/_chat` for a root-hosted app and `/:app/_chat` for app-prefixed hosting, such as `/links/_chat`.

## Chat Journey

```mermaid
sequenceDiagram
  participant User
  participant HomePage
  participant ChatPage
  participant Worker as POST /links/chat
  participant Gemini

  User->>HomePage: Click Ask for Recommendations
  HomePage-->>ChatPage: Navigate to /links/_chat
  User->>ChatPage: Submit link request
  ChatPage->>ChatPage: Build prompt from loaded links
  ChatPage->>Worker: Send JSON message
  Worker->>Gemini: Provider request
  Gemini-->>Worker: JSON recommendation text
  Worker-->>ChatPage: message and interaction id
  ChatPage->>ChatPage: Parse link ids and validate against loaded links
  ChatPage-->>User: Show newest grounded recommendations first
  ChatPage->>ChatPage: Disable after 3 recommendation answers
```

## Invariant Mapping

- `INV-017`: Chat renders only recommendations whose link ids resolve to currently loaded links. Unknown ids and duplicate ids inside a recommendation are dropped before display.
- `INV-018`: Chat displays `Recommendations used: N / 3` near the Send button and disables new submissions after three successful recommendation answers.
- Requirements v7: The Links View exposes `Ask for Recommendations` below Sources navigation and routes users to `/:app/_chat`.
- Chat UI behavior: New recommendation answers are prepended above older answers so the newest response stays nearest the request controls.

## Shared Tag Filtering

`TagsMenu` is the shared presentation boundary for tag discovery, active-filter removal,
and the exact filtered-link count. `LinksSection` configures it for the `tags` namespace;
`SourcesPage` configures the same component for the `sources` namespace. Route construction
is centralized in `buildTagFilterPath` and `buildTagTogglePath`, so adding or removing a tag
keeps the user in the current view and preserves any application-name prefix.

```mermaid
flowchart LR
  Path["Current namespaced URL"] --> Parse["parseUrlPath"]
  Data["Loaded links"] --> Tags["collectTags"]
  Parse --> Selected["Resolve selected tag labels"]
  Tags --> Selected
  Data --> Filter["filterLinksByTags (AND)"]
  Selected --> Filter
  Selected --> Menu["Shared TagsMenu"]
  Tags --> Menu
  Filter --> Count["Showing N links"]
  Count --> Menu
  Menu --> Toggle["buildTagTogglePath"]
  Toggle --> TagsView["/tags/:tag*"]
  Toggle --> SourcesView["/sources/:tag*"]
```

### Tag-Filtering Journey

```mermaid
sequenceDiagram
  participant User
  participant Menu as TagsMenu
  participant Router
  participant View as Links or Sources View

  User->>Menu: Expand Show all tags
  Menu-->>User: Display every available tag
  User->>Menu: Select or unselect a tag
  Menu->>Router: Navigate within the current namespace
  Router->>View: Parse selected tag slugs
  View->>View: Filter links using AND semantics
  View-->>Menu: Render active tags and exact link count
```

This preserves `INV-006` through `INV-010`: selected tag slugs remain canonical and unique,
selection uses AND semantics, no selection includes every link, and both views display the
exact count of included links. The Sources View then derives its domain membership and counts
from that filtered set, preserving `INV-011` through `INV-013`.

## Global Footer

`app/src/components/Footer.tsx` is a pure presentational component rendered once in `App.tsx` (inside the `ThemeProvider`, after the `RouterProvider`) so it appears on every route. It shows a "Built by John Pfeiffer" line with LinkedIn and GitHub source-link icons (`@mui/icons-material`); the GitHub link points at this repository. Covered by `Footer.test.tsx` (jsdom, `createRoot` + `act`).
