import { Suspense, useEffect } from "react";
import {
  Await,
  Link as RouterLink,
  useLocation,
  useNavigate,
  useRouteLoaderData,
} from "react-router-dom";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { parseUrlPath } from "../lib/parseUrlPath";
import { collectTags, filterLinksByTags } from "../models/links";
import { buildTagFilterPath, buildTagsPath } from "../models/tags";
import FavoriteTagsSection from "./FavoriteTagsSection";
import LinksSection from "./LinksSection";
import Loading from "./Loading";
import type { LinkRecord, RootLoaderData, TagRecord } from "../types";

function buildSourcesPath(app: string, tags: readonly TagRecord[] = []): string {
  return buildTagFilterPath(app, tags, "sources");
}

function buildChatPath(app: string): string {
  const trimmedApp = String(app ?? "").trim();
  return trimmedApp ? `/${encodeURIComponent(trimmedApp)}/_chat` : "/_chat";
}

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const loaderData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const links = loaderData?.links ?? [];
  const { app, tags } = parseUrlPath(location.pathname);

  useEffect(() => {
    const canonicalPath = buildTagsPath(app, tags);
    const nextPath = `${canonicalPath}${location.search}${location.hash}`;
    if (nextPath !== `${location.pathname}${location.search}${location.hash}`) {
      navigate(nextPath, { replace: true });
    }
  }, [app, tags, location.pathname, location.search, location.hash, navigate]);

  return (
    <Container maxWidth={false} sx={{ width: "90%", mx: "auto", py: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              John's favorite links
            </Typography>
            <Stack spacing={1} sx={{ alignItems: "flex-end" }}>
              <Button
                component={RouterLink}
                to={buildSourcesPath(app, tags)}
                variant="outlined"
                size="small"
              >
                Sources
              </Button>
              <Button
                component={RouterLink}
                to={buildChatPath(app)}
                variant="contained"
                size="small"
              >
                Ask for Recommendations
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            A hand picked list of links for podcasts, blogs, and resources for Software Engineers, People Managers, and people who love to learn =)
          </Typography>
        </Box>
        <Suspense fallback={<Loading message="Loading categories and links..." />}>
          <Await resolve={links}>
            {(loadedLinks: LinkRecord[]) => {
              const allTags = collectTags(loadedLinks);
              const tagByKey = new Map(allTags.map((tag) => [tag.key, tag]));
              const enabledTags = tags.map((tag) => tagByKey.get(tag.key) ?? tag);
              const filteredLinks = filterLinksByTags(loadedLinks, enabledTags);

              return (
                <>
                  <FavoriteTagsSection app={app} enabledTags={enabledTags} />
                  <LinksSection
                    app={app}
                    links={filteredLinks}
                    enabledTags={enabledTags}
                    tags={allTags}
                  />
                </>
              );
            }}
          </Await>
        </Suspense>
      </Paper>
    </Container>
  );
}
