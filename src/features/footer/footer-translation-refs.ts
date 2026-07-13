import {
  makeFooterColumnEntityId,
  makeFooterEntityId,
  makeFooterLinkEntityId,
} from "@/features/translation/workspace-entity-ids";
import { getServerPlugin } from "./sections/registry.server";
import type { FooterWorkspace } from "./types";

export function collectFooterTranslationRefs(
  ws: FooterWorkspace,
): { entityType: string; entityId: string }[] {
  const refs: { entityType: string; entityId: string }[] = [
    { entityType: "Footer", entityId: makeFooterEntityId() },
  ];

  for (const col of ws.columns ?? []) {
    const plugin = getServerPlugin(col.type);
    const fields = plugin?.fields ?? {};

    if (fields.heading || fields.body) {
      refs.push({ entityType: "FooterColumn", entityId: makeFooterColumnEntityId(col.id) });
    }

    if (fields.links) {
      (col.links ?? []).forEach((_, index) => {
        refs.push({
          entityType: "FooterLink",
          entityId: makeFooterLinkEntityId(col.id, String(index)),
        });
      });
    }
  }

  return refs;
}
