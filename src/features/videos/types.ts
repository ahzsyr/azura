import type { VideoStatus } from "@prisma/client";

export type VideoMediaRef = {
  id: string;
  url: string;
  mimeType: string;
  mediaType: string;
  filename: string;
};

export type VideoAdmin = {
  id: string;
  slug: string;
  title: string;
  description: string;
  locale: string;
  status: VideoStatus;
  contentMediaId: string;
  thumbnailMediaId: string;
  uploadDate: Date;
  duration: string | null;
  embedUrl: string | null;
  contentMedia: VideoMediaRef;
  thumbnailMedia: VideoMediaRef;
  createdAt: Date;
  updatedAt: Date;
};

export type VideoPublic = {
  id: string;
  slug: string;
  title: string;
  description: string;
  locale: string;
  uploadDate: Date;
  duration: string | null;
  embedUrl: string | null;
  contentUrl: string;
  thumbnailUrl: string;
  contentMimeType: string;
  thumbnailMimeType: string;
};

export type VideoWatchSchemaInput = {
  name: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  uploadDate: string;
  duration?: string;
};

export type VideoCreateInput = {
  slug?: string;
  title: string;
  description: string;
  locale?: string;
  status?: VideoStatus;
  contentMediaId: string;
  thumbnailMediaId: string;
  uploadDate: Date;
  duration?: string | null;
  embedUrl?: string | null;
};

export type VideoUpdateInput = Partial<VideoCreateInput>;
