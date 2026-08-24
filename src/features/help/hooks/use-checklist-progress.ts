"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deriveChecklistProgress,
  readChecklistProgress,
  writeChecklistProgress,
} from "@/features/help/lib/checklist-storage";
import { trackHelpEvent } from "@/features/help/lib/analytics";
import type { HelpChecklist, HelpChecklistProgress } from "@/features/help/types";

export function useChecklistProgress(checklist: HelpChecklist) {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  useEffect(() => {
    setCheckedIds(readChecklistProgress(checklist.id));
  }, [checklist.id]);

  const progress: HelpChecklistProgress = useMemo(
    () => deriveChecklistProgress(checklist, checkedIds),
    [checklist, checkedIds]
  );

  const toggle = useCallback(
    (itemId: string) => {
      setCheckedIds((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId];
        writeChecklistProgress(checklist.id, next);
        const derived = deriveChecklistProgress(checklist, next);
        if (derived.total > 0 && derived.completed === derived.total) {
          trackHelpEvent({ name: "checklist_completed", checklistId: checklist.id });
        }
        window.dispatchEvent(new Event("help-checklist-updated"));
        return next;
      });
    },
    [checklist]
  );

  return { progress, checkedIds, toggle };
}
