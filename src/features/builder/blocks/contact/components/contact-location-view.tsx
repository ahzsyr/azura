"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactLocationProps } from "@/features/builder/blocks/contact/schemas/location";
import { getLocalizedField } from "@/lib/utils";
import { summarizeBusinessHours } from "@/features/builder/blocks/contact/schemas/business-hours";
import { ContactCard } from "./contact-card";
import { ContactActions, type ContactActionItem } from "./contact-actions";
import { BusinessHoursView } from "./business-hours-view";

type Props = {
  props: ContactLocationProps;
  theme?: ContactTheme | null;
};

function locField(props: ContactLocationProps, field: string, locale: string): string {
  return getLocalizedField(props as unknown as Record<string, unknown>, field, locale, {
    includeLegacySuffixFields: true,
  });
}

function formatAddress(props: ContactLocationProps, locale: string) {
  const addressLine1 = locField(props, "addressLine1", locale) || props.addressLine1;
  const addressLine2 = locField(props, "addressLine2", locale) || props.addressLine2;
  const city = locField(props, "city", locale) || props.city;
  const country = locField(props, "country", locale) || props.country;
  const postalCode = locField(props, "postalCode", locale) || props.postalCode;

  return [
    addressLine1,
    addressLine2,
    [city, postalCode].filter(Boolean).join(" "),
    country,
  ].filter((line) => line?.trim());
}

function buildMapsActions(props: ContactLocationProps): ContactActionItem[] {
  if (!props.showMapsButton) return [];

  if (props.autoMapsButtons === false && props.mapsButtons?.length) {
    return props.mapsButtons
      .filter((b) => b.enabled && b.url)
      .map((b) => ({
        label: b.label || b.provider,
        href: b.url,
        icon: b.icon || "mapPin",
        external: true,
        primary: b.primary,
      }));
  }

  const providers: Array<{
    key: string;
    url?: string;
    label: string;
    icon: string;
  }> = [
    {
      key: "google",
      url: props.googleMapsUrl,
      label: props.mapsButtonText || "Google Maps",
      icon: "mapPin",
    },
    { key: "bing", url: props.bingMapsUrl, label: "Bing Maps", icon: "globe" },
    { key: "apple", url: props.appleMapsUrl, label: "Apple Maps", icon: "mapPin" },
    { key: "osm", url: props.osmUrl, label: "OpenStreetMap", icon: "compass" },
  ];

  const filled = providers.filter((p) => p.url?.trim());
  return filled.map((p, index) => ({
    label: p.label,
    href: p.url!,
    icon: p.icon,
    external: true,
    primary: index === 0,
  }));
}

export function ContactLocationView({ props, theme }: Props) {
  const locale = useLocale();
  const t = useTranslations("contact");
  const lines = formatAddress(props, locale);
  const mapsActions = buildMapsActions(props);
  const hasHoursTable = (props.businessHours?.length ?? 0) > 0;
  const hoursSummary =
    props.hours?.trim() ||
    (hasHoursTable ? summarizeBusinessHours(props.businessHours) : "");

  const mapsLayout =
    props.mapsButtonsLayout === "row" && mapsActions.length > 1
      ? "grid"
      : (props.mapsButtonsLayout ?? "grid");

  return (
    <ContactCard
      title={props.title || t("visitOffice")}
      description={props.description}
      icon={props.icon || "building"}
      props={props}
      theme={theme}
    >
      {lines.length > 0 ? (
        <div className="flex w-full items-start gap-2.5 text-start text-sm leading-relaxed text-foreground/90">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      {(mapsActions.length > 0 || hasHoursTable || hoursSummary) && (
        <div className="mt-4 space-y-4 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/80 to-muted/40 p-3.5 sm:p-4">
          {mapsActions.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Navigation className="h-3.5 w-3.5 shrink-0" />
                {t("getDirections")}
              </div>
              <ContactActions
                actions={mapsActions}
                layout={mapsLayout}
                styleVariant={props.mapsButtonsStyle ?? "outline"}
              />
            </div>
          ) : null}

          {mapsActions.length > 0 && (hasHoursTable || hoursSummary) ? (
            <div className="h-px bg-border/70" aria-hidden />
          ) : null}

          {hasHoursTable ? (
            <BusinessHoursView days={props.businessHours} compact />
          ) : hoursSummary ? (
            <p className="text-sm text-muted-foreground">{hoursSummary}</p>
          ) : null}
        </div>
      )}
    </ContactCard>
  );
}
