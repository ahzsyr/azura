import type { RevisionRecord } from "../types";
import { createEntityUuid } from "../entity-graph/ids";

export function createRevisionStore() {
  const revisions = new Map<string, RevisionRecord[]>();

  function create(input: {
    targetType: RevisionRecord["targetType"];
    targetId: string;
    summary: string;
    before: unknown;
    after: unknown;
    actor?: string | null;
  }): RevisionRecord {
    const revision: RevisionRecord = {
      id: createEntityUuid(),
      targetType: input.targetType,
      targetId: input.targetId,
      createdAt: new Date().toISOString(),
      actor: input.actor ?? null,
      summary: input.summary,
      before: input.before,
      after: input.after,
    };
    const list = revisions.get(input.targetId) ?? [];
    list.unshift(revision);
    revisions.set(input.targetId, list);
    return revision;
  }

  function list(targetId: string): RevisionRecord[] {
    return revisions.get(targetId) ?? [];
  }

  function get(revisionId: string): RevisionRecord | null {
    for (const list of revisions.values()) {
      const found = list.find((r) => r.id === revisionId);
      if (found) return found;
    }
    return null;
  }

  /** Returns the `before` snapshot for one-click rollback. */
  function rollback(revisionId: string): { revision: RevisionRecord; restoreValue: unknown } | null {
    const revision = get(revisionId);
    if (!revision) return null;
    create({
      targetType: revision.targetType,
      targetId: revision.targetId,
      summary: `Rollback to ${revision.id}`,
      before: revision.after,
      after: revision.before,
      actor: revision.actor,
    });
    return { revision, restoreValue: revision.before };
  }

  function diffSummary(revision: RevisionRecord): { changed: boolean; summary: string } {
    const before = JSON.stringify(revision.before);
    const after = JSON.stringify(revision.after);
    return {
      changed: before !== after,
      summary: revision.summary,
    };
  }

  return { create, list, get, rollback, diffSummary };
}

export type RevisionStore = ReturnType<typeof createRevisionStore>;
