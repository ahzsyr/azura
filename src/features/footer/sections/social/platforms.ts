/**
 * Canonical list of supported social platforms.
 * `icon` is a Lucide icon name used by both the editor (client) and renderer (server).
 */
export type SocialPlatform = {
  key: string;
  label: string;
  /** Lucide icon component name */
  icon: string;
  placeholder: string;
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "facebook", label: "Facebook", icon: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", icon: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "twitter", label: "Twitter / X", icon: "Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube", icon: "Youtube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "linkedin", label: "LinkedIn", icon: "Linkedin", placeholder: "https://linkedin.com/company/..." },
  { key: "tiktok", label: "TikTok", icon: "Music2", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "pinterest", label: "Pinterest", icon: "Image", placeholder: "https://pinterest.com/yourprofile" },
  { key: "github", label: "GitHub", icon: "Github", placeholder: "https://github.com/youraccount" },
  { key: "discord", label: "Discord", icon: "MessageCircle", placeholder: "https://discord.gg/..." },
  { key: "twitch", label: "Twitch", icon: "Twitch", placeholder: "https://twitch.tv/yourchannel" },
  { key: "reddit", label: "Reddit", icon: "Globe", placeholder: "https://reddit.com/r/..." },
  { key: "snapchat", label: "Snapchat", icon: "Globe", placeholder: "https://snapchat.com/..." },
];

/** Map from lowercase platform key → Lucide icon name */
export const PLATFORM_ICON_MAP: Record<string, string> = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.key, p.icon]),
);

/** Infer a platform key from a URL or label string (best-effort). */
export function inferPlatformKey(labelOrUrl: string): string {
  const s = labelOrUrl.toLowerCase();
  for (const p of SOCIAL_PLATFORMS) {
    if (s.includes(p.key)) return p.key;
  }
  return "globe";
}
