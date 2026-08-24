"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pushRecentTopicId, readRecentTopicIds } from "@/features/help/lib/help-persistence";
import { helpRegistry } from "@/features/help/data/registry";
import type { HelpTopic } from "@/features/help/types";

export function useHelpRecentTopics(availableTopicIds: Set<string>) {
  const availabilityKey = useMemo(
    () => [...availableTopicIds].sort().join("|"),
    [availableTopicIds]
  );

  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const available = new Set(availabilityKey ? availabilityKey.split("|") : []);
    setIds(readRecentTopicIds().filter((id) => available.has(id)));
  }, [availabilityKey]);

  const record = useCallback(
    (topicId: string) => {
      const available = new Set(availabilityKey ? availabilityKey.split("|") : []);
      const next = pushRecentTopicId(topicId).filter((id) => available.has(id));
      setIds(next);
    },
    [availabilityKey]
  );

  const topics: HelpTopic[] = useMemo(
    () =>
      ids
        .map((id) => helpRegistry.topicsById.get(id))
        .filter((t): t is HelpTopic => Boolean(t)),
    [ids]
  );

  return { topics, record };
}
