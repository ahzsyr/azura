/** When true, Prisma uses a stub during `next build` (avoids Supabase pool exhaustion in compile workers). */
export function isBuildWithoutDb(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  return process.env.BUILD_WITHOUT_DB === "1";
}
