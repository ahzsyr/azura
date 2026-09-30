import type { ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import { cn } from "@/lib/utils";
import { Section } from "@/components/marketing/section";
import { ImageMediaRenderer } from "@/features/builder/blocks/content/components/image-media-renderer";
import {
  ImageBlockHeader,
  ImageContentRenderer,
} from "@/features/builder/blocks/content/components/image-content-renderer";
import {
  CONTENT_POSITION_PLACE_CLASS,
  MEDIA_ASPECT_CLASS,
  MEDIA_GAP_CLASS,
  MEDIA_WIDTH_CLASS,
  contentAreaAlignClasses,
  normalizeImageBlockSettings,
  sideBySideLayoutClasses,
  shouldRenderImageBlock,
  type ImageBlockModel,
} from "@/features/builder/blocks/content/lib/image-block-model";

type LocFn = (field: string) => string;

type Props = {
  block: BlockNode;
  props: Record<string, unknown>;
  locale: string;
  loc: LocFn;
  lazyLoad?: boolean;
};

function hasAuthoredWidth(block: BlockNode): boolean {
  const layers = [block.styles, block.responsive?.desktop, block.responsive?.tablet, block.responsive?.mobile];
  return layers.some(
    (layer) =>
      layer?.width !== undefined ||
      layer?.maxWidth !== undefined ||
      layer?.widthPreset !== undefined ||
      layer?.maxWidthPreset !== undefined,
  );
}

function MediaColumn({
  model,
  block,
  lazyLoad,
  className,
}: {
  model: ImageBlockModel;
  block: BlockNode;
  lazyLoad?: boolean;
  className?: string;
}) {
  return (
    <ImageMediaRenderer
      url={model.media.url}
      alt={model.media.alt}
      lazyLoad={lazyLoad}
      borderRadius={block.styles?.borderRadius}
      hugOrAuthoredWidth={model.isHugMode || hasAuthoredWidth(block)}
      aspectRatio={model.media.aspectRatio}
      size={model.media.size}
      objectFit={model.media.objectFit}
      width={model.media.width}
      height={model.media.height}
      widthUnit={model.media.widthUnit}
      heightUnit={model.media.heightUnit}
      widthAuto={model.media.widthAuto}
      heightAuto={model.media.heightAuto}
      className={className}
    />
  );
}

function ContentColumn({
  model,
  locale,
  className,
  textAlignClass,
  part,
}: {
  model: ImageBlockModel;
  locale: string;
  className?: string;
  textAlignClass?: string;
  part?: "full" | "header" | "description";
}) {
  return (
    <ImageContentRenderer
      model={model}
      locale={locale}
      className={className}
      textAlignClass={textAlignClass}
      part={part}
    />
  );
}

function OverlayOrBackgroundLayout({
  model,
  block,
  locale,
  lazyLoad,
  mode,
}: {
  model: ImageBlockModel;
  block: BlockNode;
  locale: string;
  lazyLoad?: boolean;
  mode: "overlay" | "background";
}) {
  const place = CONTENT_POSITION_PLACE_CLASS[model.layout.contentPosition];
  const hasMedia = Boolean(model.media.url);
  const aspectClass =
    model.media.aspectRatio !== "auto"
      ? MEDIA_ASPECT_CLASS[model.media.aspectRatio]
      : "min-h-[16rem] md:min-h-[20rem]";

  return (
    <div
      className={cn(
        "relative w-full min-w-0 overflow-hidden",
        mode === "background" && aspectClass,
        block.styles?.borderRadius === undefined && "rounded-xl",
      )}
    >
      {hasMedia ? (
        <ImageMediaRenderer
          url={model.media.url}
          alt={model.media.alt}
          lazyLoad={lazyLoad}
          borderRadius={block.styles?.borderRadius}
          fill
          objectFit={model.media.objectFit}
        />
      ) : null}
      {model.content.hasBodyContent ? (
        <div
          className={cn(
            "relative z-[1] grid w-full grid-cols-3 grid-rows-3 gap-4 p-6 md:p-10",
            mode === "overlay" && hasMedia && aspectClass,
            mode === "background" && "min-h-[16rem]",
          )}
        >
          <div className={cn("max-w-xl w-full", place)}>
            <ContentColumn model={model} locale={locale} />
          </div>
        </div>
      ) : hasMedia ? (
        <div
          className={cn(
            "relative w-full",
            model.media.aspectRatio !== "auto"
              ? MEDIA_ASPECT_CLASS[model.media.aspectRatio]
              : "aspect-[16/9]",
          )}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function SideBySideLayout({
  model,
  block,
  locale,
  lazyLoad,
}: {
  model: ImageBlockModel;
  block: BlockNode;
  locale: string;
  lazyLoad?: boolean;
}) {
  const { mediaPosition, mediaGap, mediaWidth, mobileLayout, contentPosition } = model.layout;
  const side = mediaPosition === "right" ? "right" : "left";
  const gapClass = MEDIA_GAP_CLASS[mediaGap];
  const align = contentAreaAlignClasses(contentPosition);
  const mediaWidthClass = MEDIA_WIDTH_CLASS[mediaWidth];
  const showMedia = Boolean(model.media.url);
  const showContent = model.content.hasBodyContent;

  const mediaEl = showMedia ? (
    <div
      className={cn(
        "min-w-0 w-full",
        mediaWidthClass,
        model.media.size === "custom" && "flex items-center justify-center self-center",
      )}
    >
      <MediaColumn model={model} block={block} lazyLoad={lazyLoad} className="mx-auto max-w-full self-center" />
    </div>
  ) : null;

  const contentEl = showContent ? (
    <div className={cn("min-w-0 flex-1", align.box)}>
      <ContentColumn model={model} locale={locale} textAlignClass={align.text} />
    </div>
  ) : null;

  return (
    <div
      className={cn(
        sideBySideLayoutClasses(side, mobileLayout),
        gapClass,
        model.media.size === "custom" ? "w-full min-w-0 items-center" : "w-full min-w-0 items-stretch",
      )}
    >
      {side === "left" ? (
        <>
          {mediaEl}
          {contentEl}
        </>
      ) : (
        <>
          {contentEl}
          {mediaEl}
        </>
      )}
    </div>
  );
}

function StackLayout({
  model,
  block,
  locale,
  lazyLoad,
}: {
  model: ImageBlockModel;
  block: BlockNode;
  locale: string;
  lazyLoad?: boolean;
}) {
  const { mediaPosition, mediaGap, contentPosition } = model.layout;
  const gapClass = MEDIA_GAP_CLASS[mediaGap];
  const align = contentAreaAlignClasses(contentPosition);
  const showMedia = Boolean(model.media.url);
  const showBody = model.content.hasBodyContent;

  const mediaEl = showMedia ? (
    <MediaColumn model={model} block={block} lazyLoad={lazyLoad} />
  ) : null;

  // When block header is off, structured+top keeps Title → Image → Description.
  const inlineStructuredTop =
    mediaPosition === "top" &&
    model.content.type === "structured" &&
    !model.header.enabled &&
    model.content.hasContent;

  if (inlineStructuredTop) {
    return (
      <div className="flex w-full min-w-0 flex-col">
        <div className={cn(align.box, "w-full")}>
          <ContentColumn model={model} locale={locale} textAlignClass={align.text} part="header" />
        </div>
        {mediaEl}
        <div className={cn(align.box, "w-full")}>
          <ContentColumn
            model={model}
            locale={locale}
            textAlignClass={align.text}
            part="description"
          />
        </div>
      </div>
    );
  }

  // Header enabled + structured top: Image → Description (header rendered outside).
  if (
    mediaPosition === "top" &&
    model.content.type === "structured" &&
    model.header.enabled &&
    showBody
  ) {
    return (
      <div className={cn("flex w-full min-w-0 flex-col", gapClass)}>
        {mediaEl}
        <div className={cn(align.box, "w-full")}>
          <ContentColumn
            model={model}
            locale={locale}
            textAlignClass={align.text}
            part="description"
          />
        </div>
      </div>
    );
  }

  const contentEl = showBody ? (
    <div className={cn(align.box, "w-full")}>
      <ContentColumn model={model} locale={locale} textAlignClass={align.text} />
    </div>
  ) : null;

  const mediaFirst = mediaPosition === "top";

  return (
    <div className={cn("flex w-full min-w-0 flex-col", gapClass)}>
      {mediaFirst ? (
        <>
          {mediaEl}
          {contentEl}
        </>
      ) : (
        <>
          {contentEl}
          {mediaEl}
        </>
      )}
    </div>
  );
}

export function ImageContentBlock({ block, props, locale, loc, lazyLoad }: Props) {
  const model = normalizeImageBlockSettings(props, { locale, loc });

  if (!shouldRenderImageBlock(model)) return null;

  const hug = model.isHugMode;
  const pos = model.layout.mediaPosition;

  let inner: ReactNode;
  if (pos === "overlay" || pos === "background") {
    inner = (
      <OverlayOrBackgroundLayout
        model={model}
        block={block}
        locale={locale}
        lazyLoad={lazyLoad}
        mode={pos}
      />
    );
  } else if (pos === "left" || pos === "right") {
    inner = <SideBySideLayout model={model} block={block} locale={locale} lazyLoad={lazyLoad} />;
  } else {
    inner = <StackLayout model={model} block={block} locale={locale} lazyLoad={lazyLoad} />;
  }

  return (
    <Section suppressPadding={hug} suppressAtmosphere={hug}>
      <ImageBlockHeader model={model} />
      {inner}
    </Section>
  );
}

/** Exported for BlockWrapper omitHeights decision. */
export function resolveImageBlockOmitHeights(
  props: Record<string, unknown>,
  loc?: LocFn,
): boolean {
  return normalizeImageBlockSettings(props, { loc }).omitHeights;
}
