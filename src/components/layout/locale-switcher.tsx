"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getNeutralPathnameForSwitch } from "@/i18n/url-helpers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type LocaleOption = {
  code: string;
  urlPrefix: string;
  label: string;
  flag?: string;
  isEnabled?: boolean;
};

type Props = {
  className?: string;
  locales?: LocaleOption[];
  showInline?: boolean;
};

const FALLBACK: LocaleOption[] = [
  { code: "en", urlPrefix: "en", label: "English", flag: "🇺🇸", isEnabled: true },
];

const MODAL_COPY_FALLBACK = "Select language";

export function LocaleSwitcher({ className, locales: localesProp, showInline = true }: Props) {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [locales, setLocales] = useState<LocaleOption[]>(localesProp ?? FALLBACK);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (localesProp?.length) {
      setLocales(localesProp.filter((l) => l.isEnabled !== false));
      return;
    }

    let cancelled = false;
    fetch("/api/locales")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.items?.length) return;
        setLocales(
          data.items.map((item: LocaleOption) => ({
            code: item.code,
            urlPrefix: item.urlPrefix,
            label: item.label,
            flag: item.flag,
            isEnabled: true,
          }))
        );
      })
      .catch(() => {
        /* keep fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [localesProp]);

  const knownPrefixes = useMemo(() => locales.map((l) => l.urlPrefix), [locales]);

  const activeEntry = useMemo(
    () => locales.find((l) => l.urlPrefix === locale || l.code === locale),
    [locales, locale]
  );

  const switchLocale = (targetUrlPrefix: string) => {
    setFading(true);
    const fullPath =
      typeof window !== "undefined" ? window.location.pathname : pathname;
    const currentPrefix = activeEntry?.urlPrefix ?? locale;
    const neutralPath = getNeutralPathnameForSwitch(
      fullPath,
      currentPrefix,
      knownPrefixes
    );
    const search =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : "";
    const href = search ? `${neutralPath}${search}` : neutralPath;
    router.replace(href, { locale: targetUrlPrefix });
    setOpen(false);
    setTimeout(() => setFading(false), 300);
  };

  const modalTitle = t.has("selectLanguage") ? t("selectLanguage") : MODAL_COPY_FALLBACK;

  if (locales.length <= 1) {
    return (
      <button id="locale-switcher-trigger" type="button" className="sr-only" tabIndex={-1} aria-hidden />
    );
  }

  return (
    <>
      <button
        id="locale-switcher-trigger"
        type="button"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm gap-4 sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] rounded-b-none sm:rounded-b-lg w-full sm:max-w-sm animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0"
          aria-describedby={undefined}
        >
          <DialogTitle>{modalTitle}</DialogTitle>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            {locales.map((item) => {
              const active = locale === item.urlPrefix || locale === item.code;
              return (
                <Button
                  key={item.code}
                  variant={active ? "default" : "outline"}
                  className="h-12 justify-between gap-3 px-4"
                  onClick={() => switchLocale(item.urlPrefix)}
                >
                  <span className="flex items-center gap-3">
                    {item.flag ? <span aria-hidden className="text-lg">{item.flag}</span> : null}
                    <span>{item.label}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {showInline ? (
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg border p-1 transition-opacity duration-300",
            fading && "opacity-60",
            className
          )}
        >
          {locales.map((item) => {
            const active = locale === item.urlPrefix || locale === item.code;
            return (
              <Button
                key={item.code}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => switchLocale(item.urlPrefix)}
                className="h-8 px-2.5 text-xs gap-1.5 max-w-[120px]"
                title={item.label}
              >
                {item.flag ? <span aria-hidden>{item.flag}</span> : null}
                <span className="truncate hidden sm:inline">{item.label}</span>
                <span className="sm:hidden uppercase">{item.code}</span>
                {active ? <Check className="h-3 w-3 shrink-0" /> : null}
              </Button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
