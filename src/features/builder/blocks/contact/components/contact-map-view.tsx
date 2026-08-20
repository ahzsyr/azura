"use client";

import { useTranslations } from "next-intl";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactTheme } from "@/features/builder/blocks/contact/schemas/common";
import type { ContactMapProps } from "@/features/builder/blocks/contact/schemas/map";
import { ContactCard } from "./contact-card";
import { ContactActions } from "./contact-actions";

type Props = {
  props: ContactMapProps;
  theme?: ContactTheme | null;
};

export function ContactMapView({ props, theme }: Props) {
  const t = useTranslations("contact");
  const providerType = props.provider?.type ?? "google";
  const embedUrl =
    props.provider?.embedUrl?.trim() ||
    (providerType === "openstreetmap"
      ? "https://www.openstreetmap.org/export/embed.html"
      : "");

  const placeholderLabel =
    providerType === "bing"
      ? t("addBingMapEmbed")
      : providerType === "openstreetmap"
        ? t("addOpenStreetMapEmbed")
        : providerType === "custom"
          ? t("addCustomMapEmbed")
          : t("addGoogleMapEmbed");

  return (
    <ContactCard
      title={props.title}
      description={props.description}
      icon={props.icon || "mapPin"}
      props={props}
      theme={theme}
      footer={
        props.showDirections && props.directionsUrl ? (
          <ContactActions
            actions={[
              {
                label: props.directionsText || t("getDirections"),
                href: props.directionsUrl,
                icon: "mapPin",
                external: true,
                variant: "secondary",
              },
            ]}
          />
        ) : undefined
      }
    >
      <div className="relative w-full overflow-hidden">
        {embedUrl ? (
          <iframe
            title={props.markerLabel || props.title || "Map"}
            src={embedUrl}
            className={cn(
              "w-full border-0 bg-muted",
              props.roundedCorners && "rounded-xl",
            )}
            style={{ height: props.height || 400 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-muted text-sm text-muted-foreground",
              props.roundedCorners && "rounded-xl",
            )}
            style={{ height: props.height || 400 }}
          >
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {placeholderLabel}
            </span>
          </div>
        )}

        {props.showOverlayCard && props.overlayHours ? (
          <div className="absolute bottom-3 left-3 right-3 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span>{props.overlayHours}</span>
            </div>
          </div>
        ) : null}
      </div>
    </ContactCard>
  );
}
