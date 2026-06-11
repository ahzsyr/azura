/** When true, Prisma uses a stub during `next build` only (Hostinger invalid/missing DATABASE_URL). */
export function isBuildWithoutDb(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  if (process.env.NEXT_PHASE !== "phase-production-build") return false;
  return process.env.BUILD_WITHOUT_DB === "1";
}
