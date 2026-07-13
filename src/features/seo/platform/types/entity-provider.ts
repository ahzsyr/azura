import type { BulkEntityFilter } from "./autofill";
import type { ContentSnapshotDraft } from "../types";
import type { SeoEntityDescriptor, SeoEntityKind } from "./entity-descriptor";

export type SeoEntityProvider = Readonly<{
  kind: SeoEntityKind;
  buildSnapshot(descriptor: SeoEntityDescriptor): Promise<ContentSnapshotDraft>;
  listEntities?(filter: BulkEntityFilter): AsyncIterable<SeoEntityDescriptor>;
  countEntities?(filter: BulkEntityFilter): Promise<number>;
  displayName(descriptor: SeoEntityDescriptor): string;
  routing?(descriptor: SeoEntityDescriptor): { publicPath: string };
}>;
