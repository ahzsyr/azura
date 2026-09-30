import { getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SectionRenderProps } from "../types";

export function MenuRenderer({ column: col, ctx }: SectionRenderProps) {
  if (!col.links.length) return null;
  const { locale, headingClass, linkClass } = ctx;
  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul className="space-y-2">
        {col.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            {link.openInNewTab ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {link.label}
              </a>
            ) : (
              <a href={getPathname({ locale, href: link.href })} className={linkClass}>
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
