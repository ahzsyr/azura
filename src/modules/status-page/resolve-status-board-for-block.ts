import type { StatusBoardBlockInput, StatusBoardPublic } from "./types";
import { getStatusBoardBySlugCached } from "@/services/data-loaders";
import { isModuleActive } from "./module-profile";

export async function resolveStatusBoardForBlock(
  props: StatusBoardBlockInput
): Promise<StatusBoardPublic | null> {
  if (!(await isModuleActive())) return null;
  const slug = (props.statusBoardSlug ?? "").trim();
  if (!slug) return null;
  return getStatusBoardBySlugCached(slug);
}
