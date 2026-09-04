# Links App - Product Requirements Document

# Production

deprecated so moved to "linksv2"

GitHub code integration with Cloudflare deployed to https://feneky.pages.dev/links/



## Overview

The Links app is a curated link management and browsing system designed to organize and present web resources across different categories. It provides a clean, responsive interface for exploring links by category, filtering by tags, and discovering content sources by frequency.

## Domain Models

### Link Model

The `Link` class represents an individual web resource with the following properties:

- **id**: Unique identifier (auto-generated using timestamp + random number if not provided)
- **url**: The web URL of the resource (required)
- **title**: Display title for the link (required)
- **tags**: Array of string tags for categorization (optional, defaults to empty array)
  - Tags are automatically deduplicated to prevent React key warnings
- **createdAt**: Timestamp when the link was created

#### Data Validation
- Links without `url` or `title` fields are skipped during loading
- Invalid links generate console warnings but don't break the application
- Each link must have a unique id for React rendering

### Category Model

The `Category` class represents a grouping of links with the following capabilities:

- **name**: Category name (e.g., "Engineering", "Business", "People")
- **toUrlPath()**: Converts category name to lowercase URL segment
- **matchesSegment()**: Checks if a URL segment matches the category (case-insensitive)

#### Special Categories

1. **"All" Category**
   - Virtual category that aggregates all links from all categories
   - Always appears first in the navigation
   - Not stored in data files but computed at runtime

2. **"Sources" Category**
   - Special view that displays links grouped by domain
   - Always appears last in the navigation
   - Shows domains sorted by frequency of appearance

## Features

### 1. Category Navigation

#### Button Layout
- Categories displayed as horizontal button row
- Order: "All" → Alphabetical categories → "Sources"
- Active category visually highlighted

#### Category Switching
- Clicking a category updates URL and displays relevant links
- State persists through URL navigation
- Browser back/forward buttons work correctly

### 2. Tag System

#### Tag Display
- Tags shown beneath each link
- All unique tags across current category displayed in sidebar
- Tags are clickable both in sidebar and on individual links

#### Tag Filtering Behavior
- **Toggle Behavior**: Clicking a tag toggles its selection
- **Filter Logic**: OR operation - shows links containing ANY selected tag
- **Visual Feedback**:
  - Selected tags highlighted in sidebar
  - Matching tags highlighted on filtered links
- **Clear Filters**: Button appears when filters active to reset all

#### Tag Management
- Tags extracted from JSON data files
- Automatically sorted alphabetically
- Duplicates removed at multiple levels (link creation, display)

### 3. Sources View

#### Data Aggregation
- Collects all links across all categories
- Groups by domain (strips "www." prefix for consistency)
- Handles invalid URLs gracefully with console warnings

#### Display Features
- **Sorting**: Domains sorted by link count (descending)
- **Ranking**: Each domain shows rank number (#1, #2, etc.)
- **Count Display**: Shows number of links per domain
- **Expandable Lists**:
  - Click expand arrow (▶/▼) to show/hide links
  - Each domain link clickable to visit source
  - Individual links shown when expanded

### 4. URL Routing

#### Important Architecture Note
The Links app operates as a standalone SPA that is unaware of its deployment context:
- **In Development**: Runs at root `/` (e.g., `localhost:5173/`)
- **In Production**: Deployed at `/links` via Cloudflare middleware (e.g., `feneky.pages.dev/links`)
- The app's internal routing always uses `/` as its base - the `/links` prefix is added transparently by the production middleware

#### Critical Production Requirement: URL Prefix Preservation
The production middleware **MUST** inject a `<base href="/links/">` tag into the HTML to ensure proper routing:

1. **How it works**:
   - The middleware intercepts HTML responses and injects `<base href="/links/">` into the `<head>` section
   - This makes all relative URLs (used by React Router) resolve relative to `/links/` instead of `/`
   - When the app calls `navigate('/business')`, the browser interprets this as `/links/business` due to the base tag

2. **Why it's critical**:
   - Without this base tag, navigation would break in production
   - Clicking "Business" from `/links/all` would navigate to `/business` (losing the `/links` prefix)
   - This would result in a 404 error as `/business` doesn't exist at the root level

3. **Implementation details**:
   - Vite config maintains `base: '/'` (not `/links/`) to keep the app context-agnostic
   - React Router uses no `basename` prop, operating at root
   - The middleware handles all path translation transparently
   - Asset paths are also rewritten from `/assets/` to `/links/assets/` by the middleware

4. **What breaks without proper URL preservation**:
   - User lands on `/links/business` ✓ (works - middleware serves the app)
   - User clicks "Engineering" category
   - App calls `navigate('/engineering')`
   - Without base tag: Browser navigates to `/engineering` ✗ (404 error - outside app scope)
   - With base tag: Browser navigates to `/links/engineering` ✓ (correct behavior)

#### Internal Routing Structure (App Perspective)
```
/                    → Redirects to /all
/all                 → Shows all links
/engineering         → Shows Engineering category
/business            → Shows Business category
/sources             → Shows Sources view
```

#### Production URLs (User Perspective)
```
/links/              → Redirects to /links/all
/links/all           → Shows all links
/links/engineering   → Shows Engineering category
/links/business      → Shows Business category
/links/sources       → Shows Sources view
```

#### Navigation Path Calculation
The `getNavigationPath()` function intelligently handles URL updates within the app's context:

1. **Preserves Base Path**: Maintains any prefix segments before category
2. **Replaces Category**: Updates only the category segment
3. **Cleans Invalid Segments**: Removes trailing invalid path segments

#### URL Behavior Examples (App Internal Routing)

**Landing Scenarios:**
- `/` → Redirects to `/all`
- `/business` → Shows Business category
- `/Business` → Shows Business category (case-insensitive)

**Category Switching:**
- From `/all` clicking "Business" → `/business`
- From `/business` clicking "Sources" → `/sources`
- From `/sources` clicking "All" → `/all`

**Invalid URL Handling:**
- `/invalid` → Redirects to `/all`
- `/business/random/stuff` → Shows Business category (ignores trailing)
- Non-existent category → Redirects to `/all`

**Note**: In production, users see these same patterns with the `/links` prefix, but the app itself only handles the paths after that prefix.

#### Route Definitions
- Catch-all routes using `/*` to handle trailing segments
- Invalid paths redirect to `/all` via `<Navigate>` component (internally)
- Case-insensitive URL matching for categories

## Data Structure

### JSON File Format
Located in `src/content/` directory:

```json
{
  "CategoryName": [
    {
      "title": "Link Title",
      "url": "https://example.com",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}
```

### Dynamic Loading
- JSON files loaded asynchronously using Vite's `import.meta.glob()`
- Malformed JSON handled gracefully with error logging
- Categories only created if they contain valid links
- File-based category discovery (no hardcoded list)

## Testing Considerations

### Development vs Production Routing
Since the app behaves differently in development (no `/links` prefix) vs production (with `/links` prefix via base tag), testing should account for both scenarios:

1. **Local Development Testing**:
   - URLs will be `/`, `/all`, `/business`, etc.
   - No base tag present
   - Direct navigation works as expected

2. **Production Testing**:
   - URLs will be `/links/`, `/links/all`, `/links/business`, etc.
   - Base tag injected by middleware
   - Must verify navigation maintains `/links` prefix
   - Test that direct URL access (e.g., typing `/links/business` in address bar) works correctly

3. **Key Test Cases**:
   - Landing on various URLs directly
   - Navigation between categories
   - Browser back/forward buttons
   - Handling of invalid URLs with proper redirects
   - Verify base tag injection in production build

## Technical Architecture

### Component Hierarchy
```
App.jsx
├── Category Navigation Buttons
├── Routes
│   ├── CategoryView
│   │   └── LinkList
│   │       ├── Sidebar (Tag Filters)
│   │       └── Link Items
│   └── Sources
│       └── Domain Groups
│           └── Expandable Link Lists
```

### State Management
- **App Level**:
  - `loadedCategories`: All category data
  - `isLoading`: Loading state
  - URL-based category selection

- **LinkList Level**:
  - `selectedTags`: Active tag filters (local state)
  - Computed `filteredLinks` based on tags

- **Sources Level**:
  - `domainStats`: Computed domain statistics
  - `expandedDomains`: Set of expanded domains (local state)

### Error Handling
1. **Invalid JSON**: Logged to console, file skipped
2. **Invalid Links**: Warned in console, link skipped
3. **Invalid URLs in Sources**: Warned in console, link excluded from domain stats
4. **Navigation Errors**: Invalid routes redirect to /all

## User Experience Guidelines

### Visual Hierarchy
1. Main title and subtitle
2. Category navigation buttons
3. Category-specific title
4. Content area (links or sources)
5. Sidebar for filtering (in LinkList view)

### Interaction Patterns
- **Single-click actions**: Category selection, tag filtering, domain expansion
- **External links**: Open in new tab (`target="_blank"`)
- **Visual feedback**: Active states for categories and tags
- **Responsive design**: Sidebar/content layout adapts to screen size

### Performance Considerations
- Asynchronous JSON loading with loading state
- Memoization opportunities for filtered/sorted data
- Lazy loading potential for large link collections
- Set operations for efficient tag deduplication

## Future Enhancement Opportunities

1. **Search Functionality**: Full-text search across titles and URLs
2. **Tag Management**: Tag creation, editing, and deletion interface
3. **Link Management**: CRUD operations for links
4. **Analytics**: Track click-through rates and popular links
5. **User Preferences**: Remember selected tags, preferred category
6. **Export/Import**: Backup and restore link collections
7. **Pagination**: Handle large link collections efficiently
8. **Link Validation**: Periodic URL health checks
9. **Social Features**: Share collections, collaborative categories
10. **Advanced Filtering**: Multiple filter criteria, date ranges
