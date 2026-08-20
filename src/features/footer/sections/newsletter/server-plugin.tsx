import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "newsletter",
  version: 1,
  label: "Newsletter",
  description: "Email signup call-to-action with heading and link.",
  icon: "Mail",
  fields: { heading: true, body: true, links: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "newsletter",
    enabled: true,
    title: "Newsletter",
    body: "Subscribe for updates and offers.",
    links: [{ label: "Subscribe", href: "/newsletter" }],
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
  const cta = col.links[0];
  const { headingClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      {col.body ? <p className="mb-4 text-sm text-background/70">{col.body}</p> : null}
      {cta ? (
        <a
          href={cta.href}
          className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {cta.label}
        </a>
      ) : null}
    </div>
  );
}

export const newsletterServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
