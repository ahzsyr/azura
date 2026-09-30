import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "rich_text",
  version: 1,
  label: "Rich text",
  description: "Formatted text content with heading.",
  icon: "FileText",
  fields: { heading: true, body: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "rich_text",
    enabled: true,
    title: "",
    body: "",
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
  if (!col.body) return null;
  const { headingClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <div className="prose prose-invert prose-sm max-w-none text-background/70">{col.body}</div>
    </div>
  );
}

export const richTextServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
