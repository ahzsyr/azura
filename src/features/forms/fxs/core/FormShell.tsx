"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FxsLayoutMode, FxsShellConfig, FxsTrustItem } from "../types";
import { FxsThemeProvider } from "./ThemeProvider";
import { SidebarNav } from "../interaction/SidebarNav";

function TrustList({ items }: { items: FxsTrustItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-3" aria-hidden />
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function HeroBlock({
  title,
  description,
  trustItems,
  estimatedMinutes,
}: {
  title?: string;
  description?: string;
  trustItems?: FxsTrustItem[];
  estimatedMinutes?: number;
}) {
  if (!title && !description) return null;
  return (
    <header className="space-y-3">
      {title ? (
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
          {estimatedMinutes != null ? (
            <span className="mt-1 block text-xs text-muted-foreground/90">
              Takes about {estimatedMinutes} min
            </span>
          ) : null}
        </p>
      ) : estimatedMinutes != null ? (
        <p className="text-xs text-muted-foreground">Takes about {estimatedMinutes} min</p>
      ) : null}
      <TrustList items={trustItems ?? []} />
    </header>
  );
}

function layoutClasses(mode: FxsLayoutMode): string {
  switch (mode) {
    case "split":
      return cn(
        "mx-auto grid w-full max-w-5xl gap-8",
        "md:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1.25fr)] md:items-start md:gap-10",
        "xl:max-w-6xl xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.4fr)] xl:gap-14",
      );
    case "centered":
      return "mx-auto flex w-full max-w-xl flex-col gap-8";
    case "compact":
      return "w-full max-w-lg space-y-4";
    case "stacked":
      return "mx-auto flex w-full max-w-2xl flex-col gap-6";
    case "inline":
      return "mx-auto w-full max-w-4xl";
    case "twoColumn":
      return "mx-auto w-full max-w-4xl";
    case "responsiveGrid":
      return "mx-auto w-full max-w-5xl";
    case "sectionCard":
      return "mx-auto flex w-full max-w-3xl flex-col gap-6 xl:max-w-4xl";
    case "sidebar":
      return "mx-auto w-full max-w-5xl fxs-sidebar";
    case "conversational":
      return "mx-auto w-full max-w-xl";
    case "review":
      return "mx-auto flex w-full max-w-3xl flex-col gap-6";
    case "wizard":
      return "mx-auto flex w-full max-w-3xl flex-col gap-8 xl:max-w-4xl";
    default:
      return "mx-auto flex w-full max-w-3xl flex-col gap-8 xl:max-w-4xl";
  }
}

export function FormShell({
  config,
  children,
  aside,
  footer,
  className,
}: {
  config?: FxsShellConfig;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const {
    title,
    description,
    trustItems,
    sidebarSections,
    estimatedMinutes,
    layoutMode = "default",
    theme = "modern",
    fieldMode,
    showHero = true,
    heroAside,
  } = config ?? {};

  const hero = showHero ? (
    <HeroBlock
      title={title}
      description={description}
      trustItems={trustItems}
      estimatedMinutes={estimatedMinutes}
    />
  ) : null;

  const showHeroInBody = layoutMode !== "split" && layoutMode !== "compact" && layoutMode !== "sidebar";

  const body = (
    <div className="min-w-0 w-full space-y-6">
      {showHeroInBody ? hero : null}
      {children}
      {footer}
    </div>
  );

  return (
    <FxsThemeProvider
      preset={theme}
      fieldMode={fieldMode}
      className={cn("fxs-shell w-full min-w-0", className)}
    >
      <div className={layoutClasses(layoutMode)} data-fxs-layout={layoutMode}>
        {layoutMode === "split" ? (
          <>
            <div className="min-w-0 space-y-4 md:sticky md:top-24">
              {hero}
              {heroAside}
              {aside}
            </div>
            {body}
          </>
        ) : layoutMode === "sidebar" ? (
          <>
            <nav className="hidden min-w-0 space-y-3 md:block md:sticky md:top-24" aria-label="Form navigation">
              {sidebarSections?.length ? <SidebarNav sections={sidebarSections} /> : aside ?? hero}
            </nav>
            <div className="min-w-0 w-full space-y-6">
              {sidebarSections?.length ? <SidebarNav sections={sidebarSections} compact className="md:hidden" /> : null}
              {!sidebarSections?.length ? hero : null}
              {children}
              {footer}
            </div>
          </>
        ) : aside && layoutMode === "default" ? (
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] lg:items-start">
            {body}
            <aside className="hidden min-w-0 lg:block">{aside}</aside>
          </div>
        ) : (
          body
        )}
      </div>
    </FxsThemeProvider>
  );
}
