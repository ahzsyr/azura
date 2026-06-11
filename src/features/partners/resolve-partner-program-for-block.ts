import type { PartnerProgramBlockInput, PartnerProgramPublic } from "./types";
import { getPartnerProgramBySlugCached } from "@/services/data-loaders";

export async function resolvePartnerProgramForBlock(
  props: PartnerProgramBlockInput
): Promise<PartnerProgramPublic | null> {
  const slug = (props.partnerProgramSlug ?? "").trim();
  if (!slug) return null;
  return getPartnerProgramBySlugCached(
    slug,
    props.categorySlug,
    props.locationFilter,
    props.limit
  );
}
