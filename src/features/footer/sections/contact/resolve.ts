import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";

export function resolveContact(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}
