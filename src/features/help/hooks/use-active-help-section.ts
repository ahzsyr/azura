"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readActiveSectionId,
  writeActiveSectionId,
} from "@/features/help/lib/help-persistence";
import { helpRegistry } from "@/features/help/data/registry";

function sectionIdFromHash(hashId: string | null, available: string[]): string | null {
  if (!hashId) return null;
  if (available.includes(hashId)) return hashId;
  const fromTopic = helpRegistry.topicSectionId.get(hashId);
  if (fromTopic && available.includes(fromTopic)) return fromTopic;
  if (helpRegistry.checklistsById.has(hashId)) {
    const gettingStarted = "section-getting-started";
    if (available.includes(gettingStarted)) return gettingStarted;
  }
  return null;
}

/**
 * Priority: URL hash → last opened section → Getting Started → first available.
 */
export function useActiveHelpSection(availableSectionIds: string[], hashId: string | null) {
  const [activeSectionId, setActiveSectionIdState] = useState<string>(
    () => availableSectionIds[0] ?? ""
  );

  const setActiveSectionId = useCallback(
    (sectionId: string) => {
      if (!availableSectionIds.includes(sectionId)) return;
      setActiveSectionIdState(sectionId);
      writeActiveSectionId(sectionId);
    },
    [availableSectionIds]
  );

  useEffect(() => {
    const fromHash = sectionIdFromHash(hashId, availableSectionIds);
    if (fromHash) {
      setActiveSectionIdState(fromHash);
      writeActiveSectionId(fromHash);
      return;
    }

    const stored = readActiveSectionId();
    if (stored && availableSectionIds.includes(stored)) {
      setActiveSectionIdState(stored);
      return;
    }

    const preferred = availableSectionIds.includes("section-getting-started")
      ? "section-getting-started"
      : availableSectionIds[0];
    if (preferred) setActiveSectionIdState(preferred);
  }, [availableSectionIds, hashId]);

  return { activeSectionId, setActiveSectionId };
}
