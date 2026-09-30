import { ensureBgKeyframes } from "./kernel/keyframe-styles";
import { loadEffect } from "./lazy-imports";
import { getEffect } from "./registry";
import { createMountContext, createScope, destroyScope } from "./mount-context";
import type { BackgroundEffectId } from "./types";

const sectionCleanups = new WeakMap<HTMLElement, () => void>();

function isConstrainedSectionBackground(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const root = document.documentElement;
  return root.dataset.reducedPaint === "true" || root.dataset.lowEndDevice === "true";
}

function clearSectionLayers(container: HTMLElement): void {
  container.querySelectorAll("[data-section-bg-effect]").forEach((el) => el.remove());
}

export async function mountSectionBackground(
  container: HTMLElement,
  effectId: BackgroundEffectId,
): Promise<() => void> {
  const prev = sectionCleanups.get(container);
  prev?.();
  clearSectionLayers(container);

  if (!effectId || effectId === "none") {
    return () => {};
  }

  let runtimeType = effectId;
  if (
    isConstrainedSectionBackground() &&
    runtimeType !== "grid" &&
    runtimeType !== "aurora"
  ) {
    runtimeType = "grid";
  }

  ensureBgKeyframes();
  const scope = createScope("section", container);
  const ctx = createMountContext(scope);
  const definition = getEffect(runtimeType) ?? (await loadEffect(runtimeType));
  if (!definition) {
    return () => {};
  }

  const effectCleanup = definition.mount(ctx);
  const cleanup = () => {
    effectCleanup();
    destroyScope(scope);
    clearSectionLayers(container);
    sectionCleanups.delete(container);
  };
  sectionCleanups.set(container, cleanup);
  return cleanup;
}

/** Sync wrapper for existing section-background-layers useEffect. */
export function mountSectionBackgroundSync(
  container: HTMLElement,
  effectId: BackgroundEffectId,
): () => void {
  let activeCleanup: (() => void) | null = null;
  void mountSectionBackground(container, effectId).then((cleanup) => {
    activeCleanup = cleanup;
  });
  return () => {
    activeCleanup?.();
    sectionCleanups.get(container)?.();
    activeCleanup = null;
  };
}
