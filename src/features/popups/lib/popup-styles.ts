import type { CSSProperties } from "react";
import type { PopupCustomOffset, PopupDesign, PopupItem } from "@/features/popups/popup.schema";

export function getPopupPositionStyle(
  item: Pick<PopupItem, "position" | "customOffset" | "zIndex">,
): CSSProperties {
  const { position, customOffset, zIndex } = item;
  const style: CSSProperties = { zIndex };

  const offset = customOffset as PopupCustomOffset;

  switch (position) {
    case "bottom-start":
      style.bottom = `${24 + offset.bottom}px`;
      style.insetInlineStart = `${24 + offset.left}px`;
      break;
    case "bottom-end":
      style.bottom = `${24 + offset.bottom}px`;
      style.insetInlineEnd = `${24 + offset.right}px`;
      break;
    case "top-start":
      style.top = `${80 + offset.top}px`;
      style.insetInlineStart = `${24 + offset.left}px`;
      break;
    case "top-end":
      style.top = `${80 + offset.top}px`;
      style.insetInlineEnd = `${24 + offset.right}px`;
      break;
    case "left":
      style.top = "50%";
      style.insetInlineStart = `${24 + offset.left}px`;
      style.transform = "translateY(-50%)";
      break;
    case "right":
      style.top = "50%";
      style.insetInlineEnd = `${24 + offset.right}px`;
      style.transform = "translateY(-50%)";
      break;
    case "top":
      style.top = `${80 + offset.top}px`;
      style.left = `${24 + offset.left}px`;
      style.right = `${24 + offset.right}px`;
      break;
    case "bottom":
      style.bottom = `${24 + offset.bottom}px`;
      style.left = `${24 + offset.left}px`;
      style.right = `${24 + offset.right}px`;
      break;
    case "center":
      style.top = "50%";
      style.left = "50%";
      style.transform = "translate(-50%, -50%)";
      break;
    case "custom":
      if (offset.top) style.top = `${offset.top}px`;
      if (offset.right) style.insetInlineEnd = `${offset.right}px`;
      if (offset.bottom) style.bottom = `${offset.bottom}px`;
      if (offset.left) style.insetInlineStart = `${offset.left}px`;
      break;
    default:
      break;
  }

  return style;
}

export function getPopupDesignStyle(design: PopupDesign): CSSProperties {
  const style: CSSProperties = {
    borderRadius: `${design.borderRadius}px`,
    padding: `${design.padding}px`,
    fontSize: `${design.fontSize}px`,
    fontWeight: design.fontWeight,
    animationDuration: `${design.animationDurationMs}ms`,
  };

  if (design.backgroundColor) style.backgroundColor = design.backgroundColor;
  if (design.textColor) style.color = design.textColor;
  if (design.fontFamily) style.fontFamily = design.fontFamily;
  if (design.borderWidth > 0) {
    style.borderWidth = `${design.borderWidth}px`;
    style.borderStyle = "solid";
    style.borderColor = design.borderColor || "color-mix(in srgb, var(--primary) 25%, transparent)";
  }
  if (design.boxShadow) style.boxShadow = design.boxShadow;
  if (design.width > 0) style.width = `${design.width}px`;
  if (design.maxWidth > 0) style.maxWidth = `${design.maxWidth}px`;
  if (design.minHeight > 0) style.minHeight = `${design.minHeight}px`;

  return style;
}

export function getPopupAnimationClass(animation: PopupDesign["animation"]): string {
  switch (animation) {
    case "fade":
      return "popup-anim-fade";
    case "slide":
      return "popup-anim-slide";
    case "scale":
      return "popup-anim-scale";
    case "bounce":
      return "popup-anim-bounce";
    default:
      return "popup-anim-none";
  }
}
