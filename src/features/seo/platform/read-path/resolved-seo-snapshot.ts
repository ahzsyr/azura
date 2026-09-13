import "server-only";

import { createCached, CACHE_TAGS } from "@/services/cache";
import { seoPlatform } from "../seo-platform.impl";
import { createExecutionContext } from "../execution-context";
import type { ResolvedSeoSnapshot } from "../types";

const SOURCE_VERSION = "platform-1";

export async function buildResolvedSeoSnapshot(
  entityType: string,
  entityId: string,
  locale: string
): Promise<ResolvedSeoSnapshot> {
  const ctx = createExecutionContext({
    entityType,
    entityId,
    locale,
    source: "api",
    trigger: "audit",
    mode: "preview",
  });

  const snapshot = await seoPlatform.content.analyze(ctx);
  const suggestion = await seoPlatform.intelligence.generate(ctx, snapshot);
  const validation = await seoPlatform.governance.validate(ctx, { snapshot, suggestion });

  return Object.freeze({
    entityType,
    entityId,
    localeCode: locale,
    suggestion,
    validation,
    generatedAt: new Date().toISOString(),
    sourceVersion: SOURCE_VERSION,
  });
}

export async function loadResolvedSeoSnapshot(
  entityType: string,
  entityId: string,
  locale: string
): Promise<ResolvedSeoSnapshot> {
  const loader = createCached(
    () => buildResolvedSeoSnapshot(entityType, entityId, locale),
    ["seo-snapshot", entityType, entityId, locale],
    {
      tags: [
        CACHE_TAGS.seoMeta(entityType, entityId),
        CACHE_TAGS.seoMeta(entityType, entityId, locale),
      ],
      revalidate: 3600,
    }
  );
  return loader();
}
