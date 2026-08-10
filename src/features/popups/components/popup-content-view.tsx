"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { sanitizePopupHtml } from "@/features/popups/lib/sanitize-html";
import type { PopupContent, PopupContentBlock, PopupCta } from "@/features/popups/popup.schema";

type Props = {
  content: PopupContent;
  className?: string;
  compact?: boolean;
};

function CtaButton({ cta, className }: { cta: PopupCta; className?: string }) {
  if (!cta.label.trim()) return null;

  const external = cta.href.startsWith("http");
  const classes = cn(
    "popup-cta",
    cta.variant === "primary" && "popup-cta--primary",
    cta.variant === "secondary" && "popup-cta--secondary",
    cta.variant === "outline" && "popup-cta--outline",
    cta.variant === "ghost" && "popup-cta--ghost",
    className,
  );

  if (external || cta.openInNewTab) {
    return (
      <a
        href={cta.href || "#"}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
      >
        {cta.label}
      </a>
    );
  }

  return (
    <Link href={cta.href || "#"} className={classes}>
      {cta.label}
    </Link>
  );
}

function ContentBlock({ block }: { block: PopupContentBlock }) {
  switch (block.type) {
    case "text":
      return block.text ? <p className="popup-content__text">{block.text}</p> : null;
    case "html":
      return block.html ? (
        <div
          className="popup-content__html"
          dangerouslySetInnerHTML={{ __html: sanitizePopupHtml(block.html) }}
        />
      ) : null;
    case "image":
      return block.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.imageUrl}
          alt={block.imageAlt || ""}
          className="popup-content__image"
          loading="lazy"
        />
      ) : null;
    case "video":
      return block.videoUrl ? (
        <div className="popup-content__video">
          <iframe
            src={block.videoUrl}
            title="Popup video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null;
    case "spacer":
      return <div style={{ height: block.heightPx }} aria-hidden />;
    default:
      return null;
  }
}

export function PopupContentView({ content, className, compact = false }: Props) {
  const hasCtas =
    content.primaryCta.label.trim() || content.secondaryCta.label.trim();

  return (
    <div className={cn("popup-content", compact && "popup-content--compact", className)}>
      {content.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content.imageUrl}
          alt={content.imageAlt || content.title || "Popup image"}
          className="popup-content__hero-image"
          loading="lazy"
        />
      ) : null}

      {content.videoUrl && !content.imageUrl ? (
        <div className="popup-content__video">
          <iframe
            src={content.videoUrl}
            title={content.title || "Popup video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {content.title ? <h3 className="popup-content__title">{content.title}</h3> : null}
      {content.subtitle ? <p className="popup-content__subtitle">{content.subtitle}</p> : null}
      {content.body ? <p className="popup-content__body">{content.body}</p> : null}
      {content.bodyHtml ? (
        <div
          className="popup-content__html"
          dangerouslySetInnerHTML={{ __html: sanitizePopupHtml(content.bodyHtml) }}
        />
      ) : null}

      {content.blocks.map((block) => (
        <ContentBlock key={block.id} block={block} />
      ))}

      {hasCtas ? (
        <div className="popup-content__actions">
          <CtaButton cta={content.primaryCta} />
          <CtaButton cta={content.secondaryCta} />
        </div>
      ) : null}
    </div>
  );
}
