import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import { PreviewPageClient } from "@/features/preview/preview-page-client";
import { PreviewIntlProvider } from "@/features/preview/preview-intl-provider";
import { loadPresetJson } from "@/features/theme/preset-resolver.server";
import { themeService } from "@/features/theme/theme.service";
import type { PageBlocks } from "@/types/builder";
import "@/styles/site-backgrounds.css";
import "@/styles/preset-visuals.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ id?: string }>;
};

const SAMPLE_BLOCKS: PageBlocks = [
  {
    id: "preview-hero",
    type: "hero",
    props: {
      titleEn: "Preset Preview",
      titleAr: "معاينة القالب",
      subtitleEn: "Live theme tokens and effects",
      subtitleAr: "رموز المظهر والتأثيرات",
      ctaHref: "/contact",
      ctaLabelEn: "Get started",
      ctaLabelAr: "ابدأ",
    },
  },
  {
    id: "preview-text",
    type: "text",
    props: {
      contentEn: "This iframe preview shows colors, cursor, background, and text effects for the selected preset.",
      contentAr: "تعرض هذه المعاينة الألوان والمؤشر والخلفية وتأثيرات النص للقالب المحدد.",
    },
  },
];

export default async function PresetPreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const presetId = params.id?.trim() || "travel";
  const preset = await loadPresetJson(presetId);
  if (!preset) redirect("/admin/theme?section=presets");

  const theme = await themeService.getPublished();
  const primary = preset.colors.primary;
  const accent = preset.colors.accent ?? preset.colors.secondary ?? primary;
  const background = preset.colors.background;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Preset — ${preset.name}`}</title>
        <style>{`
          :root {
            --primary: ${primary};
            --accent: ${accent};
            --background: ${background};
            --foreground: ${preset.colors.text ?? "#f8fafc"};
            --muted-foreground: ${preset.colors.textMuted ?? "#94a3b8"};
          }
          body { margin: 0; background: var(--background); color: var(--foreground); font-family: system-ui; }
          .preset-banner {
            position: sticky; top: 0; z-index: 50;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.5rem 1rem; background: var(--primary); color: var(--background);
            font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase;
          }
        `}</style>
      </head>
      <body data-cursor={preset.cursor} data-bg-effect={preset.backgroundEffect}>
        <div className="preset-banner">
          <span>Preset preview — {preset.name}</span>
          <button
            type="button"
            id="preset-preview-close"
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
        <main>
          <PreviewIntlProvider locale="en">
            <BlockRenderer
              blocks={SAMPLE_BLOCKS}
              locale="en"
              lazyLoad={false}
              parentType="CmsPage"
              parentId="preset-preview"
            />
          </PreviewIntlProvider>
        </main>
        <PreviewPageClient
          cursorEffect={preset.cursor ?? theme?.cursorEffect}
          backgroundEffect={preset.backgroundEffect ?? theme?.backgroundEffect}
          textEffect={preset.textEffect ?? theme?.textEffect}
        />
        <Script id="preset-preview-close">
          {`document.getElementById('preset-preview-close')?.addEventListener('click',function(){window.parent.postMessage('preview-close','*')});`}
        </Script>
      </body>
    </html>
  );
}
