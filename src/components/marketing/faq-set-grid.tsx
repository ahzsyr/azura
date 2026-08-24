import { Link } from "@/i18n/navigation";
import { HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { FaqSetPublic } from "@/features/faq/types";
import { cn, getLocalizedField } from "@/lib/utils";

type Props = {
  faqSets: FaqSetPublic[];
  locale: string;
  columns?: 2 | 3 | 4;
};

const localizedOpts = { includeLegacySuffixFields: true } as const;

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export async function FaqSetGrid({ faqSets, locale, columns = 3 }: Props) {
  const t = await getTranslations({ locale, namespace: "faq" });

  if (faqSets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <HelpCircle className="mx-auto h-10 w-10 opacity-40" />
        <p className="mt-4">{t("noSets")}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", COLUMN_CLASS[columns])}>
      {faqSets.map((set) => {
        const title = getLocalizedField(set, "title", locale, localizedOpts);
        const excerpt = getLocalizedField(set, "excerpt", locale, localizedOpts);
        return (
          <Link
            key={set.id}
            href={`/faq/${set.slug}`}
            className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
          >
            <div className="aspect-video overflow-hidden bg-muted">
              {set.coverUrl ? (
                <img
                  src={set.coverUrl}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <HelpCircle className="h-10 w-10 opacity-40" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium">{title}</h3>
              {excerpt ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerpt}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {set.itemCount} {set.itemCount === 1 ? t("item") : t("items")}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
