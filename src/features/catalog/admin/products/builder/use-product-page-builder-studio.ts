"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ProductPageDisplayPartial,
  ResolvedProductPageDisplay,
} from "@/features/products/lib/product-page-display";
import type {
  ProductPageElementsRules,
  ProductPageLayoutRules,
  ProductPageViewport,
} from "@/features/products/lib/product-page-responsive";
import type { ResolvedProductPageOverflow } from "@/features/products/lib/product-page-overflow";
import type { ResolvedProductPageLayout } from "@/features/products/lib/product-storefront-layout";
import type { ResolvedProductPageElementsLayer } from "@/features/products/lib/product-page-responsive";
import {
  PRODUCT_PAGE_LAYOUT_PRESETS,
  type ProductPageLayoutPresetId,
} from "./product-page-layout-presets";
import type { BuilderBlockId } from "./product-page-block-registry";
import { isDisplayKey } from "./product-page-block-registry";

const MAX_UNDO = 40;

export type ProductPageBuilderData = {
  layoutRules: ProductPageLayoutRules;
  elementsRules: ProductPageElementsRules;
  overflow: ResolvedProductPageOverflow;
};

export type ProductPageBuilderStudioInitial = ProductPageBuilderData;

function cloneData(data: ProductPageBuilderData): ProductPageBuilderData {
  return JSON.parse(JSON.stringify(data)) as ProductPageBuilderData;
}

function patchDisplayFlags(
  display: ResolvedProductPageDisplay,
  key: keyof ResolvedProductPageDisplay,
  enabled: boolean,
): ResolvedProductPageDisplay {
  const next = { ...display, [key]: { enabled } };
  return next;
}

export function useProductPageBuilderStudio(initial: ProductPageBuilderStudioInitial) {
  const [data, setDataRaw] = useState<ProductPageBuilderData>(() => cloneData(initial));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const [viewport, setViewport] = useState<ProductPageViewport>("desktop");
  const [selectedBlockId, setSelectedBlockId] = useState<BuilderBlockId | null>(null);

  const undoStack = useRef<ProductPageBuilderData[]>([]);
  const redoStack = useRef<ProductPageBuilderData[]>([]);
  const [historyState, setHistoryState] = useState({ tick: 0, canUndo: false, canRedo: false });

  const syncHistory = useCallback(() => {
    setHistoryState(({ tick }) => ({
      tick: tick + 1,
      canUndo: undoStack.current.length > 0,
      canRedo: redoStack.current.length > 0,
    }));
  }, []);

  const commitData = useCallback(
    (updater: ProductPageBuilderData | ((prev: ProductPageBuilderData) => ProductPageBuilderData)) => {
      setDataRaw((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
        undoStack.current = [...undoStack.current.slice(-MAX_UNDO + 1), cloneData(prev)];
        redoStack.current = [];
        syncHistory();
        return next;
      });
    },
    [syncHistory],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setDataRaw((current) => {
      redoStack.current.push(cloneData(current));
      syncHistory();
      return prev;
    });
  }, [syncHistory]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    setDataRaw((current) => {
      undoStack.current.push(cloneData(current));
      syncHistory();
      return next;
    });
  }, [syncHistory]);

  const canUndo = historyState.canUndo;
  const canRedo = historyState.canRedo;
  void historyState.tick;

  const isDirty = useMemo(
    () => JSON.stringify(data) !== savedSnapshot,
    [data, savedSnapshot],
  );

  const markSaved = useCallback(
    (next?: ProductPageBuilderData) => {
      const snapshot = next ?? data;
      setSavedSnapshot(JSON.stringify(snapshot));
      if (next) setDataRaw(cloneData(next));
      undoStack.current = [];
      redoStack.current = [];
      syncHistory();
    },
    [data, syncHistory],
  );

  const resetToSaved = useCallback(() => {
    const restored = JSON.parse(savedSnapshot) as ProductPageBuilderData;
    setDataRaw(cloneData(restored));
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
  }, [savedSnapshot, syncHistory]);

  const getSnapshot = useCallback((): ProductPageBuilderData => cloneData(data), [data]);

  const restoreSnapshot = useCallback(
    (snapshot: ProductPageBuilderData) => {
      setDataRaw(cloneData(snapshot));
      undoStack.current = [];
      redoStack.current = [];
      syncHistory();
    },
    [syncHistory],
  );

  const activeLayout = data.layoutRules[viewport];
  const activeElementsLayer = data.elementsRules[viewport];

  const patchLayout = useCallback(
    (patch: Partial<ResolvedProductPageLayout>) => {
      commitData((prev) => ({
        ...prev,
        layoutRules: {
          ...prev.layoutRules,
          [viewport]: { ...prev.layoutRules[viewport], ...patch },
        },
      }));
    },
    [commitData, viewport],
  );

  const patchElementsLayer = useCallback(
    (patch: Partial<ResolvedProductPageElementsLayer>) => {
      commitData((prev) => ({
        ...prev,
        elementsRules: {
          ...prev.elementsRules,
          [viewport]: {
            ...prev.elementsRules[viewport],
            ...patch,
            display: patch.display
              ? { ...prev.elementsRules[viewport].display, ...patch.display }
              : prev.elementsRules[viewport].display,
            elementOrder: patch.elementOrder
              ? {
                  main: patch.elementOrder.main ?? prev.elementsRules[viewport].elementOrder.main,
                  side: patch.elementOrder.side ?? prev.elementsRules[viewport].elementOrder.side,
                }
              : prev.elementsRules[viewport].elementOrder,
            compactDisplay: patch.compactDisplay
              ? { ...prev.elementsRules[viewport].compactDisplay, ...patch.compactDisplay }
              : prev.elementsRules[viewport].compactDisplay,
          },
        },
      }));
    },
    [commitData, viewport],
  );

  const patchOverflow = useCallback(
    (next: ResolvedProductPageOverflow) => {
      commitData((prev) => ({ ...prev, overflow: next }));
    },
    [commitData],
  );

  const toggleBlockVisibility = useCallback(
    (blockId: BuilderBlockId, enabled: boolean) => {
      if (!isDisplayKey(blockId)) return;
      commitData((prev) => {
        const viewports: ProductPageViewport[] = ["desktop", "tablet", "mobile"];
        const next = { ...prev.elementsRules };
        for (const vp of viewports) {
          next[vp] = {
            ...next[vp],
            display: patchDisplayFlags(next[vp].display, blockId, enabled),
          };
        }
        return { ...prev, elementsRules: next };
      });
    },
    [commitData],
  );

  /** Patch global page display flags across all viewports (site-level defaults). */
  const patchGlobalPageDisplay = useCallback(
    (partial: ProductPageDisplayPartial) => {
      commitData((prev) => {
        const viewports: ProductPageViewport[] = ["desktop", "tablet", "mobile"];
        const next = { ...prev.elementsRules };
        for (const vp of viewports) {
          const display = { ...next[vp].display };
          for (const key of Object.keys(partial) as Array<keyof ProductPageDisplayPartial>) {
            const patch = partial[key];
            if (!patch || typeof patch !== "object") continue;
            const current = display[key as keyof ResolvedProductPageDisplay];
            display[key as keyof ResolvedProductPageDisplay] = {
              ...current,
              ...patch,
            };
          }
          next[vp] = { ...next[vp], display };
        }
        return { ...prev, elementsRules: next };
      });
    },
    [commitData],
  );

  const reorderMain = useCallback(
    (main: string[]) => {
      patchElementsLayer({
        elementOrder: {
          main: main as ResolvedProductPageElementsLayer["elementOrder"]["main"],
          side: activeElementsLayer.elementOrder.side,
        },
      });
    },
    [activeElementsLayer.elementOrder.side, patchElementsLayer],
  );

  const reorderSide = useCallback(
    (side: string[]) => {
      patchElementsLayer({
        elementOrder: {
          main: activeElementsLayer.elementOrder.main,
          side: side as ResolvedProductPageElementsLayer["elementOrder"]["side"],
        },
      });
    },
    [activeElementsLayer.elementOrder.main, patchElementsLayer],
  );

  const applyPreset = useCallback(
    (presetId: ProductPageLayoutPresetId) => {
      const preset = PRODUCT_PAGE_LAYOUT_PRESETS.find((item) => item.id === presetId);
      if (!preset) return;
      commitData((prev) => {
        const applied = preset.apply({
          layoutRules: prev.layoutRules,
          elementsRules: prev.elementsRules,
        });
        return { ...prev, ...applied };
      });
    },
    [commitData],
  );

  return {
    data,
    layoutRules: data.layoutRules,
    elementsRules: data.elementsRules,
    overflow: data.overflow,
    viewport,
    selectedBlockId,
    activeLayout,
    activeElementsLayer,
    isDirty,
    canUndo,
    canRedo,
    setViewport,
    setSelectedBlockId,
    patchLayout,
    patchElementsLayer,
    patchOverflow,
    toggleBlockVisibility,
    patchGlobalPageDisplay,
    reorderMain,
    reorderSide,
    applyPreset,
    undo,
    redo,
    markSaved,
    resetToSaved,
    getSnapshot,
    restoreSnapshot,
    commitData,
  };
}

export type ProductPageBuilderStudio = ReturnType<typeof useProductPageBuilderStudio>;
