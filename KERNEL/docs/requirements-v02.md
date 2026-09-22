
# Design and Links Display

The application is for displaying links, and as a feature can filter by tags

1. Initially and asynchronously load all the of the content (links from JSON files)
2. When not provided a filter (tags), display a list of all of the links and tags
3. Loaded links are filtered by the tags that have been input into the url

Example: https://example.com/links/ai/podcast should display on the screen only links that have both the tag "ai" and the tag "podcast"

With simplest usage of material-ui, improve how the app looks
- plain white background for the page, the tags should be white background
- font should be 16px for better readability
- should use at least 90% of the screen width, but be friendly to being resized and mobile screen sizes
- tags should be with a white background

Prefer ascii over icons and images - therefore making it maximally performant and compatible

## Modularity and Clarity - Links Model

Before the listing of Links, list all tags at the top. Since "all tags" is long and distracting have them in an expander "show all tags"

At the top, right before the list of links, display the count (the number in bold) of how many links are currently visible

The application needs a "model" with a dedicated file that defines the Link object

- Good encapsulation means loading links from a file should be functionality in that model

