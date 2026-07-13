import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "trust",
  version: 1,
  label: "Trust badges",
  description: "Security and service trust signals.",
  icon: "Shield",
  fields: { heading: true, links: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "trust",
    enabled: true,
    title: "Why shop with us",
    links: [
      { label: "Secure checkout", href: "#" },
      { label: "Free shipping", href: "#" },
      { label: "Easy returns", href: "#" },
    ],
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
  const { headingClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul className="space-y-2 text-sm text-background/70">
        {col.links.map((link) => (
          <li key={link.label}>{link.label}</li>
        ))}
      </ul>
    </div>
  );
}

export const trustServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
