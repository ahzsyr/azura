import type { IndexationLifecycleRecord, IndexationState, PublicEntityId } from "../types";

export function createIndexationLifecycleService() {
  const records = new Map<string, IndexationLifecycleRecord>();

  function transition(
    url: string,
    state: IndexationState,
    options?: { entityPublicId?: PublicEntityId; note?: string },
  ): IndexationLifecycleRecord {
    const now = new Date().toISOString();
    const existing = records.get(url);
    const history = existing?.history ?? [];
    history.push({ state, at: now, note: options?.note });
    const next: IndexationLifecycleRecord = {
      url,
      state,
      entityPublicId: options?.entityPublicId ?? existing?.entityPublicId,
      lastChangedAt: now,
      history,
    };
    records.set(url, next);
    return next;
  }

  return {
    transition,
    get(url: string) {
      return records.get(url) ?? null;
    },
    list(filter?: { state?: IndexationState }) {
      const all = [...records.values()];
      if (!filter?.state) return all;
      return all.filter((r) => r.state === filter.state);
    },
    alertUnexpected(previous: IndexationState, next: IndexationState): boolean {
      const invalid =
        (previous === "indexed" && next === "created") ||
        (previous === "retired" && next === "ranking") ||
        (previous === "indexed" && next === "error");
      return invalid;
    },
  };
}

export type IndexationLifecycleService = ReturnType<typeof createIndexationLifecycleService>;
