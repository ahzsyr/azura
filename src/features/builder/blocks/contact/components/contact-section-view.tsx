"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getDirectionSync } from "@/i18n/locale-config";
import type { ContactSectionProps } from "@/features/builder/blocks/contact/schemas/section";
import { ContactThemeProvider } from "./contact-theme-context";

type Props = {
  props: ContactSectionProps;
  left: ReactNode;
  right: ReactNode;
  className?: string;
};

const DESKTOP_COLS: Record<string, string> = {
  "50/50": "lg:grid-cols-2",
  "40/60": "lg:grid-cols-[2fr_3fr]",
  "60/40": "lg:grid-cols-[3fr_2fr]",
  "30/70": "lg:grid-cols-[3fr_7fr]",
  "70/30": "lg:grid-cols-[7fr_3fr]",
  stacked: "lg:grid-cols-1",
};

export function ContactSectionView({ props, left, right, className }: Props) {
  const locale = useLocale();
  const desktop = props.desktopLayout ?? "60/40";
  const tabletSideBySide = props.tabletLayout === "sideBySide";

  return (
    <ContactThemeProvider theme={props.theme}>
      <div dir={getDirectionSync(locale)} className={cn("w-full space-y-6", className)}>
        {(props.title || props.subtitle) && (
          <div className="space-y-1">
            {props.title ? (
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {props.title}
              </h2>
            ) : null}
            {props.subtitle ? (
              <p className="text-sm text-muted-foreground md:text-base">{props.subtitle}</p>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            tabletSideBySide && desktop !== "stacked" && "md:grid-cols-2",
            desktop !== "stacked" && DESKTOP_COLS[desktop],
          )}
        >
          <div className="flex min-w-0 flex-col gap-4">{left}</div>
          <div className="flex min-w-0 flex-col gap-4">{right}</div>
        </div>
      </div>
    </ContactThemeProvider>
  );
}
