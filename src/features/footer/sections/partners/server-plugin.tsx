import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "partners",
  version: 1,
  label: "Partners",
  description: "Partner brand links.",
  icon: "Handshake",
  fields: { heading: true, links: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "partners",
    enabled: true,
    title: "Partners",
    links: [],
    ...partial,
  };
}

function validate(_column: FooterColumn): string | null {
  return null;
}

function resolve(ctx: SectionResolveContext) {
  return baseResolvedColumn(ctx.column);
}

function Renderer({ column: col, ctx }: SectionRenderProps) {
  if (!col.links.length) return null;
  const { headingClass, linkClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul className="space-y-2">
        {col.links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={linkClass} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const partnersServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
