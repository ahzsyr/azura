import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "opening_hours",
  version: 1,
  label: "Opening hours",
  description: "Business hours text block.",
  icon: "Clock",
  fields: { heading: true, body: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "opening_hours",
    enabled: true,
    title: "Hours",
    body: "Mon–Fri: 9am–6pm\nSat: 10am–4pm\nSun: Closed",
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
      <p className="whitespace-pre-line text-sm leading-relaxed text-background/70">{col.body}</p>
    </div>
  );
}

export const openingHoursServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
