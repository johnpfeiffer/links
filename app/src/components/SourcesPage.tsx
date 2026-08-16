import { Suspense } from "react";
import {
  Await,
  Link as RouterLink,
  useLocation,
  useRouteLoaderData,
} from "react-router-dom";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { parseUrlPath } from "../lib/parseUrlPath";
import { collectTags, filterLinksByTags } from "../models/links";
import { buildTagsPath } from "../models/tags";
import Loading from "./Loading";
import SourcesSection from "./SourcesSection";
import TagsMenu from "./TagsMenu";
import type { LinkRecord, RootLoaderData } from "../types";

export default function SourcesPage() {
  const location = useLocation();
  const loaderData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const links = loaderData?.links ?? [];
  const { app, tags } = parseUrlPath(location.pathname);
  const homePath = buildTagsPath(app, []);

  return (
    <Container maxWidth={false} sx={{ width: "90%", mx: "auto", py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            component={RouterLink}
            to={homePath}
            variant="outlined"
            size="small"
          >
            Back to home
          </Button>
        </Box>
        <Suspense fallback={<Loading message="Loading sources..." />}>
          <Await resolve={links}>
            {(loadedLinks: LinkRecord[]) => {
              const allTags = collectTags(loadedLinks);
              const tagByKey = new Map(allTags.map((tag) => [tag.key, tag]));
              const enabledTags = tags.map((tag) => tagByKey.get(tag.key) ?? tag);
              const filteredLinks = filterLinksByTags(loadedLinks, enabledTags);

              return (
                <>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Content Sources
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Domains sorted by frequency of appearance
                  </Typography>
                  <TagsMenu
                    app={app}
                    enabledTags={enabledTags}
                    linkCount={filteredLinks.length}
                    routeNamespace="sources"
                    tags={allTags}
                  />
                  <SourcesSection links={filteredLinks} showHeading={false} />
                </>
              );
            }}
          </Await>
        </Suspense>
      </Paper>
    </Container>
  );
}
