"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { LayoutDirection } from "@/shared/layout/direction/direction-types";
import type { SearchInputStyle } from "./search-input-shell";
import type { ResolvedSearchModalStyle } from "./search-modal-style";
import { searchModalStyleToCssVars } from "./search-modal-style";

export type SearchPanelWidth = "sm" | "md" | "lg" | "xl";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  /** When true (default), search UI consumes global theme CSS variables. */
  inheritGlobalTheme?: boolean;
  inputStyle?: SearchInputStyle;
  panelWidth?: SearchPanelWidth;
  modalStyle?: ResolvedSearchModalStyle;
  dir?: LayoutDirection;
};

export function SearchThemeRoot({
  children,
  className,
  style,
  inheritGlobalTheme = true,
  inputStyle,
  panelWidth = "lg",
  modalStyle,
  dir,
}: Props) {
  const modal = modalStyle ?? {
    panelStyle: "solid" as const,
    overlayOpacity: 78,
    overlayBlurPx: 16,
    panelOpacity: 98,
    panelBlurPx: 0,
  };

  return (
    <div
      className={cn(
        "sm-search-root",
        inheritGlobalTheme && "sm-search-root--theme",
        `sm-search-root--modal-${modal.panelStyle}`,
        inputStyle && `sm-search-root--input-${inputStyle}`,
        panelWidth && `sm-search-root--width-${panelWidth}`,
        className
      )}
      style={{ ...searchModalStyleToCssVars(modal), ...style }}
      data-search-theme={inheritGlobalTheme ? "inherit" : "standalone"}
      data-search-panel-style={modal.panelStyle}
      dir={dir}
    >
      {children}
    </div>
  );
}
