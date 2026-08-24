import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import type { DocPortalPublic, DocSectionPublic } from "@/modules/documentation/types";

type Props = {
  locale: Locale;
  portal: DocPortalPublic;
  title?: string;
  subtitle?: string;
  layout?: "sidebar" | "tree" | "tabs";
  showBreadcrumbs?: boolean;
  showToc?: boolean;
  activeSectionSlug?: string;
  basePath?: string;
};

function buildTree(sections: DocSectionPublic[], parentId: string | null = null): DocSectionPublic[] {
  return sections
    .filter((s) => s.parentId === parentId)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function SectionTree({
  sections,
  all,
  locale,
  basePath,
  portalSlug,
  depth = 0,
}: {
  sections: DocSectionPublic[];
  all: DocSectionPublic[];
  locale: Locale;
  basePath: string;
  portalSlug: string;
  depth?: number;
}) {
  return (
    <ul className={cn("pb-docnav__tree", depth > 0 && "ps-4 border-s border-border mt-1")}>
      {sections.map((section) => {
        const children = buildTree(all, section.id);
        const href = section.href || `${basePath}/${portalSlug}/${section.slug}`;
        return (
          <li key={section.id} className="py-0.5">
            <Link
              href={href}
              className="text-sm hover:text-primary transition-colors"
            >
              {pickLocale(section, "title", locale)}
            </Link>
            {children.length > 0 && (
              <SectionTree
                sections={children}
                all={all}
                locale={locale}
                basePath={basePath}
                portalSlug={portalSlug}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DocumentationNavView({
  locale,
  portal,
  title,
  subtitle,
  layout = "sidebar",
  showBreadcrumbs = true,
  showToc = true,
  activeSectionSlug,
  basePath = "/docs",
}: Props) {
  const roots = buildTree(portal.sections);
  const active = activeSectionSlug
    ? portal.sections.find((s) => s.slug === activeSectionSlug)
    : roots[0];

  return (
    <div className={cn("pb-docnav", `pb-docnav--${layout}`)}>
      {title && <h2 className="pb-docnav__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-docnav__subtitle text-muted-foreground">{subtitle}</p>}
      {portal.versions.length > 1 && (
        <div className="pb-docnav__versions flex flex-wrap gap-2 my-4">
          {portal.versions.map((v) => (
            <span
              key={v.id}
              className={cn(
                "text-xs px-2 py-1 rounded-full border",
                v.isDefault && "bg-primary/10 border-primary/30"
              )}
            >
              {pickLocale(v, "label", locale)}
            </span>
          ))}
        </div>
      )}
      {showBreadcrumbs && active && (
        <nav className="pb-docnav__breadcrumbs text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
          <span>{pickLocale(portal, "title", locale)}</span>
          <span className="mx-2">/</span>
          <span>{pickLocale(active, "title", locale)}</span>
        </nav>
      )}
      <div className={layout === "sidebar" ? "grid gap-6 lg:grid-cols-[240px_1fr]" : ""}>
        {showToc && (
          <aside className="pb-docnav__nav rounded-lg border p-4">
            <SectionTree
              sections={roots}
              all={portal.sections}
              locale={locale}
              basePath={basePath}
              portalSlug={portal.slug}
            />
          </aside>
        )}
        {active && (
          <article className="pb-docnav__content prose prose-sm max-w-none dark:prose-invert">
            <h3 className="font-heading text-xl font-semibold not-prose">
              {pickLocale(active, "title", locale)}
            </h3>
            <div
              dangerouslySetInnerHTML={{
                __html: pickLocale(active, "content", locale) || "<p></p>",
              }}
            />
          </article>
        )}
      </div>
    </div>
  );
}
