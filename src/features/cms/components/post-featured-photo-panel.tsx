"use client";

import type { PostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { mergePostFeaturedImageSettings } from "@/schemas/featured-image-settings";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { CollapsibleSettingsGroup } from "@/features/theme/components/visual-controls";
import { Label } from "@/components/ui/label";
import { resolveFeaturedImageDisplay } from "@/lib/featured-image-display";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";

type Props = {
  postId?: string;
  postLegacy: ReturnType<typeof legacyShapeFromTranslations>;
  featuredImageUrl: string;
  onFeaturedImageUrlChange: (url: string) => void;
  onFeaturedImageIdChange: (id: string) => void;
  settings: PostFeaturedImageSettings;
  onSettingsChange: (settings: PostFeaturedImageSettings) => void;
  markDirty: () => void;
};

const ASPECT_RATIO_OPTIONS = [
  { value: "auto", label: "Auto (natural height)" },
  { value: "16:9", label: "16:9 (wide)" },
  { value: "4:3", label: "4:3 (standard)" },
  { value: "1:1", label: "1:1 (square)" },
] as const;

const OBJECT_FIT_OPTIONS = [
  { value: "cover", label: "Cover (fill frame)" },
  { value: "contain", label: "Contain (fit inside)" },
] as const;

const FOCAL_POINT_OPTIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

export function PostFeaturedPhotoPanel({
  postId,
  postLegacy,
  featuredImageUrl,
  onFeaturedImageUrlChange,
  onFeaturedImageIdChange,
  settings,
  onSettingsChange,
  markDirty,
}: Props) {
  const merged = mergePostFeaturedImageSettings(settings);
  const preview = resolveFeaturedImageDisplay(merged);

  const patchSettings = (patch: Partial<PostFeaturedImageSettings>) => {
    onSettingsChange({ ...merged, ...patch });
    markDirty();
  };

  return (
    <div className="space-y-4">
      <UrlPrimaryMediaPickerField
        label="Featured image"
        hint="Shown on the blog listing and at the top of the article."
        url={featuredImageUrl}
        onChange={(url) => {
          onFeaturedImageUrlChange(url);
          markDirty();
        }}
        onMediaIdChange={(mediaId) => {
          onFeaturedImageIdChange(mediaId ?? "");
          markDirty();
        }}
      />

      {featuredImageUrl ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
          <div className={cn(preview.containerClassName, "rounded-md border bg-background")}>
            <Image
              src={featuredImageUrl}
              alt=""
              fill
              className={preview.imageClassName}
              style={{ objectPosition: preview.objectPosition }}
              sizes="400px"
            />
          </div>
        </div>
      ) : null}

      <CollapsibleSettingsGroup
        title="Display options"
        description="Control how the featured photo appears on the public site."
        defaultOpen
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block">Aspect ratio</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={merged.aspectRatio ?? "16:9"}
              onChange={(e) =>
                patchSettings({ aspectRatio: e.target.value as PostFeaturedImageSettings["aspectRatio"] })
              }
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-2 block">Object fit</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={merged.objectFit ?? "cover"}
              onChange={(e) =>
                patchSettings({ objectFit: e.target.value as PostFeaturedImageSettings["objectFit"] })
              }
            >
              {OBJECT_FIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Focal point</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={merged.focalPoint ?? "center"}
              onChange={(e) =>
                patchSettings({ focalPoint: e.target.value as PostFeaturedImageSettings["focalPoint"] })
              }
            >
              {FOCAL_POINT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CollapsibleSettingsGroup>

      <CollapsibleSettingsGroup
        title="Accessibility & caption"
        description="Alt text and optional caption shown with the featured photo."
        defaultOpen
      >
        <div className="space-y-4">
          <AdminLocalizedFormField
            fieldKey="featuredImageAlt"
            label="Alt text"
            entityType="Post"
            entityId={postId}
            legacyEntity={postLegacy}
          />
          <AdminLocalizedFormField
            fieldKey="featuredImageCaption"
            label="Caption"
            entityType="Post"
            entityId={postId}
            legacyEntity={postLegacy}
            multiline
            rows={2}
          />
        </div>
      </CollapsibleSettingsGroup>
    </div>
  );
}
