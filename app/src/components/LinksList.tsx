import {
  Box,
  Chip,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { buildTagTogglePath, isTagEnabled } from "../models/tags";
import type { LinkRecord, TagRecord } from "../types";

export default function LinksList({ app, enabledTags, links }: {
  app: string;
  enabledTags: TagRecord[];
  links: LinkRecord[];
}) {
  if (links.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No links found
      </Typography>
    );
  }

  const activeTags = Array.isArray(enabledTags) ? enabledTags : [];

  return (
    <List sx={{ p: 0 }}>
      {links.map((link) => (
        <ListItem
          key={link.id}
          sx={{ flexDirection: "column", alignItems: "flex-start", px: 0 }}
        >
          <ListItemText
            primary={
              <MuiLink
                href={link.url}
                target="_blank"
                rel="noreferrer"
                underline="hover"
              >
                {link.description ?? link.name}
              </MuiLink>
            }
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, pb: 1 }}>
            {link.keywords.map((tag) => {
              const enabled = isTagEnabled(activeTags, tag);
              const to = buildTagTogglePath(app, activeTags, tag);

              return (
                <Chip
                  key={`${link.id}-${tag.key}`}
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
          </Box>
        </ListItem>
      ))}
    </List>
  );
}
