
# Routing and Navigation
The URL the user entered drives this SPA application.

https://example.com/links/ is the production domain name and application name "links"

https://example.com/links//engineering/architecture should display on the screen only those links that match:

domain: "example.com"
app: "links"
filters: "engineering", "architecture"


# Data

A `Link` is the core data model and represents an individual web resource with the following properties:

- **id**: Unique identifier (auto-generated using timestamp + random number if not provided)
- **url**: The web URL of the resource (required)
- **title**: Display title for the link (required)
- **tags**: A list of quoted strings, each string represents an association or "label/tag" of this URL (at least one is required)

## Data Validation
- Each link must have a unique id for React rendering
- Links without `url` or `title` or `tags` fields are skipped during loading
- Invalid links generate console warnings but don't break the application
- Invalid tags generate console warnings but don't break the application

# Display
- The application should show "Loading" while waiting for the Links content to load

Show the list of all links: their title as a clickable url, the tags below

