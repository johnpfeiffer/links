import { Box } from "@mui/material";
import LinksList from "./LinksList";
import TagsMenu from "./TagsMenu";
import type { LinkRecord, TagRecord } from "../types";

export default function LinksSection({ app, links, enabledTags, tags }: {
  app: string;
  links: LinkRecord[];
  enabledTags: TagRecord[];
  tags: TagRecord[];
}) {
  return (
    <Box>
      <TagsMenu
        app={app}
        enabledTags={enabledTags}
        linkCount={links.length}
        routeNamespace="tags"
        tags={tags}
      />
      <LinksList app={app} enabledTags={enabledTags} links={links} />
    </Box>
  );
}
