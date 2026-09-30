import {
  Facebook,
  Github,
  Globe,
  Image,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { SectionRenderProps } from "../types";
import { inferPlatformKey } from "./platforms";

/* ── Icon registry ─────────────────────────────────────── */

const LUCIDE_SOCIAL: Record<string, ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  tiktok: Music2,
  pinterest: Image,
  github: Github,
  discord: MessageCircle,
  twitch: Twitch,
  reddit: Globe,
  snapchat: Globe,
};

function SocialIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = LUCIDE_SOCIAL[platform.toLowerCase()] ?? Globe;
  return <Icon className={className} />;
}

/* ── Icon size map ─────────────────────────────────────── */

const SIZE_CLASS: Record<string, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/* ── Renderer ──────────────────────────────────────────── */

export function SocialRenderer({ column: col, ctx }: SectionRenderProps) {
  const { social, headingClass, linkClass } = ctx;

  // Determine which social entries to show
  let entries: { key: string; label: string; url: string }[] = [];

  if (col.socialSource === "custom") {
    // Use the links array from the column (label = platform name, href = URL)
    entries = (col.links ?? [])
      .filter((l) => l.href?.trim())
      .map((l) => ({
        key: inferPlatformKey(l.label || l.href),
        label: l.label || l.href,
        url: l.href,
      }));
  } else {
    // Use company social settings
    entries = Object.entries(social ?? {})
      .filter(([, url]) => Boolean(url))
      .map(([name, url]) => ({
        key: inferPlatformKey(name),
        label: name,
        url: url as string,
      }));
  }

  if (entries.length === 0) return null;

  const showIcons = col.socialStyle === "icons" || col.socialStyle === "icons-text";
  const showText = col.socialStyle === "text" || col.socialStyle === "icons-text";
  const iconClass = SIZE_CLASS[col.socialIconSize] ?? SIZE_CLASS.md;
  const isHorizontal = col.socialLayout !== "vertical";

  return (
    <div>
      {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
      <ul
        className={cn(
          "flex gap-3",
          isHorizontal ? "flex-row flex-wrap items-center" : "flex-col",
        )}
      >
        {entries.map(({ key, label, url }) => (
          <li key={`${key}-${url}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className={cn(
                linkClass,
                "inline-flex items-center gap-1.5 capitalize transition-opacity hover:opacity-80",
                col.socialStyle === "icons" && "rounded-md p-1",
              )}
            >
              {showIcons && <SocialIcon platform={key} className={iconClass} />}
              {showText && <span className="text-sm">{label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
