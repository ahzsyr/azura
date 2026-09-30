"use client";

import { useCallback, useEffect, useRef } from "react";
import { serializeFormElement } from "@/lib/patch/form-serialize";
import { computePatch, isEmptyPatch } from "@/lib/patch";

type UseEntityFormPatchOptions = {
  formRef: React.RefObject<HTMLFormElement | null>;
  enabled?: boolean;
};

export function useEntityFormPatch({ formRef, enabled = true }: UseEntityFormPatchOptions) {
  const baselineRef = useRef<Record<string, string>>({});

  const captureBaseline = useCallback(() => {
    if (!formRef.current) return;
    baselineRef.current = serializeFormElement(formRef.current);
  }, [formRef]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(captureBaseline, 0);
    return () => window.clearTimeout(timer);
  }, [captureBaseline, enabled]);

  const getBaseline = useCallback(() => baselineRef.current, []);

  const getCurrent = useCallback(() => {
    if (!formRef.current) return baselineRef.current;
    return serializeFormElement(formRef.current);
  }, [formRef]);

  const getChanges = useCallback(() => {
    return computePatch(getBaseline(), getCurrent()) as Record<string, unknown>;
  }, [getBaseline, getCurrent]);

  const resetBaseline = useCallback(() => {
    captureBaseline();
  }, [captureBaseline]);

  const hasChanges = useCallback(() => !isEmptyPatch(getChanges()), [getChanges]);

  return {
    getBaseline,
    getCurrent,
    getChanges,
    resetBaseline,
    captureBaseline,
    hasChanges,
  };
}
