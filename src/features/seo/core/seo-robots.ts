import type { SeoHttpStatus, SeoRobotsDirective } from "./seo-document";

export type RobotsResolveInput = {
  visibility?: string | null;
  pageControls?: string | null;
  templateControls?: string | null;
  status: SeoHttpStatus;
};

const SNIPPET_DIRECTIVES = {
  maxSnippet: "max-snippet:-1",
  maxImagePreview: "max-image-preview:large",
  maxVideoPreview: "max-video-preview:-1",
} as const;

function tokenizeRobots(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function reconcileRobotsTokens(tokens: string[]): { index: "index" | "noindex"; follow: "follow" | "nofollow" } {
  const set = new Set(tokens);

  if (set.has("none")) {
    return { index: "noindex", follow: "nofollow" };
  }

  const index: "index" | "noindex" = set.has("noindex") ? "noindex" : "index";
  const follow: "follow" | "nofollow" = set.has("nofollow") ? "nofollow" : "follow";

  return { index, follow };
}

/**
 * Combine visibility, page, and template robots controls.
 * Most restrictive wins: noindex > index, nofollow > follow, none > nofollow/noindex.
 */
export function resolveRobots(input: RobotsResolveInput): SeoRobotsDirective | null {
  if (input.status === 404 || input.status === 410 || input.status === 500) {
    return null;
  }

  const combined = [
    ...tokenizeRobots(input.visibility),
    ...tokenizeRobots(input.pageControls),
    ...tokenizeRobots(input.templateControls),
  ];

  const { index, follow } = reconcileRobotsTokens(combined);

  return {
    index,
    follow,
    maxSnippet: SNIPPET_DIRECTIVES.maxSnippet,
    maxImagePreview: SNIPPET_DIRECTIVES.maxImagePreview,
    maxVideoPreview: SNIPPET_DIRECTIVES.maxVideoPreview,
  };
}

export function robotsDirectiveToContentString(robots: SeoRobotsDirective): string {
  return [
    robots.index,
    robots.follow,
    robots.maxSnippet,
    robots.maxImagePreview,
    robots.maxVideoPreview,
  ]
    .filter(Boolean)
    .join(", ");
}

export function isNoIndexRobots(robots: SeoRobotsDirective | null | undefined): boolean {
  return robots?.index === "noindex";
}
