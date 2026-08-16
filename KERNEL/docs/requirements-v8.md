# Sources View filtered by Tags

The main view has the ability to select and unselect tags, this functionality should also be available to the "Sources" view/module.

e.g. 
"Show all tags" (expands)
Filtered by TAGNAMES (which are selected, and can be unselected)
Showing N links

This means ensuring this is refactored as a re-usable concept/component across two different views - so that the behavior is consistent and easy to maintain.

## Cases

- With no tags selected, all articles are displayed (per the definition of the Sources view/module
- With each tag that is selected, only articles that have all of the tags are displayed (a progressive narrowing)
- When a tag is unselected, that filter is removed

