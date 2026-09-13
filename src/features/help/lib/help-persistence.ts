const ACTIVE_SECTION_KEY = "help.activeSection";
const RECENT_TOPICS_KEY = "help.recentTopics";
const MAX_RECENT = 3;

export function readActiveSectionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_SECTION_KEY);
  } catch {
    return null;
  }
}

export function writeActiveSectionId(sectionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_SECTION_KEY, sectionId);
  } catch {
    /* ignore quota */
  }
}

export function readRecentTopicIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentTopicId(topicId: string): string[] {
  const prev = readRecentTopicIds().filter((id) => id !== topicId);
  const next = [topicId, ...prev].slice(0, MAX_RECENT);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}
