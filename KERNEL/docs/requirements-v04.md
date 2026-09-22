
## Extending the Tag Filter Feature

Given the page has loaded and there is a listing of Links, where each Link its tags below it, https://example.com , "Example Tag"
When "Example Tag" is clicked (same behavior in both the "All Tags" and the LinksSection")
Then the new URL should be DOMAIN/APPNAME/example-tag

### Favorite Tags

Add a section above ShowAllTags that contains "Favorite and popular tags" and lists horizontally AI, Business, Engineering, History, People, Podcast
- The tags in this new section should behave the same as all other tags
- Always show this section even if there are no Links with those tags

