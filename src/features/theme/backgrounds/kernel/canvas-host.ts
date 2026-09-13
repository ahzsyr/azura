import type { BackgroundScope } from "../types";

export function sectionLayerBase(): string {
  return "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;overflow:hidden;";
}

export function createCanvas(
  id: string,
  scope: BackgroundScope,
  attr: "data-bg-effect" | "data-section-bg-effect",
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.setAttribute(attr, id);
  const isSite = scope.kind === "site";
  c.style.cssText = isSite
    ? "position:absolute;inset:0;pointer-events:none;z-index:0;width:100%;height:100%;"
    : `${sectionLayerBase()}`;
  scope.host.prepend(c);

  const resize = () => {
    if (isSite) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    } else {
      c.width = scope.host.clientWidth;
      c.height = scope.host.clientHeight;
    }
  };

  resize();

  if (isSite) {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        resize();
      }, 16);
    };
    window.addEventListener("resize", onResize);
    scope.resizeCleanupRef.current = () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  } else {
    const ro = new ResizeObserver(resize);
    ro.observe(scope.host);
    const prev = scope.resizeCleanupRef.current;
    scope.resizeCleanupRef.current = () => {
      ro.disconnect();
      prev?.();
    };
  }

  return c;
}
