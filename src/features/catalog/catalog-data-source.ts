import "server-only";

/**
 * True when catalog data must use Supabase/Prisma only (no runtime filesystem JSON).
 */
export function useDatabaseOnlyCatalog(): boolean {
  return true;
}
