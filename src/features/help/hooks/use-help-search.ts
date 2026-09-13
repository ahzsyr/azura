"use client";

import { useMemo, useState } from "react";
import { createHelpSearchEngine } from "@/features/help/lib/create-search-engine";
import { getAvailableRegistryView } from "@/features/help/lib/filter-help";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpSearchHit } from "@/features/help/types";

export function useHelpSearch() {
  const [query, setQuery] = useState("");

  const view = useMemo(() => getAvailableRegistryView(helpRegistry), []);

  const engine = useMemo(() => {
    // Search against profile-filtered snapshot by rebuilding a thin registry-like object
    const filteredRegistry = {
      ...helpRegistry,
      sections: view.sections,
      workflows: view.workflows,
      checklists: view.checklists,
      faqs: view.faqs,
      troubleshooting: view.troubleshooting,
    };
    return createHelpSearchEngine(filteredRegistry);
  }, [view]);

  const hits: HelpSearchHit[] = useMemo(() => {
    if (!query.trim()) return [];
    return engine.search(query);
  }, [engine, query]);

  return { query, setQuery, hits, view };
}
