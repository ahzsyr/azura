export type EmbedInfo = {
  type: "youtube" | "vimeo" | "file" | "unknown";
  embedSrc?: string;
  watchUrl: string;
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
      embedSrc: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      watchUrl: trimmed,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    const id = vimeoMatch[1];
    return {
      type: "vimeo",
      embedSrc: `https://player.vimeo.com/video/${id}?autoplay=1`,
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
