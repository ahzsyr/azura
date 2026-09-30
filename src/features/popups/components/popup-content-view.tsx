"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { sanitizePopupHtml } from "@/features/popups/lib/sanitize-html";
import type { PopupContent, PopupContentBlock, PopupCta } from "@/features/popups/popup.schema";

export type PopupContentVariant = "modal" | "slideIn" | "promo";

type Props = {
  content: PopupContent;
  className?: string;
  compact?: boolean;
  variant?: PopupContentVariant;
};

function CtaButton({
  cta,
  className,
  showArrow = false,
}: {
  cta: PopupCta;
  className?: string;
  showArrow?: boolean;
}) {
  if (!cta.label.trim()) return null;

  const external = cta.href.startsWith("http");
  const isPrimary = cta.variant === "primary";
  const classes = cn(
    "popup-cta",
    cta.variant === "primary" && "popup-cta--primary",
    cta.variant === "secondary" && "popup-cta--secondary",
    cta.variant === "outline" && "popup-cta--outline",
    cta.variant === "ghost" && "popup-cta--ghost",
    className,
  );

  const children = (
    <>
      <span>{cta.label}</span>
      {showArrow && isPrimary ? (
        <span className="popup-cta__arrow" aria-hidden>
          →
        </span>
      ) : null}
    </>
  );

  if (external || cta.openInNewTab) {
    return (
      <a
        href={cta.href || "#"}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={cta.href || "#"} className={classes}>
      {children}
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

function resolveLayout(
  variant: PopupContentVariant,
  content: PopupContent,
): "stack" | "split" | "banner" {
  if (variant === "promo") return "banner";
  if (variant === "modal" && Boolean(content.imageUrl.trim())) return "split";
  return "stack";
}

export function PopupContentView({
  content,
  className,
  compact = false,
  variant = "modal",
}: Props) {
  const layout = resolveLayout(variant, content);
  const hasCtas =
    content.primaryCta.label.trim() || content.secondaryCta.label.trim();
  const hasMedia = Boolean(content.imageUrl.trim()) || Boolean(content.videoUrl.trim());
  const showVideo = Boolean(content.videoUrl.trim()) && !content.imageUrl.trim();

  return (
    <div
      className={cn(
        "popup-content",
        layout === "stack" && "popup-content--stack",
        layout === "split" && "popup-content--split",
        layout === "banner" && "popup-content--banner",
        compact && "popup-content--compact",
        className,
      )}
    >
      {hasMedia && layout !== "banner" ? (
        <div className="popup-content__media">
          {content.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.imageUrl}
              alt={content.imageAlt || content.title || "Popup image"}
              className="popup-content__hero-image"
              loading="lazy"
            />
          ) : null}
          {showVideo ? (
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
        </div>
      ) : null}

      <div className="popup-content__copy">
        {layout === "banner" ? (
          <span className="popup-content__dot" aria-hidden />
        ) : null}

        {content.subtitle && layout !== "banner" ? (
          <p className="popup-content__eyebrow">{content.subtitle}</p>
        ) : null}

        {content.title ? <h3 className="popup-content__title">{content.title}</h3> : null}

        {layout !== "banner" && content.body ? (
          <p className="popup-content__body">{content.body}</p>
        ) : null}

        {layout !== "banner" && content.bodyHtml ? (
          <div
            className="popup-content__html"
            dangerouslySetInnerHTML={{ __html: sanitizePopupHtml(content.bodyHtml) }}
          />
        ) : null}

        {layout !== "banner"
          ? content.blocks.map((block) => <ContentBlock key={block.id} block={block} />)
          : null}

        {hasCtas ? (
          <div className="popup-content__actions">
            <CtaButton cta={content.primaryCta} showArrow />
            <CtaButton cta={content.secondaryCta} showArrow={false} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
