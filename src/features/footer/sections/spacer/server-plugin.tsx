import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "spacer",
  version: 1,
  label: "Spacer",
  description: "Add vertical spacing between footer sections.",
  icon: "MoveVertical",
  fields: { visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return { id: newSectionId(), type: "spacer", enabled: true, height: 48, ...partial };
}

function validate(_column: FooterColumn): string | null { return null; }
function resolve(ctx: SectionResolveContext) { return baseResolvedColumn(ctx.column); }
function Renderer({ column }: SectionRenderProps) {
  return <div aria-hidden="true" style={{ height: column.height ?? 48 }} />;
}

export const spacerServerPlugin = { ...metadata, createDefault, validate, resolve, Renderer };
