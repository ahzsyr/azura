"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { switchLocalePath } from "@/i18n/url-helpers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    const newPath = switchLocalePath(
      fullPath,
      currentPrefix,
      targetUrlPrefix,
      knownPrefixes,
    );
    const absolutePath = newPath.startsWith("/") ? newPath : `/${newPath}`;
    const search =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : "";
    const href = search ? `${absolutePath}${search}` : absolutePath;
    if (typeof window !== "undefined") {
      const target = new URL(absolutePath + search, window.location.origin);
      window.location.replace(target.toString());
    } else {
      router.replace(href);
    }
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
          className={cn(
            "locale-switcher-dialog",
            /* Reset default centered dialog positioning */
            "left-auto right-auto top-auto translate-x-0 translate-y-0",
            /* Mobile: bottom sheet */
            "inset-x-0 bottom-0 w-full max-w-none gap-0 border-x-0 border-b-0 p-0",
            "rounded-t-[1.35rem] rounded-b-none shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.28)]",
            /* Desktop: compact centered card */
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:bottom-auto",
            "sm:w-full sm:max-w-[22rem] sm:translate-x-[-50%] sm:translate-y-[-50%]",
            "sm:rounded-2xl sm:border sm:shadow-xl",
          )}
        >
          {/* Mobile sheet grabber */}
          <div
            className="flex justify-center pb-1 pt-3 sm:hidden"
            aria-hidden
          >
            <span className="h-1 w-10 rounded-full bg-foreground/15" />
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-5 sm:pb-5 sm:pt-5">
            <DialogHeader className="mb-3 space-y-1 pe-10 text-start sm:mb-4">
              <DialogTitle className="text-[1.05rem] font-semibold tracking-tight sm:text-lg">
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t.has("selectLanguageHint")
                  ? t("selectLanguageHint")
                  : "Choose your preferred language"}
              </DialogDescription>
            </DialogHeader>

            <div
              role="listbox"
              aria-label={modalTitle}
              className="grid gap-2.5"
            >
              {locales.map((item) => {
                const active = locale === item.urlPrefix || locale === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => switchLocale(item.urlPrefix)}
                    className={cn(
                      "group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start transition-[transform,background-color,box-shadow,border-color] duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "active:scale-[0.985]",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border/70 bg-card text-foreground shadow-sm hover:border-border hover:bg-muted/60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {item.flag ? (
                        <span
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/20 text-xl leading-none"
                        >
                          {item.flag}
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
                            active
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.code}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[0.95rem] font-medium leading-tight">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs uppercase tracking-wide",
                            active
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.code}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-transparent text-transparent",
                      )}
                      aria-hidden={!active}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </button>
                );
              })}
            </div>
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
                className="h-8 max-w-[120px] gap-1.5 px-2.5 text-xs"
                title={item.label}
              >
                {item.flag ? <span aria-hidden>{item.flag}</span> : null}
                <span className="hidden truncate sm:inline">{item.label}</span>
                <span className="uppercase sm:hidden">{item.code}</span>
                {active ? <Check className="h-3 w-3 shrink-0" /> : null}
              </Button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
