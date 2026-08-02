import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";

export function resolveLegal(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}
