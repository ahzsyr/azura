/** Next.js throws these from notFound() and redirect(); callers must rethrow them. */
export function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest.startsWith("NEXT_REDIRECT"))
  );
}
