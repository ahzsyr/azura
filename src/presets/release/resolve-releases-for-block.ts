import type { ReleaseSetPublic, ReleasesBlockInput } from "./types";
import { getReleaseSetBySlugCached } from "@/services/data-loaders";

export async function resolveReleasesForBlock(
  props: ReleasesBlockInput
): Promise<ReleaseSetPublic | null> {
  const slug = (props.releaseSetSlug ?? "").trim();
  if (!slug) return null;
  return getReleaseSetBySlugCached(slug);
}
