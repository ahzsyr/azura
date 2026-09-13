import "server-only";

import { pluginSdk } from "../../plugin-sdk";
import { seoEventBus } from "../../event-bus/bus";
import type { ContentSnapshot, SeoExecutionContext } from "../../types";
import { snapshotResolver } from "../../services/snapshot.resolver";
import { descriptorFromContext } from "../../types/entity-descriptor";

export async function buildContentSnapshot(ctx: SeoExecutionContext): Promise<ContentSnapshot> {
  const descriptor = descriptorFromContext(
    ctx.entityType,
    ctx.entityId,
    ctx.locale,
    ctx.metadata
  );
  return snapshotResolver.buildSnapshot(ctx, descriptor);
}

/** @deprecated Use snapshotResolver via buildContentSnapshot */
export async function buildContentSnapshotLegacy(ctx: SeoExecutionContext): Promise<ContentSnapshot> {
  await seoEventBus.emit("snapshot.requested", { ctx });
  const snapshot = await buildContentSnapshot(ctx);
  await seoEventBus.emit("snapshot.built", { ctx, snapshot });
  return snapshot;
}
