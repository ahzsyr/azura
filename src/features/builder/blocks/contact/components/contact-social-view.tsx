"use client";

import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getLocalizedField } from "@/lib/utils";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactSocialProps } from "@/features/builder/blocks/contact/schemas/social";
import { ContactCard } from "./contact-card";
import { ContactIcon } from "./contact-icon";

type Props = {
  props: ContactSocialProps;
  theme?: ContactTheme | null;
};

const SHAPE: Record<ContactSocialProps["iconShape"], string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
  square: "rounded-none",
};

const SIZE: Record<ContactSocialProps["iconSize"], string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const GAP: Record<ContactSocialProps["gap"], string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const HOVER: Record<ContactSocialProps["hoverEffect"], string> = {
  none: "",
  scale: "hover:scale-105",
  fill: "hover:bg-primary hover:text-primary-foreground",
  color: "hover:text-primary",
};

const LAYOUT: Record<ContactSocialProps["layout"], string> = {
  row: "flex flex-row flex-wrap",
  grid: "grid grid-cols-3 sm:grid-cols-5",
  vertical: "flex flex-col",
};

export function ContactSocialView({ props, theme }: Props) {
  const locale = useLocale();
  const t = useTranslations("contact");
  return (
    <ContactCard
      title={props.title || t("connectWithUs")}
      description={props.description}
      icon={props.icon || "share"}
      props={props}
      theme={theme}
      footer={
        props.responseNote ? (
          <div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{props.responseNote}</span>
          </div>
        ) : undefined
      }
    >
      <div className={cn(LAYOUT[props.layout], GAP[props.gap])}>
        {(props.items ?? []).map((item) => {
          const label =
            getLocalizedField(item as unknown as Record<string, unknown>, "label", locale, {
              includeLegacySuffixFields: true,
            }) ||
            getLocalizedField(item as unknown as Record<string, unknown>, "platform", locale, {
              includeLegacySuffixFields: true,
            }) ||
            t("social");
          const inner = (
            <>
              <span
                className={cn(
                  "inline-flex items-center justify-center bg-muted text-foreground transition-all",
                  SHAPE[props.iconShape],
                  SIZE[props.iconSize],
                  HOVER[props.hoverEffect],
                )}
              >
                <ContactIcon name={item.icon || "globe"} size="sm" />
              </span>
              {props.showLabels ? (
                <span className="text-xs text-muted-foreground">{label}</span>
              ) : null}
            </>
          );

          if (!item.url) {
            return (
              <div key={item.id} className="inline-flex flex-col items-center gap-1">
                {inner}
              </div>
            );
          }

          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex flex-col items-center gap-1"
            >
              {inner}
            </a>
          );
        })}
      </div>

      {props.showFollowBtn && props.items?.[0]?.url ? (
        <div className="mt-4">
          <Button asChild size="sm" variant="outline">
            <a href={props.items[0].url} target="_blank" rel="noopener noreferrer">
              {t("follow")}
            </a>
          </Button>
        </div>
      ) : null}
    </ContactCard>
  );
}
