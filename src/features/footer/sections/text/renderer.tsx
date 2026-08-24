import { cn } from "@/lib/utils";
import type { SectionRenderProps } from "../types";

export function TextRenderer({ column: col, ctx }: SectionRenderProps) {
  if (!col.body) return null;
  const { headingClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <p className="text-sm leading-relaxed text-background/70">{col.body}</p>
    </div>
  );
}
