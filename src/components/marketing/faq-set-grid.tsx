import { Link } from "@/i18n/navigation";
import { HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { FaqSetPublic } from "@/features/faq/types";
import { getLocalizedField } from "@/lib/utils";

type Props = {
  faqSets: FaqSetPublic[];
  locale: string;
};

export async function FaqSetGrid({ faqSets, locale }: Props) {
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {faqSets.map((set) => (
        <Link
          key={set.id}
          href={`/faq/${set.slug}`}
          className="group overflow-hidden rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <HelpCircle className="mb-4 h-8 w-8 text-primary" />
          <h3 className="font-medium">{getLocalizedField(set, "title", locale)}</h3>
          {getLocalizedField(set, "excerpt", locale) && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {getLocalizedField(set, "excerpt", locale)}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {set.itemCount} {set.itemCount === 1 ? t("item") : t("items")}
          </p>
        </Link>
      ))}
    </div>
  );
}
