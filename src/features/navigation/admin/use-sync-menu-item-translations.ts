"use client";

import { useCallback } from "react";
import type { MenuItem } from "@/features/navigation/types";
import { makeMenuItemEntityId } from "@/features/translation/workspace-entity-ids";
import { useWorkspaceTranslationsOptional } from "@/features/translation/workspace-translation-context";

const SYNC_FIELDS = ["label", "badgeText", "cardSubtitle"] as const;
type SyncField = (typeof SYNC_FIELDS)[number];

function fieldValueFromPatch(patch: Partial<MenuItem>, field: SyncField): string | undefined {
  if (!(field in patch)) return undefined;
  const raw = patch[field as keyof MenuItem];
  if (raw == null) return "";
  return typeof raw === "string" ? raw : "";
}

/** Keep menu JSON and default-locale EntityTranslation overrides in sync when label changes outside localized fields. */
export function useSyncMenuItemTranslations(menuKey: string) {
  const ctx = useWorkspaceTranslationsOptional();

  return useCallback(
    (itemId: string, patch: Partial<MenuItem>) => {
      if (!ctx) return;
      const entityId = makeMenuItemEntityId(menuKey, itemId);
      for (const field of SYNC_FIELDS) {
        const value = fieldValueFromPatch(patch, field);
        if (value === undefined) continue;
        ctx.setFieldValue("MenuItem", entityId, field, ctx.defaultLocaleCode, value);
      }
    },
    [ctx, menuKey],
  );
}
