"use client";

import Image from "next/image";
import { portalWebsiteLabel } from "@/features/builder/blocks/portal/lib/portal-ui-labels";
import type { Locale } from "@/i18n/routing";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  viewModel: PartnerCardViewModel;
  locale: Locale;
  className?: string;
};

export function PartnerCardBody({ viewModel, locale, className }: Props) {
  return (
    <div className={className ?? "pb-partners__card rounded-xl border p-4"}>
      <div className="relative h-12 w-24 mb-3">
        <Image
          src={viewModel.logoUrl || DEFAULT_MEDIA_PLACEHOLDER}
          alt={viewModel.logoAlt}
          fill
          className="object-contain object-start"
          sizes="96px"
        />
      </div>
      <h3 className="font-medium">{viewModel.name}</h3>
      {viewModel.description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{viewModel.description}</p>
      )}
      {viewModel.location && (
        <p className="text-xs text-muted-foreground mt-2">{viewModel.location}</p>
      )}
      {viewModel.websiteUrl && (
        <a
          href={viewModel.websiteUrl}
          className="text-xs text-primary mt-2 inline-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          {portalWebsiteLabel(locale)}
        </a>
      )}
    </div>
  );
}
