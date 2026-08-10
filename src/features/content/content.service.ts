import { ensureBuiltinContentTypes } from "@/features/content/content-data.service";

/** Ensures built-in content types exist in the database. */
export async function ensureContentPlatformReady() {
  await ensureBuiltinContentTypes();
}

export const contentService = {
  ensureReady: ensureContentPlatformReady,
};
