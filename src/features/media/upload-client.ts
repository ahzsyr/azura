"use client";

import type { MediaType } from "@prisma/client";

export type MediaUploadResult = {
  id: string;
  url: string;
  mediaType: MediaType;
  filename: string;
};

type UploadOptions = {
  folderId?: string | null;
  mediaType?: MediaType;
  replaceId?: string;
};

export async function uploadMediaFile(
  file: File,
  options: UploadOptions = {}
): Promise<MediaUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  if (options.mediaType) fd.append("mediaType", options.mediaType);
  if (options.folderId) fd.append("folderId", options.folderId);
  if (options.replaceId) fd.append("replaceId", options.replaceId);

  const res = await fetch("/api/media/upload", { method: "POST", body: fd });
  const data = (await res.json()) as Partial<MediaUploadResult> & { error?: string };
  if (!res.ok || !data.id || !data.url || !data.mediaType) {
    throw new Error(data.error ?? "Upload failed");
  }

  return {
    id: data.id,
    url: data.url,
    mediaType: data.mediaType,
    filename: file.name,
  };
}

export async function uploadMediaFiles(
  files: FileList | File[],
  options: UploadOptions = {}
): Promise<MediaUploadResult[]> {
  const results: MediaUploadResult[] = [];
  for (const file of Array.from(files)) {
    results.push(await uploadMediaFile(file, options));
  }
  return results;
}
