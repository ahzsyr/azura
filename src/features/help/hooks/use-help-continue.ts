"use client";

import { useEffect, useState } from "react";
import { findInProgressChecklist } from "@/features/help/lib/topic-status";
import type { HelpChecklist, HelpChecklistProgress } from "@/features/help/types";

export function useHelpContinue(checklists: HelpChecklist[]) {
  const [state, setState] = useState<{
    checklist: HelpChecklist;
    progress: HelpChecklistProgress;
  } | null>(null);

  useEffect(() => {
    setState(findInProgressChecklist(checklists));
  }, [checklists]);

  // Re-read when storage may change (same tab checklist toggles fire storage? no — listen custom)
  useEffect(() => {
    const refresh = () => setState(findInProgressChecklist(checklists));
    window.addEventListener("help-checklist-updated", refresh);
    return () => window.removeEventListener("help-checklist-updated", refresh);
  }, [checklists]);

  return state;
}
