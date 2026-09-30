"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminCollapsibleSection } from "@/components/admin/layout/admin-collapsible-section";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import {
  getBlockSettings,
  patchBlockMedia,
  patchBlockSettings,
} from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { useAdminEditingLocaleContextOptional } from "@/components/admin/admin-editing-locale-provider";
import { DEFAULT_ADMIN_LOCALE, getContentFieldSuffix } from "@/i18n/locale-config";
import { EditSourcePanel } from "@/features/builder/blocks/content/custom-html/admin/edit-source-panel";
import type { HtmlElement } from "@/features/builder/blocks/content/custom-html/types";
import { ImageLayoutControls } from "@/features/builder/blocks/content/admin/image-layout-controls";
import { ContentPositionGrid } from "@/features/builder/blocks/content/admin/content-position-grid";
import {
  IMAGE_MEDIA_ASPECT_RATIOS,
  IMAGE_MEDIA_OBJECT_FITS,
  IMAGE_MEDIA_SIZES,
  normalizeImageBlockSettings,
  type ImageContentPanelVariant,
  type ImageContentPosition,
  type ImageContentType,
  type ImageMediaAspectRatio,
  type ImageMediaObjectFit,
  type ImageMediaSize,
} from "@/features/builder/blocks/content/lib/image-block-model";
import { getLocalizedField } from "@/lib/utils";

const AdvancedRichTextEditor = dynamic(
  () =>
    import("@/features/builder/blocks/content/admin/advanced-rich-text-editor").then(
      (m) => m.AdvancedRichTextEditor,
    ),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground">Loading editor…</p> },
);

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

const CONTENT_TYPES: { value: ImageContentType; label: string }[] = [
  { value: "structured", label: "Structured" },
  { value: "richText", label: "Rich Text" },
  { value: "html", label: "HTML" },
];

const PANEL_VARIANTS: { value: ImageContentPanelVariant; label: string }[] = [
  { value: "none", label: "None" },
  { value: "surface", label: "Surface" },
  { value: "glass", label: "Glass" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const SIMPLE_ALIGN: { value: ImageContentPosition; label: string }[] = [
  { value: "center-left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "center-right", label: "Right" },
];

const ASPECT_LABELS: Record<ImageMediaAspectRatio, string> = {
  auto: "Auto",
  "16/9": "16:9",
  "4/3": "4:3",
  "3/2": "3:2",
  "1/1": "1:1",
  "4/5": "4:5",
  "3/4": "3:4",
  "9/16": "9:16",
};

const SIZE_LABELS: Record<ImageMediaSize, string> = {
  auto: "Auto",
  sm: "SM",
  md: "MD",
  lg: "LG",
  xl: "XL",
  full: "Full",
  custom: "Custom",
};

const DIMENSION_UNIT_OPTIONS = ["px", "rem", "%", "vw", "vh", "auto"] as const;

export function ImageBlockFields({ block, onChange }: Props) {
  const imageProps = getBlockSettings(block);
  const model = normalizeImageBlockSettings(imageProps);
  const adminLocale = useAdminEditingLocaleContextOptional();
  const activeCode = adminLocale?.activeLocaleCode ?? DEFAULT_ADMIN_LOCALE.code;
  const defaultCode = adminLocale?.defaultCode ?? DEFAULT_ADMIN_LOCALE.code;
  const activeLocale = adminLocale?.activeLocale ?? DEFAULT_ADMIN_LOCALE;
  const suffix = getContentFieldSuffix(activeCode);
  const isDefault = activeCode === defaultCode;

  const blockRef = useRef(block);
  blockRef.current = block;

  const patch = useCallback(
    (partial: Record<string, unknown>) => {
      onChange(patchBlockSettings(blockRef.current, partial));
    },
    [onChange],
  );

  const align =
    (imageProps.align as string) === "start" ? "left" : ((imageProps.align as string) ?? "center");
  const descriptionAlign =
    (imageProps.descriptionAlign as string) === "start"
      ? "left"
      : ((imageProps.descriptionAlign as string) ?? "center");

  const contentKey = `richContent${suffix}`;
  const htmlKey = `richHtml${suffix}`;
  const defaultSuffix = getContentFieldSuffix(defaultCode);
  const richContent =
    (typeof imageProps[contentKey] === "string" ? (imageProps[contentKey] as string) : "") ||
    (isDefault
      ? getLocalizedField(imageProps, "richContent", activeCode, {
          includeLegacySuffixFields: true,
        })
      : "") ||
    (typeof imageProps[`richContent${defaultSuffix}`] === "string"
      ? (imageProps[`richContent${defaultSuffix}`] as string)
      : "") ||
    "";

  const htmlElements = Array.isArray(imageProps.htmlElements)
    ? (imageProps.htmlElements as HtmlElement[])
    : [];

  const isOverlay =
    model.layout.mediaPosition === "overlay" || model.layout.mediaPosition === "background";
  const headerEnabled = model.header.enabled;
  const aspectRatio = model.media.aspectRatio;
  const mediaSize = model.media.size;
  const objectFit = model.media.objectFit;

  const updateCustomAspectRatio = (nextAspectRatio: ImageMediaAspectRatio) => {
    const ratioMap: Record<ImageMediaAspectRatio, { width: number; height: number }> = {
      auto: { width: 1, height: 1 },
      "16/9": { width: 16, height: 9 },
      "4/3": { width: 4, height: 3 },
      "3/2": { width: 3, height: 2 },
      "1/1": { width: 1, height: 1 },
      "4/5": { width: 4, height: 5 },
      "3/4": { width: 3, height: 4 },
      "9/16": { width: 9, height: 16 },
    };

    const ratio = ratioMap[nextAspectRatio];
    let nextWidth = model.media.width;
    let nextHeight = model.media.height;
    const hasWidth = model.media.width !== null && model.media.width > 0 && !model.media.widthAuto;
    const hasHeight = model.media.height !== null && model.media.height > 0 && !model.media.heightAuto;

    if (ratio && nextAspectRatio !== "auto") {
      if (hasWidth && !hasHeight) {
        nextHeight = (model.media.width! * ratio.height) / ratio.width;
      }
      if (hasHeight && !hasWidth) {
        nextWidth = (model.media.height! * ratio.width) / ratio.height;
      }
      if (hasWidth && hasHeight) {
        nextHeight = (model.media.width! * ratio.height) / ratio.width;
      }
    }

    patch({
      mediaAspectRatio: nextAspectRatio,
      mediaFrameWidth: nextWidth,
      mediaFrameHeight: nextHeight,
      mediaFrameWidthUnit: model.media.widthUnit ?? "px",
      mediaFrameHeightUnit: model.media.heightUnit ?? "px",
    });
  };

  const updateCustomDimension = (
    source: "width" | "height",
    rawValue: string,
  ) => {
    const ratioMap: Record<ImageMediaAspectRatio, { width: number; height: number }> = {
      auto: { width: 1, height: 1 },
      "16/9": { width: 16, height: 9 },
      "4/3": { width: 4, height: 3 },
      "3/2": { width: 3, height: 2 },
      "1/1": { width: 1, height: 1 },
      "4/5": { width: 4, height: 5 },
      "3/4": { width: 3, height: 4 },
      "9/16": { width: 9, height: 16 },
    };

    const ratio = ratioMap[aspectRatio];
    const value = rawValue.trim();
    const parsed = value === "" ? null : Number(value);
    const sharedUnit = model.media.widthUnit ?? "px";

    if (!ratio || aspectRatio === "auto") {
      patch({
        mediaFrameWidth: source === "width" ? parsed : model.media.width,
        mediaFrameHeight: source === "height" ? parsed : model.media.height,
        mediaFrameWidthAuto: source === "width" ? false : model.media.widthAuto,
        mediaFrameHeightAuto: source === "height" ? false : model.media.heightAuto,
        mediaFrameWidthUnit: sharedUnit,
        mediaFrameHeightUnit: sharedUnit,
      });
      return;
    }

    let nextWidth = source === "width" ? parsed : model.media.width;
    let nextHeight = source === "height" ? parsed : model.media.height;

    if (source === "width" && parsed !== null && parsed > 0) {
      nextHeight = (parsed * ratio.height) / ratio.width;
    }
    if (source === "height" && parsed !== null && parsed > 0) {
      nextWidth = (parsed * ratio.width) / ratio.height;
    }

    patch({
      mediaFrameWidth: nextWidth,
      mediaFrameHeight: nextHeight,
      mediaFrameWidthAuto: source === "width" ? false : model.media.widthAuto,
      mediaFrameHeightAuto: source === "height" ? false : model.media.heightAuto,
      mediaFrameWidthUnit: sharedUnit,
      mediaFrameHeightUnit: sharedUnit,
    });
  };

  const toggleAutoDimension = (dimension: "width" | "height", checked: boolean) => {
    if (!checked) {
      patch({
        mediaFrameWidthAuto: dimension === "width" ? false : model.media.widthAuto,
        mediaFrameHeightAuto: dimension === "height" ? false : model.media.heightAuto,
      });
      return;
    }

    const ratioMap: Record<ImageMediaAspectRatio, { width: number; height: number }> = {
      auto: { width: 1, height: 1 },
      "16/9": { width: 16, height: 9 },
      "4/3": { width: 4, height: 3 },
      "3/2": { width: 3, height: 2 },
      "1/1": { width: 1, height: 1 },
      "4/5": { width: 4, height: 5 },
      "3/4": { width: 3, height: 4 },
      "9/16": { width: 9, height: 16 },
    };

    const ratio = ratioMap[aspectRatio];
    const nextWidthAuto = dimension === "width" ? true : model.media.widthAuto;
    const nextHeightAuto = dimension === "height" ? true : model.media.heightAuto;

    let nextWidth = model.media.width;
    let nextHeight = model.media.height;

    if (ratio && aspectRatio !== "auto") {
      if (dimension === "width" && model.media.height !== null && model.media.height > 0) {
        nextWidth = (model.media.height * ratio.width) / ratio.height;
      }
      if (dimension === "height" && model.media.width !== null && model.media.width > 0) {
        nextHeight = (model.media.width * ratio.height) / ratio.width;
      }
    }

    patch({
      mediaFrameWidth: dimension === "width" ? nextWidth : model.media.width,
      mediaFrameHeight: dimension === "height" ? nextHeight : model.media.height,
      mediaFrameWidthAuto: nextWidthAuto,
      mediaFrameHeightAuto: nextHeightAuto,
      mediaFrameWidthUnit: model.media.widthUnit ?? "px",
      mediaFrameHeightUnit: model.media.heightUnit ?? "px",
    });
  };

  const clearContent = () => {
    patch({
      badge: "",
      title: "",
      subtitle: "",
      description: "",
      richContent: "",
      richContentEn: "",
      richContentAr: "",
      richHtml: "",
      richHtmlEn: "",
      richHtmlAr: "",
      htmlElements: [],
      contentType: "structured",
    });
  };

  const clearMedia = () => {
    onChange(
      patchBlockMedia(
        blockRef.current,
        { urlKey: "url", mediaIdKey: "mediaAssetId" },
        { url: "", mediaId: "" },
      ),
    );
  };

  return (
    <div className="space-y-3">
      <AdminCollapsibleSection title="Media" defaultOpen={true}>
        <div className="space-y-3">
          <UrlPrimaryMediaPickerField
            label="Image"
            mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
            url={(imageProps.url as string) ?? ""}
            onPick={({ url, mediaId }) =>
              onChange(
                patchBlockMedia(
                  block,
                  { urlKey: "url", mediaIdKey: "mediaAssetId" },
                  { url, mediaId },
                ),
              )
            }
          />
          <LocalizedBlockInput block={block} field="alt" label="Alt text" />

          <div>
            <Label className="text-xs">Aspect ratio</Label>
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {IMAGE_MEDIA_ASPECT_RATIOS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    aspectRatio === value
                      ? "rounded-md border border-primary bg-primary/10 px-1 py-1.5 text-[10px] text-primary"
                      : "rounded-md border px-1 py-1.5 text-[10px] hover:bg-muted"
                  }
                  onClick={() => updateCustomAspectRatio(value satisfies ImageMediaAspectRatio)}
                >
                  {ASPECT_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Image size</Label>
            <div className="mt-1 grid grid-cols-6 gap-1.5">
              {IMAGE_MEDIA_SIZES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    mediaSize === value
                      ? "rounded-md border border-primary bg-primary/10 px-1 py-1.5 text-[10px] text-primary"
                      : "rounded-md border px-1 py-1.5 text-[10px] hover:bg-muted"
                  }
                  onClick={() => patch({ mediaSize: value satisfies ImageMediaSize })}
                >
                  {SIZE_LABELS[value]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Max width of the image frame (Auto keeps the previous default).
            </p>
          </div>

          {mediaSize === "custom" ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Width</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 40"
                      value={model.media.width ?? ""}
                      disabled={model.media.widthAuto}
                      onChange={(e) => updateCustomDimension("width", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={model.media.widthAuto}
                        onChange={(e) => toggleAutoDimension("width", e.target.checked)}
                      />
                      Auto
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Height</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 20"
                      value={model.media.height ?? ""}
                      disabled={model.media.heightAuto}
                      onChange={(e) => updateCustomDimension("height", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={model.media.heightAuto}
                        onChange={(e) => toggleAutoDimension("height", e.target.checked)}
                      />
                      Auto
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Label className="text-[10px] text-muted-foreground">Unit</Label>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  value={model.media.widthUnit ?? "px"}
                  onChange={(e) => {
                    const nextUnit = e.target.value as (typeof DIMENSION_UNIT_OPTIONS)[number];
                    patch({
                      mediaFrameWidthUnit: nextUnit,
                      mediaFrameHeightUnit: nextUnit,
                    });
                  }}
                >
                  {DIMENSION_UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-muted-foreground">
                {aspectRatio !== "auto"
                  ? "When Auto is enabled for either dimension, the other side is derived from the selected aspect ratio."
                  : "Set an aspect ratio to auto-calculate the matching dimension when one side is left on Auto."}
              </p>
            </div>
          ) : null}

          {aspectRatio !== "auto" ? (
            <div>
              <Label className="text-xs">Object fit</Label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {IMAGE_MEDIA_OBJECT_FITS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      objectFit === value
                        ? "rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-xs text-primary"
                        : "rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                    }
                    onClick={() => patch({ mediaObjectFit: value satisfies ImageMediaObjectFit })}
                  >
                    {value === "cover" ? "Cover" : "Contain"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={clearContent}>
              Image only
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={clearMedia}>
              Content only
            </Button>
          </div>
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Block header" defaultOpen={true}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={headerEnabled}
              onChange={(e) => patch({ headerEnabled: e.target.checked })}
            />
            Show header
          </label>
          {headerEnabled ? (
            <div className="space-y-3 rounded-md border p-3">
              <LocalizedBlockInput block={block} field="badge" label="Badge" />
              <LocalizedBlockTitle block={block} />
              <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
              <div>
                <Label className="text-xs">Header alignment</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                  value={align}
                  onChange={(e) => patch({ align: e.target.value })}
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Badge size</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={(imageProps.badgeSize as string) ?? "sm"}
                    onChange={(e) => patch({ badgeSize: e.target.value })}
                  >
                    <option value="xs">XS</option>
                    <option value="sm">SM</option>
                    <option value="base">Base</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Title size</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={(imageProps.titleSize as string) ?? "2xl"}
                    onChange={(e) => patch({ titleSize: e.target.value })}
                  >
                    <option value="xl">XL</option>
                    <option value="2xl">2XL</option>
                    <option value="3xl">3XL</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Subtitle size</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={(imageProps.subtitleSize as string) ?? "base"}
                    onChange={(e) => patch({ subtitleSize: e.target.value })}
                  >
                    <option value="sm">SM</option>
                    <option value="base">Base</option>
                    <option value="lg">LG</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Renders above the image and content layout for every content type.
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Header is hidden. Structured content can still use badge, title, and subtitle inline.
            </p>
          )}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Layout" defaultOpen={false}>
        <div className="space-y-3">
          <ImageLayoutControls
            mediaPosition={model.layout.mediaPosition}
            mobileLayout={model.layout.mobileLayout}
            mediaWidth={model.layout.mediaWidth}
            mediaGap={model.layout.mediaGap}
            onChange={(partial) => patch(partial)}
          />
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Content" defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Content type</Label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {CONTENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={
                    model.content.type === opt.value
                      ? "rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-xs text-primary"
                      : "rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                  }
                  onClick={() => patch({ contentType: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {model.content.type === "structured" ? (
            <div className="space-y-3">
              {!headerEnabled ? (
                <>
                  <LocalizedBlockInput block={block} field="badge" label="Badge" />
                  <LocalizedBlockTitle block={block} />
                  <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
                  <div>
                    <Label className="text-xs">Header alignment</Label>
                    <select
                      className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                      value={align}
                      onChange={(e) => patch({ align: e.target.value })}
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                </>
              ) : null}
              <LocalizedBlockTextarea block={block} field="description" label="Description" rows={3} />
              <div className="space-y-3 rounded-md border p-3">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {headerEnabled ? "Description typography" : "Typography"}
                </Label>
                {!headerEnabled ? (
                  <>
                    <div>
                      <Label className="text-xs">Badge size</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                        value={(imageProps.badgeSize as string) ?? "sm"}
                        onChange={(e) => patch({ badgeSize: e.target.value })}
                      >
                        <option value="xs">XS</option>
                        <option value="sm">SM</option>
                        <option value="base">Base</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Title size</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                        value={(imageProps.titleSize as string) ?? "2xl"}
                        onChange={(e) => patch({ titleSize: e.target.value })}
                      >
                        <option value="xl">XL</option>
                        <option value="2xl">2XL</option>
                        <option value="3xl">3XL</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Subtitle size</Label>
                      <select
                        className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                        value={(imageProps.subtitleSize as string) ?? "base"}
                        onChange={(e) => patch({ subtitleSize: e.target.value })}
                      >
                        <option value="sm">SM</option>
                        <option value="base">Base</option>
                        <option value="lg">LG</option>
                      </select>
                    </div>
                  </>
                ) : null}
                <div>
                  <Label className="text-xs">Description size</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={(imageProps.descriptionSize as string) ?? "base"}
                    onChange={(e) => patch({ descriptionSize: e.target.value })}
                  >
                    <option value="sm">SM</option>
                    <option value="base">Base</option>
                    <option value="lg">LG</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Description alignment</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={descriptionAlign}
                    onChange={(e) => patch({ descriptionAlign: e.target.value })}
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="center">Center</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {model.content.type === "richText" ? (
            <div className="space-y-2">
              <Label className="text-xs">
                {isDefault ? "Rich text" : `Rich text (${activeLocale.label})`}
              </Label>
              <AdvancedRichTextEditor
                content={richContent}
                onChange={(json, html) =>
                  patch({
                    [contentKey]: json,
                    [htmlKey]: html,
                    ...(isDefault ? { richContent: json, richHtml: html } : {}),
                  })
                }
                placeholder="Write content…"
              />
            </div>
          ) : null}

          {model.content.type === "html" ? (
            <div className="overflow-hidden rounded-md border">
              <EditSourcePanel
                elements={htmlElements}
                onChange={(elements) => patch({ htmlElements: elements })}
              />
            </div>
          ) : null}
        </div>
      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Content position" defaultOpen={false}>
        <div className="space-y-3">
          {isOverlay ? (
            <>
              <ContentPositionGrid
                value={model.layout.contentPosition}
                onChange={(contentPosition) => patch({ contentPosition })}
              />
              <div className="flex items-center gap-2">
                <input
                  id="image-content-panel"
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={imageProps.contentPanelEnabled === true}
                  onChange={(e) => patch({ contentPanelEnabled: e.target.checked })}
                />
                <Label htmlFor="image-content-panel" className="text-xs">
                  Content panel
                </Label>
              </div>
              {imageProps.contentPanelEnabled === true ? (
                <div>
                  <Label className="text-xs">Panel variant</Label>
                  <select
                    className="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                    value={(imageProps.contentPanelVariant as string) ?? "none"}
                    onChange={(e) => patch({ contentPanelVariant: e.target.value })}
                  >
                    {PANEL_VARIANTS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          ) : (
            <div>
              <Label className="text-xs">Content alignment</Label>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {SIMPLE_ALIGN.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      model.layout.contentPosition === opt.value
                        ? "rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-xs text-primary"
                        : "rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                    }
                    onClick={() => patch({ contentPosition: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
