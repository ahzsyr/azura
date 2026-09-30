"use client";

import { useCallback, useEffect, useState } from "react";

export function useExpandedSections(options: {
  sectionIds: string[];
  hashTopicId: string | null;
  topicSectionId: Map<string, string>;
}) {
  const { sectionIds, hashTopicId, topicSectionId } = options;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());

  const expandSection = useCallback((sectionId: string) => {
    setExpanded((prev) => new Set(prev).add(sectionId));
    setLoaded((prev) => new Set(prev).add(sectionId));
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
    setLoaded((prev) => new Set(prev).add(sectionId));
  }, []);

  useEffect(() => {
    if (!hashTopicId) return;
    const sectionId = topicSectionId.get(hashTopicId);
    if (sectionId) expandSection(sectionId);
  }, [hashTopicId, topicSectionId, expandSection]);

  useEffect(() => {
    // Expand first section by default for empty hash
    if (!hashTopicId && sectionIds[0] && expanded.size === 0) {
      expandSection(sectionIds[0]);
    }
  }, [hashTopicId, sectionIds, expanded.size, expandSection]);

  return { expanded, loaded, toggleSection, expandSection };
}
