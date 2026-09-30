import { loadLegacyEntityShape } from "@/features/portal/lib/portal-translation";

export async function loadAdminDisplayTitle(
  entityType: string,
  entityId: string,
  field = "title",
  fallback = ""
): Promise<string> {
  const legacy = await loadLegacyEntityShape(entityType, entityId, [field]);
  return legacy[`${field}En`]?.trim() || legacy[`${field}_en`]?.trim() || fallback;
}
