import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ensureWiredCmsPagesWithClient,
  type EnsureWiredCmsPagesResult,
} from "@/features/cms/ensure-wired-cms-pages-core";

export type { EnsureWiredCmsPagesResult };

/** Upsert all wired CMS page definitions and remove deprecated slugs. */
export async function ensureWiredCmsPages(): Promise<EnsureWiredCmsPagesResult> {
  return ensureWiredCmsPagesWithClient(prisma);
}
