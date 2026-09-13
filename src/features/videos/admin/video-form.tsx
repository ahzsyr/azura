"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VideoAdmin } from "@/features/videos/types";
import { upsertVideo } from "@/features/videos/actions";
import { isJpgOrPngThumbnail } from "@/features/videos/video-validation";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  video?: VideoAdmin | null;
};

function toDatetimeLocalValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VideoForm({ video }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(video?.title ?? "");
  const [description, setDescription] = useState(video?.description ?? "");
  const [slug, setSlug] = useState(video?.slug ?? "");
  const [locale, setLocale] = useState(video?.locale ?? "en");
  const [duration, setDuration] = useState(video?.duration ?? "");
  const [embedUrl, setEmbedUrl] = useState(video?.embedUrl ?? "");
  const [status, setStatus] = useState(video?.status ?? "DRAFT");
  const [uploadDate, setUploadDate] = useState(
    toDatetimeLocalValue(video?.uploadDate) || toDatetimeLocalValue(new Date()),
  );

  const [contentMediaId, setContentMediaId] = useState(video?.contentMediaId ?? "");
  const [contentUrl, setContentUrl] = useState(video?.contentMedia?.url ?? "");
  const [thumbnailMediaId, setThumbnailMediaId] = useState(video?.thumbnailMediaId ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailMedia?.url ?? "");
  const [thumbnailMime, setThumbnailMime] = useState(video?.thumbnailMedia?.mimeType ?? "");

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (!contentMediaId) {
      setError("Select a content video from the media library.");
      return;
    }
    if (!thumbnailMediaId) {
      setError("Select a JPG or PNG thumbnail.");
      return;
    }
    if (!isJpgOrPngThumbnail(thumbnailMime, thumbnailUrl)) {
      setError("Thumbnail must be JPG or PNG (SVG is not allowed).");
      return;
    }

    formData.set("contentMediaId", contentMediaId);
    formData.set("thumbnailMediaId", thumbnailMediaId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("slug", slug);
    formData.set("locale", locale);
    formData.set("duration", duration);
    formData.set("embedUrl", embedUrl);
    formData.set("status", status);
    formData.set("uploadDate", uploadDate);

    startTransition(async () => {
      try {
        const saved = await upsertVideo(formData);
        if (!video) router.push(`/admin/videos/${saved.id}`);
        else router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save video");
      }
    });
  };

  return (
    <form
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
    >
      {video ? <input type="hidden" name="id" value={video.id} /> : null}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto from title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locale">Locale</Label>
          <Input
            id="locale"
            name="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </div>
      </div>

      <MediaPickerField
        label="Content video"
        hint="MP4 or other video asset from the media library."
        idFieldName="contentMediaId"
        mediaId={contentMediaId || null}
        url={contentUrl}
        mediaTypes={["VIDEO"]}
        onChange={(value) => {
          setContentMediaId(value.mediaId ?? "");
          setContentUrl(value.url);
        }}
      />

      <MediaPickerField
        label="Thumbnail (JPG or PNG only)"
        hint="SVG posters are rejected. Use a real JPG/PNG frame."
        idFieldName="thumbnailMediaId"
        mediaId={thumbnailMediaId || null}
        url={thumbnailUrl}
        mediaTypes={["IMAGE"]}
        onChange={(value) => {
          const nextUrl = value.url;
          if (nextUrl && !isJpgOrPngThumbnail(null, nextUrl)) {
            setError("Thumbnail must be JPG or PNG (SVG is not allowed).");
            setThumbnailMediaId("");
            setThumbnailUrl("");
            setThumbnailMime("");
            return;
          }
          setError(null);
          setThumbnailMediaId(value.mediaId ?? "");
          setThumbnailUrl(nextUrl);
          setThumbnailMime("");
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="uploadDate">Upload / publish date</Label>
          <Input
            id="uploadDate"
            name="uploadDate"
            type="datetime-local"
            value={uploadDate}
            onChange={(e) => setUploadDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            name="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="PT2M30S or 150"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="embedUrl">Embed URL (optional)</Label>
        <Input
          id="embedUrl"
          name="embedUrl"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : video ? "Save changes" : "Create video"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/videos")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
