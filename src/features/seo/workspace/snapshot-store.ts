import "server-only";
import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type {
  SeoAuditSnapshot,
  SeoAuditSnapshotRecord,
  SeoSnapshotIndexEntry,
} from "./types";

const NAMESPACE = "seo-audit-snapshots";
const INDEX_KEY = "_index";
const LATEST_KEY = "_latest";
const MAX_SNAPSHOTS = 50;

type IndexPayload = { entries: SeoSnapshotIndexEntry[] };
type LatestPayload = { id: string };

function toIndexEntry(snapshot: SeoAuditSnapshot): SeoSnapshotIndexEntry {
  return {
    id: snapshot.id,
    completedAt: snapshot.completedAt,
    overallScore: snapshot.overallScore,
    status: snapshot.status,
    issueCounts: snapshot.issueCounts,
    durationMs: snapshot.durationMs,
  };
}

export const auditSnapshotStore = {
  async save(record: SeoAuditSnapshotRecord): Promise<void> {
    await jsonStoreService.set(
      NAMESPACE,
      record.snapshot.id,
      record as unknown as Prisma.InputJsonValue,
    );

    const index =
      (await jsonStoreService.get<IndexPayload>(NAMESPACE, INDEX_KEY)) ?? {
        entries: [],
      };
    const nextEntries = [
      toIndexEntry(record.snapshot),
      ...index.entries.filter((e) => e.id !== record.snapshot.id),
    ].slice(0, MAX_SNAPSHOTS);

    await jsonStoreService.set(NAMESPACE, INDEX_KEY, {
      entries: nextEntries,
    } as unknown as Prisma.InputJsonValue);

    if (record.snapshot.status === "completed") {
      await jsonStoreService.set(NAMESPACE, LATEST_KEY, {
        id: record.snapshot.id,
      } as unknown as Prisma.InputJsonValue);
    }

    // Best-effort prune old full records beyond index.
    const keep = new Set(nextEntries.map((e) => e.id));
    for (const stale of index.entries) {
      if (!keep.has(stale.id)) {
        await jsonStoreService.delete(NAMESPACE, stale.id).catch(() => undefined);
      }
    }
  },

  async get(id: string): Promise<SeoAuditSnapshotRecord | null> {
    return jsonStoreService.get<SeoAuditSnapshotRecord>(NAMESPACE, id);
  },

  async getLatestId(): Promise<string | null> {
    const latest = await jsonStoreService.get<LatestPayload>(NAMESPACE, LATEST_KEY);
    return latest?.id ?? null;
  },

  async getLatest(): Promise<SeoAuditSnapshotRecord | null> {
    const id = await this.getLatestId();
    if (!id) return null;
    return this.get(id);
  },

  async list(limit = 30): Promise<SeoSnapshotIndexEntry[]> {
    const index = await jsonStoreService.get<IndexPayload>(NAMESPACE, INDEX_KEY);
    return (index?.entries ?? []).slice(0, limit);
  },
};
