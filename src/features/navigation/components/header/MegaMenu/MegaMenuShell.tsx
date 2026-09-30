"use client";

import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import type { MegaMenuViewModel } from "@/features/navigation/mega-menu-resolver";
import { cn } from "@/lib/utils";
import { MegaMenuSidebar } from "./MegaMenuSidebar";
import { MegaMenuPanelRenderer } from "./MegaMenuPanelRenderer";

type Props = {
  view: MegaMenuViewModel;
  isOpen?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onLinkClick?: () => void;
};

function flyoutPointerProps(
  onMouseEnter?: () => void,
  onMouseLeave?: () => void,
): Pick<HTMLAttributes<HTMLDivElement>, "onMouseEnter" | "onMouseLeave"> {
  if (!onMouseEnter && !onMouseLeave) return {};
  return { onMouseEnter, onMouseLeave };
}

export function MegaMenuShell({ view, isOpen, onMouseEnter, onMouseLeave, onLinkClick }: Props) {
  const [activePanelId, setActivePanelId] = useState<string | null>(view.activePanelId);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePanelId(view.activePanelId);
  }, [view.activePanelId]);

  const showRail = view.type === "sidebar" && view.navigation?.enabled && (view.navigation.items?.length ?? 0) > 0;
  const activePanel =
    view.panels.find((p) => p.id === activePanelId) ?? view.panels[0] ?? null;

  const pointerProps = flyoutPointerProps(onMouseEnter, onMouseLeave);
  const style = view.cssVars as CSSProperties;

  return (
    <div
      className={cn("mega-menu hb-mega-v2", isOpen && "is-open")}
      data-mega-menu={view.type}
      data-surface-width={view.surface.surfaceWidth}
      data-surface-align={view.surface.alignment}
      data-has-rail={showRail ? "true" : "false"}
      {...pointerProps}
      style={style}
    >
      <div className="mega-inner hb-mega-v2__inner">
        <div className={cn("hb-mega-v2__layout", showRail && "hb-mega-v2__layout--rail")}>
          {showRail && view.navigation ? (
            <MegaMenuSidebar
              items={view.navigation.items}
              activePanelId={activePanel?.id ?? null}
              onSelectPanel={setActivePanelId}
            />
          ) : null}
          <div className="hb-mega-v2__content" key={activePanel?.id ?? "empty"}>
            {activePanel ? (
              <MegaMenuPanelRenderer panel={activePanel} onLinkClick={onLinkClick} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Thin wrapper when shell is used with children override (unused today). */
export function MegaMenuShellFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("hb-mega-v2", className)}>{children}</div>;
}
