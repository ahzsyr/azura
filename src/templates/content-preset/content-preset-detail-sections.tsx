"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section";
import type { ContentPresetDetailViewModel } from "@/view-models/content-preset-detail";

type Props = {
  viewModel: ContentPresetDetailViewModel;
};

export function ContentPresetAttributeSectionsView({ viewModel }: Props) {
  if (viewModel.attributeSections.length === 0) return null;

  return (
    <div className="space-y-10">
      {viewModel.attributeSections.map((section) => (
        <div key={section.title}>
          <SectionHeader title={section.title} align="start" />
          <div className="mt-4 space-y-4">
            {section.rows.map((row) => (
              <div key={row.key}>
                <h3 className="mb-1 font-medium">{row.label}</h3>
                <p className="text-muted-foreground">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContentPresetDetailOverview({ viewModel }: Props) {
  const t = useTranslations("packages");
  const body = viewModel.description || viewModel.excerpt;
  if (!body) return null;

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold">{t("overview")}</h2>
      <p className="mt-4 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function ContentPresetDetailGallery({ viewModel }: Props) {
  const t = useTranslations("packages");
  if (viewModel.media.length <= 1) return null;

  return (
    <div>
      <h2 className="font-heading mb-4 text-xl font-semibold">{t("photoGallery")}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {viewModel.media.map((img) => (
          <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image src={img.url} alt={img.alt} fill className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
