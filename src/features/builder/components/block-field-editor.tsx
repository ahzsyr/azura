"use client";

import type { BlockNode } from "@/types/builder";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import type { FaqSetBuilderOption } from "@/features/faq/types";
import type {
  TestimonialBuilderOption,
  TestimonialCollectionBuilderOption,
} from "@/features/testimonials/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { CatalogBlockFields } from "@/features/catalog/admin/catalog-block-fields";
import { ContentBlockFields } from "@/features/content/admin/content-block-fields";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  galleryOptions?: GalleryBuilderOption[];
  faqSetOptions?: FaqSetBuilderOption[];
  testimonialOptions?: TestimonialBuilderOption[];
  testimonialCollectionOptions?: TestimonialCollectionBuilderOption[];
};

export function BlockFieldEditor({
  block,
  onChange,
  galleryOptions = [],
  faqSetOptions = [],
  testimonialOptions = [],
  testimonialCollectionOptions = [],
}: Props) {

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
          <MediaPickerField
            label="Background image"
            mediaTypes={["IMAGE", "SVG"]}
            mediaId={(block.props.mediaAssetId as string) || null}
            url={(block.props.imageUrl as string) ?? ""}
            onChange={({ mediaId, url }) =>
              onChange(
                patchBlockSettings(block, {
                  imageUrl: url,
                  mediaAssetId: mediaId ?? "",
                })
              )
            }
          />
          <LocalizedBlockInput block={block} field="ctaLabel" label="CTA label" />
          <Input
            placeholder="CTA link"
            value={(block.props.ctaHref as string) ?? ""}
            onChange={(e) => setProp("ctaHref", e.target.value)}
          />
        </div>
      );

    case "text":
      return <LocalizedBlockTextarea block={block} field="content" label="Content" rows={5} />;

    case "image":
      return (
        <div className="space-y-3">
          <MediaPickerField
            label="Image"
            mediaTypes={["IMAGE", "SVG"]}
            mediaId={(block.props.mediaAssetId as string) || null}
            url={(block.props.url as string) ?? ""}
            onChange={({ mediaId, url }) =>
              onChange(patchBlockSettings(block, { url, mediaAssetId: mediaId ?? "" }))
            }
          />
          <LocalizedBlockInput block={block} field="alt" label="Alt text" />
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <div>
            <Label className="text-xs">Linked gallery</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={(block.props.gallerySlug as string) ?? ""}
              onChange={(e) => setProp("gallerySlug", e.target.value)}
            >
              <option value="">Select a gallery…</option>
              {galleryOptions.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.titleEn} ({g.slug}) — {g.mediaCount} item{g.mediaCount === 1 ? "" : "s"}
                  {!g.isPublished ? " [Hidden]" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/admin/gallery" className="underline hover:text-foreground">
                Manage galleries →
              </Link>
            </p>
            {galleryOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No galleries yet. Create one in Galleries admin.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Columns</Label>
            <select
              className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
              value={String(block.props.columns ?? 3)}
              onChange={(e) => setProp("columns", Number(e.target.value))}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Limit (0 = show all)</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={String(block.props.limit ?? 0)}
              onChange={(e) => setProp("limit", Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.showViewAllLink !== false}
              onChange={(e) => setProp("showViewAllLink", e.target.checked)}
            />
            Show &quot;View gallery&quot; link
          </label>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <div>
            <Label className="text-xs">Linked FAQ set</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={(block.props.faqSetSlug as string) ?? (block.props.category as string) ?? ""}
              onChange={(e) => setProp("faqSetSlug", e.target.value)}
            >
              <option value="">Select an FAQ set…</option>
              {faqSetOptions.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.titleEn} ({s.slug}) — {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                  {!s.isPublished ? " [Hidden]" : ""}
                </option>
              ))}
            </select>
            {faqSetOptions.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No FAQ sets yet.{" "}
                <Link href="/admin/faqs/new" className="text-primary underline">
                  Create one
                </Link>
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Limit (0 = all)</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={String(block.props.limit ?? 0)}
              onChange={(e) => setProp("limit", Number(e.target.value))}
            />
          </div>
        </div>
      );

    case "testimonials": {
      const source = (block.props.source as string) ?? "all";
      const selectedIds = (block.props.testimonialIds as string[]) ?? [];
      const toggleId = (id: string) => {
        const next = selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id];
        setProp("testimonialIds", next);
      };
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <div>
            <Label className="text-xs">Source</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={source}
              onChange={(e) => setProp("source", e.target.value)}
            >
              <option value="all">All published testimonials</option>
              <option value="collection">Testimonial collection</option>
              <option value="manual">Pick specific testimonials</option>
            </select>
          </div>
          {source === "collection" && (
            <div>
              <Label className="text-xs">Collection</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
                value={(block.props.testimonialCollectionSlug as string) ?? ""}
                onChange={(e) => setProp("testimonialCollectionSlug", e.target.value)}
              >
                <option value="">Select a collection…</option>
                {testimonialCollectionOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.titleEn} ({c.slug}) — {c.itemCount} item{c.itemCount === 1 ? "" : "s"}
                    {!c.isPublished ? " [Hidden]" : ""}
                  </option>
                ))}
              </select>
              {testimonialCollectionOptions.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No collections yet.{" "}
                  <Link href="/admin/testimonials/collections/new" className="text-primary underline">
                    Create one
                  </Link>
                </p>
              )}
            </div>
          )}
          {source === "manual" && (
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
              <Label className="text-xs">Selected testimonials</Label>
              {testimonialOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No testimonials in the library yet.</p>
              ) : (
                testimonialOptions.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggleId(t.id)}
                    />
                    {t.name} — {t.location}
                    {!t.isPublished ? " [Hidden]" : ""}
                  </label>
                ))
              )}
            </div>
          )}
          <div>
            <Label className="text-xs">Limit (0 = all)</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={String(block.props.limit ?? 6)}
              onChange={(e) => setProp("limit", Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Layout</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={(block.props.layoutMode as string) ?? "grid"}
              onChange={(e) => setProp("layoutMode", e.target.value)}
            >
              <option value="grid">Grid</option>
              <option value="slider">Slider</option>
            </select>
          </div>
          {(block.props.layoutMode as string) === "slider" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(block.props.sliderEnabled)}
                onChange={(e) => setProp("sliderEnabled", e.target.checked)}
              />
              Enable carousel (off = grid fallback)
            </label>
          )}
          <div>
            <Label className="text-xs">Columns</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={String(block.props.columns ?? 3)}
              onChange={(e) => setProp("columns", Number(e.target.value) as 2 | 3 | 4)}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Card design</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm"
              value={(block.props.cardVariant as string) ?? "default"}
              onChange={(e) => setProp("cardVariant", e.target.value)}
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
              <option value="minimal">Minimal</option>
              <option value="featured">Featured</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.props.showViewAllLink !== false}
              onChange={(e) => setProp("showViewAllLink", e.target.checked)}
            />
            Show &quot;View all testimonials&quot; link
          </label>
          {(block.props.layoutMode as string) === "slider" && Boolean(block.props.sliderEnabled) && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(block.props.autoplay)}
                  onChange={(e) => setProp("autoplay", e.target.checked)}
                />
                Autoplay slider
              </label>
              <div>
                <Label className="text-xs">Autoplay interval (ms)</Label>
                <Input
                  type="number"
                  min={2000}
                  className="mt-1"
                  value={String(block.props.autoplayIntervalMs ?? 5000)}
                  onChange={(e) => setProp("autoplayIntervalMs", Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
      );
    }

    case "pricing":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <Input
            placeholder="Package category slug (optional)"
            value={(block.props.packageCategorySlug as string) ?? ""}
            onChange={(e) => setProp("packageCategorySlug", e.target.value)}
          />
          <Input
            type="number"
            placeholder="Limit"
            value={String(block.props.limit ?? 3)}
            onChange={(e) => setProp("limit", Number(e.target.value))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(block.props.showFeaturedOnly)}
              onChange={(e) => setProp("showFeaturedOnly", e.target.checked)}
            />
            Featured packages only
          </label>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <LocalizedBlockInput block={block} field="button" label="Button" />
          <Input
            placeholder="Link href"
            value={(block.props.href as string) ?? ""}
            onChange={(e) => setProp("href", e.target.value)}
          />
        </div>
      );

    case "inquiryForm":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <div>
            <Label className="text-xs">Form type</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={(block.props.type as string) ?? "CONTACT"}
              onChange={(e) => setProp("type", e.target.value)}
            >
              <option value="CONTACT">Contact</option>
              <option value="VISA">Visa</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <LocalizedBlockTitle block={block} />
          <Input
            placeholder="Video URL (YouTube embed, etc.)"
            value={(block.props.url as string) ?? ""}
            onChange={(e) => setProp("url", e.target.value)}
          />
          <LocalizedBlockTextarea block={block} field="caption" label="Caption" rows={2} />
        </div>
      );

    case "richText":
    case "customHtml":
      return <LocalizedBlockTextarea block={block} field="html" label="HTML" rows={6} />;

    case "catalog":
      return (
        <CatalogBlockFields block={block} onChange={onChange} />
      );

    case "contentList":
      return (
        <ContentBlockFields block={block} onChange={onChange} />
      );

    case "spacer":
      return (
        <Input
          type="number"
          placeholder="Height (px)"
          value={String(block.props.height ?? 48)}
          onChange={(e) => setProp("height", Number(e.target.value))}
        />
      );

    case "divider":
      return (
        <select
          className="w-full border rounded-md h-9 px-2 text-sm"
          value={(block.props.style as string) ?? "solid"}
          onChange={(e) => setProp("style", e.target.value)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="gold">Gold accent</option>
        </select>
      );

    case "section":
      return (
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Padding</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={(block.props.padding as string) ?? "default"}
              onChange={(e) => setProp("padding", e.target.value)}
            >
              <option value="none">None</option>
              <option value="default">Default</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Background</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={(block.props.background as string) ?? "default"}
              onChange={(e) => setProp("background", e.target.value)}
            >
              <option value="default">Default</option>
              <option value="muted">Muted</option>
              <option value="primary">Primary tint</option>
            </select>
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            Add nested blocks inside this section below.
          </p>
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground">No fields for this block type.</p>;
  }
}
