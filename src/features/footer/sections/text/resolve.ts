import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";

export function resolveText(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}
