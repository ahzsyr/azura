import type { StatusBoardBlockInput, StatusBoardPublic } from "./types";
import { getStatusBoardBySlugCached } from "@/services/data-loaders";

export async function resolveStatusBoardForBlock(
  props: StatusBoardBlockInput
): Promise<StatusBoardPublic | null> {
  const slug = (props.statusBoardSlug ?? "").trim();
  if (!slug) return null;
  return getStatusBoardBySlugCached(slug);
}
