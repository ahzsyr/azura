import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/marketing/section";
import { AdvancedRichTextView } from "@/features/builder/blocks/content/components/advanced-rich-text-view";
import { CustomHtmlView } from "@/features/builder/blocks/content/custom-html/components/custom-html-view";
import {
  contentPanelVariantClass,
  type ImageBlockModel,
} from "@/features/builder/blocks/content/lib/image-block-model";

export type ImageContentPart = "full" | "header" | "description";

type Props = {
  model: ImageBlockModel;
  locale: string;
  className?: string;
  textAlignClass?: string;
  part?: ImageContentPart;
};

function structuredTypography(model: ImageBlockModel) {
  const s = model.content.structured;
  const badgeSizeClass =
    s.badgeSize === "xs" ? "text-[10px]" : s.badgeSize === "base" ? "text-sm" : "text-xs";
  const titleSizeClass =
    s.titleSize === "xl"
      ? "text-2xl md:text-3xl lg:text-4xl"
      : s.titleSize === "3xl"
        ? "text-4xl md:text-5xl lg:text-6xl"
        : "text-3xl md:text-4xl lg:text-5xl";
  const subtitleSizeClass =
    s.subtitleSize === "sm"
      ? "text-sm md:text-base"
      : s.subtitleSize === "lg"
        ? "text-lg md:text-xl"
        : "text-base md:text-lg";
  const descriptionSizeClass =
    s.descriptionSize === "sm" ? "text-sm" : s.descriptionSize === "lg" ? "text-lg" : "text-base";
  const descriptionAlign =
    s.descriptionAlign === "left"
      ? "text-left"
      : s.descriptionAlign === "right"
        ? "text-right"
        : s.descriptionAlign === "justify"
          ? "text-justify"
          : "text-center";
  return { badgeSizeClass, titleSizeClass, subtitleSizeClass, descriptionSizeClass, descriptionAlign };
}

/** Block-level header above the media/content layout. */
export function ImageBlockHeader({ model }: { model: ImageBlockModel }) {
  if (!model.header.visible) return null;
  const h = model.header;
  const typo = structuredTypography(model);

  if (h.title) {
    return (
      <SectionHeader
        badge={h.badge || undefined}
        title={h.title}
        subtitle={h.subtitle || undefined}
        align={h.align}
        badgeClassName={typo.badgeSizeClass}
        titleClassName={typo.titleSizeClass}
        subtitleClassName={typo.subtitleSizeClass}
      />
    );
  }

  return (
    <div
      className={cn(
        "mb-12 space-y-2 md:mb-16",
        h.align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
      )}
    >
      {h.badge ? (
        <span
          className={cn(
            "az-hero-badge text-xs font-medium uppercase tracking-wider text-primary",
            typo.badgeSizeClass,
          )}
        >
          {h.badge}
        </span>
      ) : null}
      {h.subtitle ? (
        <p className={cn("text-foreground/70", typo.subtitleSizeClass)}>{h.subtitle}</p>
      ) : null}
    </div>
  );
}

function renderStructured(
  model: ImageBlockModel,
  part: ImageContentPart,
  textAlignClass?: string,
): ReactNode {
  const s = model.content.structured;
  const typo = structuredTypography(model);
  const headerOwnsCopy = model.header.enabled;
  const showInlineHeader = !headerOwnsCopy && (part === "full" || part === "header");
  const showDescription = part === "full" || part === "description";

  const header = showInlineHeader ? (
    <>
      {s.title ? (
        <SectionHeader
          badge={s.badge || undefined}
          title={s.title}
          subtitle={s.subtitle || undefined}
          align={s.align}
          badgeClassName={typo.badgeSizeClass}
          titleClassName={typo.titleSizeClass}
          subtitleClassName={typo.subtitleSizeClass}
          containerClassName={part === "header" ? undefined : "mb-6 md:mb-8"}
        />
      ) : s.badge || s.subtitle ? (
        <div
          className={cn(
            "mb-6 space-y-2",
            s.align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
          )}
        >
          {s.badge ? (
            <span
              className={cn(
                "az-hero-badge text-xs font-medium uppercase tracking-wider text-primary",
                typo.badgeSizeClass,
              )}
            >
              {s.badge}
            </span>
          ) : null}
          {s.subtitle ? (
            <p className={cn("text-foreground/70", typo.subtitleSizeClass)}>{s.subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </>
  ) : null;

  const description =
    showDescription && s.description ? (
      <p
        className={cn(
          "leading-relaxed text-foreground/70 max-w-2xl",
          part === "description" && "mt-6",
          s.align === "center" && !textAlignClass ? "mx-auto" : "",
          typo.descriptionSizeClass,
          typo.descriptionAlign,
        )}
      >
        {s.description}
      </p>
    ) : null;

  if (!header && !description) return null;

  return (
    <div className={cn("w-full min-w-0", textAlignClass)}>
      {header}
      {showDescription ? description : null}
    </div>
  );
}

export function ImageContentRenderer({
  model,
  locale,
  className,
  textAlignClass,
  part = "full",
}: Props) {
  const panelClass =
    model.panel.enabled && model.panel.variant !== "none"
      ? contentPanelVariantClass(model.panel.variant)
      : "";

  let body: ReactNode = null;

  if (model.content.type === "structured") {
    body = renderStructured(model, part, textAlignClass);
  } else if (part !== "full") {
    return null;
  } else if (!model.content.hasBodyContent) {
    return null;
  } else if (model.content.type === "richText") {
    body = <AdvancedRichTextView html={model.content.richHtml} maxWidth="full" prose />;
  } else {
    body = <CustomHtmlView elements={model.content.htmlElements} locale={locale} />;
  }

  if (!body) return null;

  return <div className={cn("min-w-0 w-full", panelClass, className)}>{body}</div>;
}
