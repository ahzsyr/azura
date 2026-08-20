import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BlockRenderer } from "@/features/builder/components/block-renderer";
import { PreviewPageClient } from "@/features/preview/preview-page-client";
import { PreviewIntlProvider } from "@/features/preview/preview-intl-provider";
import { previewTokenService } from "@/features/preview/preview-token.service";
import { themeService } from "@/features/theme/theme.service";
import { themeToCssVars } from "@/features/theme/theme.service";
import type { PageBlocks } from "@/types/builder";
import type { Locale } from "@/i18n/routing";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string; editor?: string; locale?: string }>;
};

export default async function CmsPreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();
  if (!token) notFound();

  const payload = await previewTokenService.resolve(token);
  if (!payload) notFound();

  const editorMode = params.editor === "1";
  const locale = (params.locale ?? payload.locale ?? "en") as Locale;
  const theme = await themeService.getPublished();
  const blocks = (payload.blocks as PageBlocks) ?? [];
  const cssVars = theme ? themeToCssVars(theme) : {};

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Preview — ${payload.slug}`}</title>
        <style>{`
          :root { ${Object.entries(cssVars)
            .map(([k, v]) => `${k}:${v}`)
            .join(";")} }
          body { margin: 0; font-family: var(--font-body, system-ui); background: var(--background); color: var(--foreground); }
          .preview-header {
            position: sticky; top: 0; z-index: 50;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);
            background: color-mix(in srgb, var(--background) 90%, transparent);
            backdrop-filter: blur(12px);
            font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
          }
          .preview-main [data-block-index] { position: relative; transition: outline 0.2s; }
          .preview-main [data-block-index]:hover { outline: 2px solid color-mix(in srgb, var(--primary) 40%, transparent); outline-offset: 4px; }
          .az-preview-selected { outline: 2px solid var(--primary) !important; outline-offset: 4px; }
          body.az-preview-outlines [data-block-index] { outline: 1px dashed color-mix(in srgb, var(--primary) 35%, transparent); outline-offset: 2px; }
        `}</style>
      </head>
      <body data-azura-editor-preview={editorMode ? "true" : undefined}>
        <header className="preview-header">
          <span>Preview — {payload.slug}</span>
          <span>{locale.toUpperCase()}</span>
        </header>
        <main className="preview-main">
          <PreviewIntlProvider locale={locale}>
            <BlockRenderer blocks={blocks} locale={locale} lazyLoad={false} previewMode />
          </PreviewIntlProvider>
        </main>
        <PreviewPageClient
          editorMode={editorMode}
          cursorEffect={theme?.cursorEffect}
          backgroundEffect={theme?.backgroundEffect}
          textEffect={theme?.textEffect}
        />
      </body>
    </html>
  );
}
