import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
} from "@/features/translation/workspace-entity-ids";
import type { FooterWorkspace } from "./types";

export function collectFooterTranslationRefs(
  ws: FooterWorkspace,
): { entityType: string; entityId: string }[] {
  const refs: { entityType: string; entityId: string }[] = [
    { entityType: "Footer", entityId: makeFooterEntityId() },
  ];

  for (const col of ws.columns ?? []) {
    refs.push({ entityType: "FooterColumn", entityId: makeFooterColumnEntityId(col.id) });
    (col.links ?? []).forEach((_, index) => {
      refs.push({
        entityType: "FooterLink",
        entityId: makeFooterLinkEntityId(col.id, String(index)),
      });
    });
  }

  return refs;
}
