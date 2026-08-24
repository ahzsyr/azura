import type { SectionResolveContext } from "../types";
import { baseResolvedColumn } from "../shared";
import { resolveMenuLinks } from "../resolve-menu-links";

export function resolveMenu(ctx: SectionResolveContext) {
  const links = resolveMenuLinks(ctx.column, ctx.headerWorkspace, ctx.catalog);
  return baseResolvedColumn(ctx.column, { links });
}
