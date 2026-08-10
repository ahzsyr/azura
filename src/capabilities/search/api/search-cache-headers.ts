import { NextResponse } from "next/server";

type SearchCacheProfile = "autocomplete" | "search" | "facets" | "discovery";

const CACHE_PROFILES: Record<
  SearchCacheProfile,
  { sMaxAge: number; staleWhileRevalidate: number }
> = {
  autocomplete: { sMaxAge: 30, staleWhileRevalidate: 60 },
  search: { sMaxAge: 30, staleWhileRevalidate: 60 },
  facets: { sMaxAge: 120, staleWhileRevalidate: 300 },
  discovery: { sMaxAge: 900, staleWhileRevalidate: 1800 },
};

export function withPublicSearchCacheHeaders(
  response: NextResponse,
  profile: SearchCacheProfile
): NextResponse {
  const { sMaxAge, staleWhileRevalidate } = CACHE_PROFILES[profile];
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  response.headers.set("Vary", "Accept-Encoding");
  return response;
}
