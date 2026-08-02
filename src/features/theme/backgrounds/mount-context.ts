import { readBackgroundConfig } from "./config-reader";
import { bindMountContextColors } from "./kernel/color-context";
import { runCanvasLoop } from "./kernel/animation-loop";
import { acquireMouseTracker, releaseMouseTracker } from "./kernel/mouse-tracker";
import { bindVisibilityPause } from "./visibility-controller";
import type { BackgroundMountContext, BackgroundRuntimeConfig, BackgroundScope } from "./types";

export function createScope(
  kind: "site" | "section",
  host: HTMLElement,
): BackgroundScope {
  return {
    kind,
    host,
    loopStopRef: { current: null },
    resizeCleanupRef: { current: null },
  };
}

export function createMountContext(
  scope: BackgroundScope,
  config?: Partial<BackgroundRuntimeConfig>,
  options?: { trackMouse?: boolean },
): BackgroundMountContext {
  const runtime: BackgroundRuntimeConfig = {
    ...readBackgroundConfig(),
    ...config,
  };

  let visibilityActive = true;
  let visibilityCleanup: (() => void) | null = null;

  const ctx: BackgroundMountContext = {
    scope,
    config: runtime,
    startLoop(draw, loopOptions) {
      scope.loopStopRef.current?.();
      if (loopOptions?.visibilityRoot && scope.kind === "section") {
        visibilityCleanup?.();
        visibilityActive = true;
        visibilityCleanup = bindVisibilityPause(loopOptions.visibilityRoot, (visible) => {
          visibilityActive = visible;
        });
      }
      scope.loopStopRef.current = runCanvasLoop(draw, {
        isActive: () => visibilityActive,
      });
      return () => {
        scope.loopStopRef.current?.();
        scope.loopStopRef.current = null;
        visibilityCleanup?.();
        visibilityCleanup = null;
      };
    },
    getColor: () => "",
    getStarColor: () => "",
    getMatrixTrail: () => "",
    getThemeColor: () => "",
    resolveColor: () => "",
    applyLayerOpacity: () => {},
    mouse: options?.trackMouse ? acquireMouseTracker() : undefined,
  };

  Object.assign(ctx, bindMountContextColors(ctx));

  return ctx;
}

export function destroyScope(scope: BackgroundScope, options?: { trackMouse?: boolean }): void {
  scope.loopStopRef.current?.();
  scope.loopStopRef.current = null;
  scope.resizeCleanupRef.current?.();
  scope.resizeCleanupRef.current = null;
  if (options?.trackMouse) releaseMouseTracker();
}
