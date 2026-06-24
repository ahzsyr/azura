import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { seoRepository } from "@/repositories/seo.repository";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import {
  loadEntityTranslations,
  loadPublicLocaleContext,
} from "@/features/i18n/public-locale-context";
import { getLocalizedField } from "@/lib/utils";
import type { PageBlocks } from "@/types/builder";

export default async function NotFoundPage() {
  const locale = await getLocale();
  const [custom, ctx, t] = await Promise.all([
    seoRepository.getCustom404(locale).catch(() => null),
    loadPublicLocaleContext(locale),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const translations = custom ? await loadEntityTranslations("Custom404", custom.id) : [];
  const fieldOpts = {
    enabledLocales: ctx.enabledLocales,
    defaultCode: ctx.defaultCode,
    translations,
  };

  const title =
    getLocalizedField(custom ?? {}, "title", locale, fieldOpts).trim() || t("pageNotFound");
  const body =
    getLocalizedField(custom ?? {}, "body", locale, fieldOpts).trim() || t("pageNotFoundBody");

  const blocks = (custom?.blocks as PageBlocks) ?? [];

  return (
    <section className="nf-page min-h-[calc(100vh-var(--header-height,4rem))] flex items-center justify-center px-4 py-16">
      <div
        className="nf-card relative w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-10 text-center shadow-xl"
        aria-labelledby="nf-title"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <p className="relative text-7xl font-heading font-bold tracking-tighter text-primary/25 select-none">
          404
        </p>
        <h1 id="nf-title" className="relative mt-2 font-heading text-2xl font-semibold">
          {title}
        </h1>
        <p className="relative mt-3 text-sm text-muted-foreground leading-relaxed">{body}</p>

        {blocks.length > 0 && (
          <div className="relative mt-8 text-start">
            <BlockRenderer blocks={blocks} locale={locale as "en" | "ar"} />
          </div>
        )}

        <nav className="relative mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link
            href={`/${locale}`}
            className="inline-flex rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t("backToHome")}
          </Link>
          <Link
            href={`/${locale}/products`}
            className="inline-flex rounded-lg border px-5 py-2 font-medium hover:bg-muted/50 transition-colors"
          >
            Products
          </Link>
          <Link
            href={`/${locale}/collections`}
            className="inline-flex rounded-lg border px-5 py-2 font-medium hover:bg-muted/50 transition-colors"
          >
            Collections
          </Link>
        </nav>

        <form
          className="relative mt-6 flex gap-2 max-w-sm mx-auto"
          action={`/${locale}/products`}
          method="get"
        >
          <input
            type="search"
            name="q"
            placeholder="Search products…"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
            aria-label="Search products"
          />
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
