"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { resolveMediaFlipBackExposed } from "../media-flip-exposure";

type UseMediaFlipTouchResult = {
  isFlipped: boolean;
  isHovered: boolean;
  isBackExposed: boolean;
  sceneRef: RefObject<HTMLDivElement | null>;
  closeFlip: () => void;
};

function prefersFinePointerHover(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Card-level hover exposure for flip/inert sync. Clicks navigate via face links. */
export function useMediaFlipTouch(): UseMediaFlipTouchResult {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isBackExposed = resolveMediaFlipBackExposed(isFlipped, isHovered);

  const restoreFocusToFront = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const active = document.activeElement;
    if (!(active instanceof Element) || !scene.contains(active)) return;

    const isBackFocus = Boolean(active.closest(".pl-card__flip-face--back"));
    if (!isBackFocus) return;

    const frontLink = scene.querySelector<HTMLElement>(".pl-card__flip-front-link");
    frontLink?.focus();
  }, []);

  const closeFlip = useCallback(() => {
    setIsFlipped(false);
    queueMicrotask(restoreFocusToFront);
  }, [restoreFocusToFront]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const card = scene.closest<HTMLElement>('.pl-card[data-prd-style="media_flip"]');
    if (!card) return;

    const onEnter = () => {
      if (prefersFinePointerHover()) setIsHovered(true);
    };

    const onLeave = () => {
      setIsHovered(false);
      if (prefersFinePointerHover()) {
        setIsFlipped(false);
        queueMicrotask(restoreFocusToFront);
      }
    };

    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mouseenter", onEnter);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, [restoreFocusToFront]);

  useEffect(() => {
    if (!isFlipped) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFlip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFlipped, closeFlip]);

  return {
    isFlipped,
    isHovered,
    isBackExposed,
    sceneRef,
    closeFlip,
  };
}
