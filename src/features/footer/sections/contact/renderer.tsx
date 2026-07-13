import { Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionRenderProps } from "../types";

export function ContactRenderer({ column: col, ctx }: SectionRenderProps) {
  const { company, address, headingClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul className="space-y-3 text-sm text-background/70">
        {col.showPhone && company?.phone ? (
          <li className="flex items-center gap-2 justify-start">
            <Phone className="h-4 w-4 shrink-0 text-accent" />
            {company.phone}
          </li>
        ) : null}
        {col.showEmail && company?.email ? (
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-accent" />
            {company.email}
          </li>
        ) : null}
        {col.showAddress && address ? (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {address}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
