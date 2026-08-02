import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "custom_html",
  version: 1,
  label: "Custom HTML",
  description: "Advanced raw HTML block (use with care).",
  icon: "Code",
  fields: { heading: true, body: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "custom_html",
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

function Renderer({ column: col }: SectionRenderProps) {
  if (!col.body) return null;
  return (
    <div
      className="text-sm text-background/70"
      // Trusted admin content only
      dangerouslySetInnerHTML={{ __html: col.body }}
    />
  );
}

export const customHtmlServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
