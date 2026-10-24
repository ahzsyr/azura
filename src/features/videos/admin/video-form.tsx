"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import type { VideoAdmin } from "@/features/videos/types";
import { upsertVideo } from "@/features/videos/actions";
import { isJpgOrPngThumbnail } from "@/features/videos/video-validation";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { AdminPageConfigRegistrar } from "@/components/admin/layout/admin-page-config-registrar";
import { useAdminPageActions } from "@/hooks/use-admin-page-actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const setSaveStatus = useAdminUiStore((s) => s.setSaveStatus);
  const markSaved = useAdminUiStore((s) => s.markSaved);

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

  const persist = useCallback(
    async (nextStatus?: "DRAFT" | "PUBLISHED") => {
      const form = formRef.current;
      if (!form || !form.reportValidity()) return false;
      setError(null);
      if (!contentMediaId) {
        setError("Select a content video from the media library.");
        setSaveStatus("error");
        return false;
      }
      if (!thumbnailMediaId) {
        setError("Select a JPG or PNG thumbnail.");
        setSaveStatus("error");
        return false;
      }
      if (!isJpgOrPngThumbnail(thumbnailMime, thumbnailUrl)) {
        setError("Thumbnail must be JPG or PNG (SVG is not allowed).");
        setSaveStatus("error");
        return false;
      }

      const formData = new FormData(form);
      formData.set("contentMediaId", contentMediaId);
      formData.set("thumbnailMediaId", thumbnailMediaId);
      formData.set("title", title);
      formData.set("description", description);
      formData.set("slug", slug);
      formData.set("locale", locale);
      formData.set("duration", duration);
      formData.set("embedUrl", embedUrl);
      formData.set("status", nextStatus ?? status);
      formData.set("uploadDate", uploadDate);

      setSaveStatus("saving");
      try {
        const saved = await upsertVideo(formData);
        if (nextStatus) setStatus(nextStatus);
        markSaved();
        if (!video) router.push(`/admin/videos/${saved.id}`);
        else router.refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save video");
        setSaveStatus("error");
        return false;
      }
    },
    [
      contentMediaId,
      description,
      duration,
      embedUrl,
      locale,
      markSaved,
      router,
      setSaveStatus,
      slug,
      status,
      thumbnailMediaId,
      thumbnailMime,
      thumbnailUrl,
      title,
      uploadDate,
      video,
    ],
  );

  const handleSave = useCallback(() => {
    startTransition(() => {
      void persist();
    });
  }, [persist]);

  const handlePublish = useCallback(async () => {
    const ok = await persist("PUBLISHED");
    if (!ok) throw new Error("Publish failed");
  }, [persist]);

  const handleCancel = useCallback(() => {
    setTitle(video?.title ?? "");
    setDescription(video?.description ?? "");
    setSlug(video?.slug ?? "");
    setLocale(video?.locale ?? "en");
    setDuration(video?.duration ?? "");
    setEmbedUrl(video?.embedUrl ?? "");
    setStatus(video?.status ?? "DRAFT");
    setUploadDate(toDatetimeLocalValue(video?.uploadDate) || toDatetimeLocalValue(new Date()));
    setContentMediaId(video?.contentMediaId ?? "");
    setContentUrl(video?.contentMedia?.url ?? "");
    setThumbnailMediaId(video?.thumbnailMediaId ?? "");
    setThumbnailUrl(video?.thumbnailMedia?.url ?? "");
    setThumbnailMime(video?.thumbnailMedia?.mimeType ?? "");
    setError(null);
    markSaved();
  }, [markSaved, video]);

  useAdminPageActions({
    ownerKey: "video-editor",
    scope: "editor",
    priority: 0,
    onSave: handleSave,
    onPublish: handlePublish,
    onCancel: handleCancel,
    canCancel: true,
    canPublish: !pending,
    canSave: !pending,
    saveStatusMode: "self-managed",
  });

  return (
    <form
      ref={formRef}
      className="mx-auto max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <AdminPageConfigRegistrar configKey="entityEditor" />
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

      <div className="flex gap-2 lg:hidden">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/videos")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
