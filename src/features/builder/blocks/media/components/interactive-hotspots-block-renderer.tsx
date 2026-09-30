import type { Locale } from "@/i18n/routing";
import { getLocalizedField } from "@/lib/utils";
import { parseInteractiveHotspotsProps } from "@/features/builder/blocks/media/lib/parse-block-props";
import { InteractiveHotspotsView } from "@/features/builder/blocks/media/components/interactive-hotspots-view";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

export function InteractiveHotspotsBlockRenderer({ locale, props: raw, previewMode }: Props) {
  const p = parseInteractiveHotspotsProps(raw);

  if (!p.imageUrl && previewMode) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
        Add a base image and hotspots in block settings.
      </p>
    );
  }

  if (!p.imageUrl) return null;

  return (
    <InteractiveHotspotsView
      title={getLocalizedField(p, "title", locale) || undefined}
      subtitle={getLocalizedField(p, "subtitle", locale) || undefined}
      imageUrl={p.imageUrl}
      hotspots={p.hotspots}
      interaction={p.interaction}
      panelStyle={p.panelStyle}
      locale={locale}
    />
  );
}
