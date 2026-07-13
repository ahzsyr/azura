import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "logos",
  version: 1,
  label: "Logos",
  description: "Partner or certification logo links.",
  icon: "Image",
  fields: { heading: true, links: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "logos",
    enabled: true,
    title: "Certifications",
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
      <ul className="flex flex-wrap gap-3">
        {col.links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={cn(linkClass, "text-xs")} target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const logosServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
