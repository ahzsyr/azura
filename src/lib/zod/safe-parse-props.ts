import type { output, ZodType } from "zod";
import { logServerRenderDiagnostic } from "@/lib/debug/server-render-log";

export function safeParseProps<S extends ZodType>(
  schema: S,
  raw: Record<string, unknown>,
  fallback: output<S>,
  context: string,
): output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    logServerRenderDiagnostic(context, result.error);
    return fallback;
  }
  return result.data;
}
