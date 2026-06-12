"use client";

import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { NormalizedAnnouncementLine } from "@/features/announcement-bar/normalize-announcement-items";
import type {
  AnnouncementBarAnimations,
  AnnouncementBarInteractive,
  AnnouncementBarVisual,
} from "@/features/announcement-bar/announcement-bar.schema";
import { isInternalHref } from "@/features/announcement-bar/announcement-bar-utils";

type ChunkProps = {
  lines: NormalizedAnnouncementLine[];
  sep: string;
  visual: AnnouncementBarVisual;
  interactive: AnnouncementBarInteractive;
  animations: AnnouncementBarAnimations;
  textStyles: CSSProperties;
  ariaHidden?: boolean;
  tabIndexLinks?: number;
  blinkLinks?: boolean;
};

function truncateStyle(lineClamp?: number): CSSProperties | undefined {
  if (!lineClamp) return undefined;
  return {
    display: "-webkit-box",
    WebkitLineClamp: lineClamp,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function LineContent({
  line,
  visual,
  interactive,
  animations,
  blink,
  tabIndex,
}: {
  line: NormalizedAnnouncementLine;
  visual: AnnouncementBarVisual;
  interactive: AnnouncementBarInteractive;
  animations: AnnouncementBarAnimations;
  blink?: boolean;
  tabIndex?: number;
}) {
  const linkStyle: CSSProperties = {
    color: visual.linkColor || "var(--color-text)",
    ...(visual.linkHoverColor ? { ["--hover-color" as string]: visual.linkHoverColor } : {}),
    ...(animations.hoverScale ? { transition: "transform 0.2s ease" } : {}),
  };

  const text =
    interactive.truncateText && interactive.lineClamp ? (
      <span style={truncateStyle(interactive.lineClamp)}>{line.message}</span>
    ) : (
      line.message
    );

  if (line.href) {
    const href = typeof line.href === "string" ? line.href : String(line.href ?? "");
    const className = cn("az-ab__link", blink && "blink-effect");
    if (isInternalHref(href)) {
      return (
        <Link href={href} className={className} style={linkStyle} tabIndex={tabIndex}>
          {text}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className={className}
        style={linkStyle}
        tabIndex={tabIndex}
        rel="noopener noreferrer"
      >
        {text}
      </a>
    );
  }

  return (
    <span
      className="az-ab__text"
      style={
        interactive.truncateText && interactive.lineClamp
          ? truncateStyle(interactive.lineClamp)
          : undefined
      }
    >
      {line.message}
    </span>
  );
}

export function AnnouncementBarChunk({
  lines,
  sep,
  visual,
  interactive,
  animations,
  textStyles,
  ariaHidden,
  tabIndexLinks,
  blinkLinks,
}: ChunkProps) {
  const badgeClass = (style: AnnouncementBarVisual["badgeStyle"]) =>
    cn("az-ab__badge", style === "rounded" ? "rounded" : style === "pill" ? "pill" : "default");
  const separatorStyle = { color: visual.separatorColor || "var(--color-primary)" };

  const chunkStyle: CSSProperties = {
    ...textStyles,
    gap: visual.iconPosition === "right" ? 0 : "0.5rem",
    ...(visual.letterSpacing
      ? { ["--az-ab-letter-spacing" as string]: visual.letterSpacing }
      : {}),
  };

  return (
    <div
      className="az-ab__chunk"
      aria-hidden={ariaHidden || undefined}
      style={chunkStyle}
    >
      {lines.map((line, i) => (
        <span key={`${ariaHidden ? "dup" : "main"}-${i}-${line.message}`} className="az-ab__item-wrapper">
          {i > 0 && (
            <span className="az-ab__sep" style={separatorStyle}>
              {sep}
            </span>
          )}
          {visual.showBadges !== false && line.badge && (
            <span
              className={badgeClass(visual.badgeStyle)}
              style={{
                background: visual.badgeBackground || "var(--color-primary)",
                color: visual.badgeColor || "var(--color-bg)",
              }}
            >
              {line.badge}
            </span>
          )}
          {visual.showIcons !== false && line.icon && visual.iconPosition !== "right" && (
            <span className="az-ab__icon" style={{ fontSize: visual.iconSize || "0.9rem" }}>
              {line.icon}
            </span>
          )}
          <LineContent
            line={line}
            visual={visual}
            interactive={interactive}
            animations={animations}
            blink={blinkLinks && animations.blinkEffect}
            tabIndex={tabIndexLinks}
          />
          {visual.showIcons !== false && line.icon && visual.iconPosition === "right" && (
            <span className="az-ab__icon" style={{ fontSize: visual.iconSize || "0.9rem" }}>
              {line.icon}
            </span>
          )}
        </span>
      ))}
      {lines.length > 0 && (
        <span className="az-ab__sep" style={separatorStyle}>
          {sep}
        </span>
      )}
    </div>
  );
}
