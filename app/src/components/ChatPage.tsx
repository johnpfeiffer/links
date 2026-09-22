import { Suspense, useMemo, useRef, useState } from "react";
import { Await, Link as RouterLink, useLocation, useRouteLoaderData } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { parseUrlPath } from "../lib/parseUrlPath";
import {
  CHAT_API_PATH,
  DECISIONS_API_PATH,
  MAX_CHAT_RECOMMENDATION_ANSWERS,
  buildChatPrompt,
  buildJevRequest,
  chatIsDisabled,
  parseChatRecommendations,
  parseJevRecommendations,
} from "../models/chat";
import Loading from "./Loading";
import { isJsonRecord } from "../types";
import type {
  ChatRecommendation,
  ChatResponse,
  ChatTurn,
  JsonRecord,
  LinkRecord,
  RecommendationEngine,
  RootLoaderData,
} from "../types";

function appFromChatPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "_chat") {
    return "";
  }

  if (segments[1] === "_chat") {
    try {
      return decodeURIComponent(segments[0] ?? "");
    } catch {
      return segments[0] ?? "";
    }
  }

  return parseUrlPath(pathname).app;
}

function buildTagsPath(app: string): string {
  const trimmedApp = String(app ?? "").trim();
  return trimmedApp ? `/${encodeURIComponent(trimmedApp)}/tags` : "/tags";
}

async function readResponseJson(response: Response): Promise<ChatResponse> {
  try {
    const payload: unknown = await response.json();
    if (!isJsonRecord(payload)) return {};
    return {
      ...(typeof payload.message === "string" ? { message: payload.message } : {}),
      ...(typeof payload.interactionId === "string" ? { interactionId: payload.interactionId } : {}),
      ...(typeof payload.error === "string" ? { error: payload.error } : {}),
    };
  } catch {
    return {};
  }
}

async function readJsonRecord(response: Response): Promise<JsonRecord> {
  try {
    const payload: unknown = await response.json();
    return isJsonRecord(payload) ? payload : {};
  } catch {
    return {};
  }
}

function RecommendationLinks({ recommendations }: { recommendations: ChatRecommendation[] }) {
  return (
    <Stack spacing={2}>
      {recommendations.map((recommendation, recommendationIndex) => (
        <Box key={`recommendation-${recommendationIndex}`}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Recommendation {recommendationIndex + 1}
          </Typography>
          <Stack component="ul" spacing={1} sx={{ m: 0, pl: 3 }}>
            {recommendation.links.map((link) => (
              <Box component="li" key={link.id}>
                <MuiLink href={link.url} target="_blank" rel="noreferrer" underline="hover">
                  {link.description ?? link.name}
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  {link.name}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function ChatExperience({ links }: { links: LinkRecord[] }) {
  const location = useLocation();
  const app = appFromChatPath(location.pathname);
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [previousInteractionId, setPreviousInteractionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const recommendationCount = turns.length;
  const disabled = chatIsDisabled(recommendationCount);
  const sortedLinks = useMemo(() => (Array.isArray(links) ? links : []), [links]);

  async function requestRecommendations(engine: RecommendationEngine): Promise<void> {
    const originalMessage = message;
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(engine === "LLM" ? CHAT_API_PATH : DECISIONS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          engine === "LLM"
            ? {
                message: buildChatPrompt({
                  message: trimmedMessage,
                  links: sortedLinks,
                }),
                ...(previousInteractionId
                  ? { previousInteractionId }
                  : {}),
              }
            : buildJevRequest({
                message: originalMessage,
                links: sortedLinks,
              })
        ),
      });
      let recommendations: ChatRecommendation[];

      if (engine === "LLM") {
        const body = await readResponseJson(response);
        if (!response.ok) {
          throw new Error(body.error || "Chat request failed");
        }
        recommendations = parseChatRecommendations(body.message, sortedLinks);
        if (recommendations.length === 0) {
          throw new Error("No grounded recommendations were returned.");
        }

        if (typeof body.interactionId === "string" && body.interactionId.trim()) {
          setPreviousInteractionId(body.interactionId.trim());
        }
      } else {
        const body = await readJsonRecord(response);
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : "Decisions request failed"
          );
        }
        const result = parseJevRecommendations(body, sortedLinks);
        if (result.noStrongMatch) {
          setNotice("No strong match found");
          return;
        }
        recommendations = result.recommendations;
        if (recommendations.length === 0) {
          throw new Error("No grounded recommendations were returned.");
        }
      }

      setTurns((current) => [
        {
          id: `${Date.now()}-${current.length}`,
          question: trimmedMessage,
          engine,
          recommendations,
        },
        ...current,
      ]);
      setMessage("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : engine === "LLM"
            ? "Chat request failed"
            : "Decisions request failed"
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await requestRecommendations("LLM");
  }

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
              Link chat
            </Typography>
            <Button component={RouterLink} to={buildTagsPath(app)} variant="outlined" size="small">
              Back to links
            </Button>
          </Box>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Ask for recommendations based on a top or scenario...
            </Typography>
            <TextField
              label="Ask for links"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              multiline
              minRows={3}
              disabled={disabled || submitting}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button
                type="submit"
                variant="contained"
                disabled={!message.trim() || disabled || submitting}
              >
                Ask LLM
              </Button>
              <Button
                type="button"
                variant="outlined"
                disabled={!message.trim() || disabled || submitting}
                onClick={() => void requestRecommendations("Jev")}
              >
                Ask Jev
              </Button>
              <Typography variant="body2" color="text.secondary">
                Recommendations used: {recommendationCount} / {MAX_CHAT_RECOMMENDATION_ANSWERS}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {submitting ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Getting recommendations...
            </Typography>
          </Box>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {notice ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            {notice}
          </Alert>
        ) : null}

        {turns.length > 0 ? <Divider sx={{ my: 3 }} /> : null}

        <Stack spacing={3}>
          {turns.map((turn) => (
            <Box key={turn.id}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {turn.question}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Engine: {turn.engine}
              </Typography>
              <RecommendationLinks recommendations={turn.recommendations} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}

export default function ChatPage() {
  const loaderData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const links = loaderData?.links ?? [];

  return (
    <Suspense fallback={<Loading message="Loading chat..." />}>
      <Await resolve={links}>
        {(loadedLinks: LinkRecord[]) => <ChatExperience links={loadedLinks} />}
      </Await>
    </Suspense>
  );
}
