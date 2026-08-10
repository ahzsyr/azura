import { cn } from "@/lib/utils";
import type { FooterColumn } from "../../types";
import type { FooterSectionMetadata, SectionRenderProps, SectionResolveContext } from "../types";
import { baseResolvedColumn, newSectionId } from "../shared";

const metadata: FooterSectionMetadata = {
  type: "payments",
  version: 1,
  label: "Payment methods",
  description: "Display accepted payment method labels.",
  icon: "CreditCard",
  fields: { heading: true, links: true, visibility: true },
};

function createDefault(partial?: Partial<FooterColumn>): FooterColumn {
  return {
    id: newSectionId(),
    type: "payments",
    enabled: true,
    title: "We accept",
    links: [
      { label: "Visa", href: "#" },
      { label: "Mastercard", href: "#" },
      { label: "PayPal", href: "#" },
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
      <ul className="flex flex-wrap gap-2 text-xs text-background/60">
        {col.links.map((link) => (
          <li key={link.label} className="rounded border border-background/20 px-2 py-1">
            {link.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const paymentsServerPlugin = {
  ...metadata,
  createDefault,
  validate,
  resolve,
  Renderer,
};
