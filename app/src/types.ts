export interface TagRecord {
  label: string;
  key: string;
}

export type TagRouteNamespace = "tags" | "sources";

export interface LinkRecord {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: TagRecord[];
  createdAt: string;
  published: string | null;
}

export interface ParsedUrlPath {
  app: string;
  routeNamespace: "default" | TagRouteNamespace;
  view: "links" | "sources";
  tags: TagRecord[];
}

export interface SourceStat {
  domain: string;
  count: number;
  links: LinkRecord[];
}

export interface ChatRecommendation {
  links: LinkRecord[];
}

export interface ChatTurn {
  id: string;
  question: string;
  recommendations: ChatRecommendation[];
}

export interface ChatResponse {
  message?: string;
  interactionId?: string;
  error?: string;
}

export interface RootLoaderData {
  links: Promise<LinkRecord[]>;
}

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}
