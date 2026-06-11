"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ANNOUNCEMENT_BAR_PROPS,
  type AnnouncementBarProps,
} from "@/features/announcement-bar/announcement-bar.schema";
import { normalizeAnnouncementItems } from "@/features/announcement-bar/normalize-announcement-items";
import { AnnouncementBarChunk } from "@/features/announcement-bar/announcement-bar-chunk";
import {
  buildCssVars,
  getBarStyles,
  getEntranceClass,
  getTextStyles,
  resolveBarTone,
  scrollDurationSec,
} from "@/features/announcement-bar/announcement-bar-utils";
import "@/styles/announcement-bar.css";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = AnnouncementBarProps & {
  locale?: string;
  barId?: string;
  dismissStorageKey?: string;
  suppressWhenPageHasBlock?: boolean;
  className?: string;
};

const FALLBACK_LINE = {
  message: "Add announcements in the CMS or page editor.",
  href: "",
  icon: undefined as string | undefined,
  badge: undefined as string | undefined,
};

export function AnnouncementBarView({
  locale,
  barId: barIdProp,
  dismissStorageKey,
  suppressWhenPageHasBlock = false,
  className,
  variant = "slim",
  barTone: barToneRaw = "accent",
  scrollSpeed = "medium",
  direction = "left",
  pauseOnHover = true,
  showEdgeFade = true,
  separator,
  items,
  visual = DEFAULT_ANNOUNCEMENT_BAR_PROPS.visual,
  layout = DEFAULT_ANNOUNCEMENT_BAR_PROPS.layout,
  animations = DEFAULT_ANNOUNCEMENT_BAR_PROPS.animations,
  interactive = DEFAULT_ANNOUNCEMENT_BAR_PROPS.interactive,
  responsive = DEFAULT_ANNOUNCEMENT_BAR_PROPS.responsive,
  advanced = DEFAULT_ANNOUNCEMENT_BAR_PROPS.advanced,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const barId = barIdProp ?? `announcement-bar-${reactId}`;
  const storageKey = dismissStorageKey ?? `${barId}_closed`;

  const barTone = resolveBarTone(barToneRaw);
  const lines = normalizeAnnouncementItems(items, locale);
  const rows = lines.length > 0 ? lines : [FALLBACK_LINE];
  const sep = typeof separator === "string" && separator.length > 0 ? separator : " · ";

  const durationSec = scrollDurationSec(scrollSpeed, animations.scrollSpeedCustom);
  const mobileSpeed = responsive.mobileSpeed || scrollSpeed;
  const mobileDurationSec = scrollDurationSec(mobileSpeed);

  const showCloseButton = layout.showCloseButton !== false;
  const persistent = layout.persistent !== false;

  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [closed, setClosed] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  const heightClass = variant === "comfortable" ? "az-ab--comfortable" : "az-ab--slim";
  const entranceClass = getEntranceClass(animations);
  const barStyles = getBarStyles(visual, layout);
  const textStyles = getTextStyles(visual);
  const cssVars = buildCssVars({
    durationSec,
    mobileDurationSec,
    visual,
    animations,
    responsive,
    showCloseButton,
  });

  const trackPauseHover = pauseOnHover && animations.hoverPause !== false;

  const fireAnalytics = useCallback(
    (event: string, label?: string, nonInteraction?: boolean) => {
      if (!advanced.analyticsEvents || typeof window.gtag !== "function") return;
      window.gtag("event", event, {
        event_category: advanced.analyticsCategory || "bar",
        event_label: label ?? advanced.analyticsCategory ?? "bar",
        ...(nonInteraction ? { non_interaction: true } : {}),
      });
    },
    [advanced.analyticsEvents, advanced.analyticsCategory],
  );

  useEffect(() => {
    if (persistent) return;
    try {
      if (localStorage.getItem(storageKey) === "true") {
        setClosed(true);
      }
    } catch {
      /* ignore */
    }
  }, [persistent, storageKey]);

  useEffect(() => {
    if (!suppressWhenPageHasBlock) return;
    const hasPageBlock = document.querySelector('[data-block-type="announcementBar"]');
    if (hasPageBlock) setSuppressed(true);
  }, [suppressWhenPageHasBlock]);

  useEffect(() => {
    if (!interactive.closeAfterSeconds || closed) return;
    const timer = window.setTimeout(() => {
      setClosed(true);
      fireAnalytics("announcement_close");
    }, interactive.closeAfterSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [interactive.closeAfterSeconds, closed, fireAnalytics]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !advanced.analyticsEvents) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fireAnalytics("announcement_impression", undefined, true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(bar);
    return () => observer.disconnect();
  }, [advanced.analyticsEvents, fireAnalytics]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !advanced.analyticsEvents) return;
    const links = bar.querySelectorAll<HTMLAnchorElement>(".az-ab__link");
    const handlers: Array<{ el: HTMLAnchorElement; fn: () => void }> = [];
    links.forEach((link) => {
      const fn = () => fireAnalytics("announcement_click", link.textContent?.trim() || "link");
      link.addEventListener("click", fn);
      handlers.push({ el: link, fn });
    });
    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener("click", fn));
    };
  }, [advanced.analyticsEvents, fireAnalytics, rows]);

  useEffect(() => {
    const progressBar = progressRef.current;
    const track = trackRef.current;
    if (!progressBar || !interactive.showProgress || !track) return;

    const duration = durationSec * 1000;
    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = "100%";

    const onIteration = () => {
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";
      window.setTimeout(() => {
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = "100%";
      }, 50);
    };

    track.addEventListener("animationiteration", onIteration);
    return () => track.removeEventListener("animationiteration", onIteration);
  }, [interactive.showProgress, durationSec]);

  useEffect(() => {
    if (!layout.stickyOnScroll) return;
    const bar = barRef.current;
    if (!bar) return;
    const stickyOffset = layout.stickyOffset || 0;
    const onScroll = () => {
      if (window.scrollY > stickyOffset) {
        bar.classList.add("is-sticky");
      } else {
        bar.classList.remove("is-sticky");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [layout.stickyOnScroll, layout.stickyOffset]);

  const handleClose = () => {
    setClosed(true);
    if (!persistent) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        /* ignore */
      }
    }
    fireAnalytics("announcement_close");
  };

  if (closed || suppressed) return null;

  const dataAttributes = advanced.dataAttributes ?? {};
  const viewportStyle = layout.containerMaxWidth
    ? { maxWidth: layout.containerMaxWidth, margin: "0 auto" as const }
    : undefined;
  const trackStyle = animations.easing
    ? { animationTimingFunction: animations.easing }
    : undefined;

  return (
    <>
      <div
        ref={barRef}
        id={barId}
        className={cn(
          "az-ab",
          heightClass,
          `az-ab--tone-${barTone}`,
          showEdgeFade && "az-ab--fade",
          entranceClass,
          layout.stickyOnScroll && "sticky-on-scroll",
          responsive.hideOnMobile && "az-ab--hide-mobile",
          advanced.containerClass,
          className,
        )}
        style={{ ...cssVars, ...barStyles }}
        data-pause-hover={trackPauseHover ? "true" : "false"}
        data-closable={showCloseButton}
        data-persistent={persistent}
        role="region"
        aria-label={advanced.ariaLabel || "Announcement bar"}
        {...dataAttributes}
      >
        {interactive.showProgress && (
          <div
            ref={progressRef}
            className="az-ab-progress"
            style={{
              height: interactive.progressHeight || "2px",
              background: interactive.progressColor || "var(--color-accent)",
            }}
          />
        )}

        {showCloseButton && (
          <button
            type="button"
            className={cn(
              "az-ab-close",
              layout.closeButtonPosition === "left" ? "az-ab-close--left" : "az-ab-close--right",
            )}
            aria-label="Close announcement bar"
            onClick={handleClose}
            style={{ color: visual.textColor || "var(--color-text-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <div className="az-ab__viewport" style={viewportStyle}>
          <div
            ref={trackRef}
            className={cn("az-ab__track", direction === "right" && "az-ab__track--rtl")}
            style={trackStyle}
          >
            <AnnouncementBarChunk
              lines={rows}
              sep={sep}
              visual={visual}
              interactive={interactive}
              animations={animations}
              textStyles={textStyles}
              blinkLinks
            />
            <AnnouncementBarChunk
              lines={rows}
              sep={sep}
              visual={visual}
              interactive={interactive}
              animations={animations}
              textStyles={textStyles}
              ariaHidden
              tabIndexLinks={-1}
            />
          </div>
        </div>
      </div>

      {advanced.customCss?.trim() ? (
        <style dangerouslySetInnerHTML={{ __html: advanced.customCss }} />
      ) : null}
    </>
  );
}
