"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewBridge } from "@/features/preview/preview-bridge";
import { createEditorStore, type DeviceMode } from "@/features/preview/editor-store";

type PageOption = { id: string; slug: string; titleEn: string };

type Props = {
  pages: PageOption[];
  initialPageId?: string;
  previewUrl?: string;
};

const DEVICE_WIDTH: Record<DeviceMode, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

export function StudioShell({ pages, initialPageId, previewUrl }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<PreviewBridge | null>(null);
  const [pageId, setPageId] = useState(initialPageId ?? pages[0]?.id ?? "");
  const [iframeSrc, setIframeSrc] = useState(previewUrl ?? "");
  const [ready, setReady] = useState(false);

  const store = useMemo(
    () =>
      createEditorStore({
        slug: pages.find((p) => p.id === pageId)?.slug ?? "",
        title: pages.find((p) => p.id === pageId)?.titleEn ?? "",
        blocks: [],
        settings: {},
      }),
    [pageId, pages],
  );

  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setDevice(state.uiState.deviceMode);
      setSelectedBlock(state.uiState.selectedBlock);
    });
    return () => {
      unsub();
    };
  }, [store]);

  useEffect(() => {
    if (!iframeRef.current) return;
    bridgeRef.current = new PreviewBridge(iframeRef.current);
  }, [iframeSrc]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; index?: number };
      if (data.source === "azura-preview" && data.type === "preview:ready") {
        setReady(true);
      }
      if (data.type === "azura-editor-block-click" && typeof data.index === "number") {
        store.actions.selectBlock(data.index);
        bridgeRef.current?.selectBlock(data.index);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [store]);

  useEffect(() => {
    if (!ready || !bridgeRef.current) return;
    bridgeRef.current.setDevice(device);
    bridgeRef.current.selectBlock(selectedBlock);
  }, [device, selectedBlock, ready]);

  async function openPage(id: string) {
    setReady(false);
    setPageId(id);
    const res = await fetch("/api/admin/preview-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: id }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { url: string };
    setIframeSrc(data.url);
    bridgeRef.current?.reload(data.url);
  }

  useEffect(() => {
    if (initialPageId && previewUrl) return;
    if (pageId) void openPage(pageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Preview Studio</h1>
          <p className="text-sm text-muted-foreground">
            Device simulator with postMessage bridge to CMS page preview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={pageId}
            onChange={(e) => void openPage(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titleEn} ({p.slug})
              </option>
            ))}
          </select>
          <div className="flex rounded-md border">
            {(
              [
                { mode: "desktop" as const, icon: Monitor, label: "Desktop" },
                { mode: "tablet" as const, icon: Tablet, label: "Tablet" },
                { mode: "mobile" as const, icon: Smartphone, label: "Mobile" },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={device === mode ? "default" : "ghost"}
                className="rounded-none first:rounded-s-md last:rounded-e-md"
                onClick={() => {
                  store.actions.setDeviceMode(mode);
                  bridgeRef.current?.setDevice(mode);
                }}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/admin/pages/${pageId}`}>Edit page</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto rounded-xl border bg-muted/30 p-6">
        <div
          className="h-full min-h-[640px] overflow-hidden rounded-lg border bg-background shadow-lg transition-[width] duration-300"
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
        >
          {iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Page preview"
              className="h-full w-full border-0"
              onLoad={() => setReady(false)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a page to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
