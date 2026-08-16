import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  buildTagTogglePath,
  isTagEnabled,
} from "../models/tags";
import type { TagRecord, TagRouteNamespace } from "../types";

export default function AllTagsSection({
  app,
  enabledTags,
  routeNamespace = "tags",
  tags,
}: {
  app: string;
  enabledTags: TagRecord[];
  routeNamespace?: TagRouteNamespace;
  tags: TagRecord[];
}) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion
        disableGutters
        elevation={0}
        expanded={tagsExpanded}
        onChange={(_, expanded) => setTagsExpanded(expanded)}
        sx={{ bgcolor: "transparent" }}
      >
        <AccordionSummary
          expandIcon={
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {tagsExpanded ? "v" : ">"}
            </Typography>
          }
          sx={{
            cursor: "pointer",
            flexDirection: "row-reverse",
            gap: 1,
            justifyContent: "flex-end",
            "& .MuiAccordionSummary-content": { alignItems: "center" },
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {tagsExpanded ? "Hide all tags" : "Show all tags"}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {tags.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tags available
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {tags.map((tag) => {
                const enabled = isTagEnabled(enabledTags, tag);
                const to = buildTagTogglePath(app, enabledTags, tag, routeNamespace);

                return (
                  <Chip
                    key={tag.key}
                    label={tag.label}
                    size="small"
                    variant="outlined"
                    color={enabled ? "primary" : "default"}
                    clickable
                    component={RouterLink}
                    to={to}
                    sx={{ bgcolor: "common.white" }}
                  />
                );
              })}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
