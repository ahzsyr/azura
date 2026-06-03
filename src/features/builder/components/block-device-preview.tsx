"use client";

import { useState } from "react";
import type { PageBlocks } from "@/types/builder";
import { BlockPreviewRenderer } from "./block-preview-renderer";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import { FALLBACK_LOCALES, type PublicLocale } from "@/i18n/locale-config";

type Device = "mobile" | "tablet" | "desktop";

const DEVICE_WIDTH: Record<Device, string> = {
  mobile: "390px",
  tablet: "834px",
  desktop: "100%",
};

type Props = {
  blocks: PageBlocks;
  pageId?: string;
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
  locales?: PublicLocale[];
};

export function BlockDevicePreview({
  blocks,
  pageId,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
  locales = FALLBACK_LOCALES,
}: Props) {
  const [locale, setLocale] = useState(locales[0]?.urlPrefix ?? "en");
  const [device, setDevice] = useState<Device>("mobile");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border p-0.5 text-xs">
          {(["mobile", "tablet", "desktop"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 capitalize",
                device === d && "bg-primary text-primary-foreground"
              )}
              onClick={() => setDevice(d)}
            >
              {d === "mobile" && <Smartphone className="h-3.5 w-3.5" />}
              {d === "tablet" && <Tablet className="h-3.5 w-3.5" />}
              {d === "desktop" && <Monitor className="h-3.5 w-3.5" />}
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap rounded-md border p-0.5 text-xs gap-0.5">
            {locales.map((l) => (
              <button
                key={l.code}
                type="button"
                className={cn(
                  "rounded px-2 py-0.5",
                  locale === l.urlPrefix && "bg-primary text-primary-foreground"
                )}
                onClick={() => setLocale(l.urlPrefix)}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          {pageId && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/studio?pageId=${pageId}`}>Open in Studio</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            "rounded-lg border bg-background shadow-sm overflow-hidden transition-all",
            device === "mobile" && "rounded-[2rem] border-[6px] border-foreground/80",
            device !== "desktop" && "max-h-[640px] overflow-y-auto"
          )}
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
        >
          {device === "mobile" && (
            <div className="h-5 bg-muted flex items-center justify-center">
              <div className="w-16 h-1 rounded-full bg-foreground/20" />
            </div>
          )}
          <BlockPreviewRenderer
            blocks={blocks}
            locale={locale}
            locales={locales}
            galleryOptions={galleryOptions}
            faqSetOptions={faqSetOptions}
            testimonialOptions={testimonialOptions}
            testimonialCollectionOptions={testimonialCollectionOptions}
          />
        </div>
      </div>
    </div>
  );
}
