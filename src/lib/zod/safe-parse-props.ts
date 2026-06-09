import type { ZodType } from "zod";
import { logServerRenderDiagnostic } from "@/lib/debug/server-render-log";

export function safeParseProps<T>(
  schema: ZodType<T>,
  raw: Record<string, unknown>,
  fallback: T,
  context: string,
): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    logServerRenderDiagnostic(context, result.error);
    return fallback;
  }
  return result.data;
}
