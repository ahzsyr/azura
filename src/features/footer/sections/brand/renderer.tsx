import type { SectionRenderProps } from "../types";
import { cn } from "@/lib/utils";

export function BrandRenderer({ column: col, ctx }: SectionRenderProps) {
  const { brandName, tagline, company, resolved, compact } = ctx;
  return (
    <div className={resolved.layout === "centered" ? "" : "sm:col-span-1"}>
      <h3 className="font-heading text-xl font-semibold text-accent">{brandName}</h3>
      {tagline ? (
        <p className="mt-3 text-sm leading-relaxed text-background/70">{tagline}</p>
      ) : null}
      {company?.email ? (
        <p className="mt-2 text-sm text-background/70">
          <a href={`mailto:${company.email}`} className="hover:text-accent">
            {company.email}
          </a>
        </p>
      ) : null}
      {col.body ? (
        <p className={cn("mt-2 text-sm text-background/60", compact && "text-xs")}>{col.body}</p>
      ) : null}
    </div>
  );
}
