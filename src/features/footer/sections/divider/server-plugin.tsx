import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "divider",
  version: 1,
  label: "Divider",
  description: "Separate footer sections with a horizontal line.",
  icon: "Minus",
  fields: { visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return { id: newSectionId(), type: "divider", enabled: true, style: "solid", ...partial };
}

function validate(_column: FooterColumn): string | null { return null; }
function resolve(ctx: SectionResolveContext) { return baseResolvedColumn(ctx.column); }
function Renderer({ column }: SectionRenderProps) {
  return (
    <hr
      className={
        column.style === "gold"
          ? "my-8 w-16 mx-auto border-t-2 border-accent"
          : column.style === "dashed"
            ? "my-8 border-dashed border-border"
            : "my-8 border-border"
      }
      aria-hidden="true"
    />
  );
}

export const dividerServerPlugin = { ...metadata, createDefault, validate, resolve, Renderer };
