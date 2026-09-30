export type EmbedInfo = {
  type: "youtube" | "vimeo" | "file" | "unknown";
  /** Base embed URL without autoplay query (callers add playback params). */
  embedSrc?: string;
  watchUrl: string;
  videoId?: string;
};

export function parseEmbedUrl(url: string): EmbedInfo {
  const trimmed = url.trim();
  if (!trimmed) return { type: "unknown", watchUrl: "" };

  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i) ??
    trimmed.match(/youtube\.com\/shorts\/([\w-]+)/i);
  if (ytMatch?.[1]) {
    const id = ytMatch[1];
    return {
      type: "youtube",
      videoId: id,
      embedSrc: `https://www.youtube.com/embed/${id}?rel=0`,
      watchUrl: trimmed,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    const id = vimeoMatch[1];
    return {
      type: "vimeo",
      videoId: id,
      embedSrc: `https://player.vimeo.com/video/${id}`,
      watchUrl: trimmed,
    };
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("http")) {
    return { type: "file", watchUrl: trimmed };
  }

  return { type: "unknown", watchUrl: trimmed };
}

export function isEmbedUrl(url: string): boolean {
  const info = parseEmbedUrl(url);
  return info.type === "youtube" || info.type === "vimeo";
}

/** Build iframe src with optional autoplay for YouTube/Vimeo. */
export function buildEmbedPlaybackSrc(info: EmbedInfo, autoplay: boolean): string | undefined {
  if (!info.embedSrc) return undefined;
  if (!autoplay) return info.embedSrc;
  if (info.type === "youtube") {
    return info.embedSrc.includes("?")
      ? `${info.embedSrc}&autoplay=1`
      : `${info.embedSrc}?autoplay=1`;
  }
  if (info.type === "vimeo") {
    return info.embedSrc.includes("?")
      ? `${info.embedSrc}&autoplay=1`
      : `${info.embedSrc}?autoplay=1`;
  }
  return info.embedSrc;
}
