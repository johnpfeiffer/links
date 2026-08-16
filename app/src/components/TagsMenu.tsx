import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { buildTagTogglePath } from "../models/tags";
import type { TagRecord, TagRouteNamespace } from "../types";
import AllTagsSection from "./AllTagsSection";

export default function TagsMenu({
  app,
  enabledTags,
  linkCount,
  routeNamespace,
  tags,
}: {
  app: string;
  enabledTags: TagRecord[];
  linkCount: number;
  routeNamespace: TagRouteNamespace;
  tags: TagRecord[];
}) {
  return (
    <Box data-testid="tag-filters">
      <AllTagsSection
        app={app}
        enabledTags={enabledTags}
        routeNamespace={routeNamespace}
        tags={tags}
      />
      {enabledTags.length > 0 ? (
        <Box
          data-testid="selected-tags"
          sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            Filtered by
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", alignItems: "center" }}
          >
            {enabledTags.map((tag) => (
              <Chip
                key={tag.key}
                label={tag.label}
                size="small"
                variant="outlined"
                color="primary"
                clickable
                component={RouterLink}
                to={buildTagTogglePath(app, enabledTags, tag, routeNamespace)}
                sx={{ bgcolor: "common.white" }}
              />
            ))}
          </Stack>
        </Box>
      ) : null}
      <Typography data-testid="link-count" variant="subtitle2" sx={{ mb: 2 }}>
        Showing <b>{linkCount}</b> links
      </Typography>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
