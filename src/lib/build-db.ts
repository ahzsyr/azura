/**
 * When true, Prisma uses a stub during `next build` (avoids Supabase pool exhaustion
 * in compile workers). Prefer {@link isCompileTimeBuildWithoutDb} for empty ISR shells
 * so a leaked BUILD_WITHOUT_DB env at runtime cannot permanently blank pages.
 */
export function isBuildWithoutDb(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  return process.env.BUILD_WITHOUT_DB === "1";
}

/**
 * True only during the Next.js production build phase with BUILD_WITHOUT_DB.
 * Runtime requests must resolve real content / fallbacks even if the env var leaks.
 */
export function isCompileTimeBuildWithoutDb(): boolean {
  if (!isBuildWithoutDb()) return false;
  return process.env.NEXT_PHASE === "phase-production-build";
}
