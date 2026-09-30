/**
 * Typed postMessage protocol between the editor shell and the preview iframe.
 */

export type PreviewMessageType =
  | "preview:blocks"
  | "preview:select"
  | "preview:deselect"
  | "preview:device"
  | "preview:theme"
  | "preview:theme-mode"
  | "preview:reload"
  | "preview:scroll-to"
  | "preview:outlines"
  | "preview:grid"
  | "preview:ready";

export interface PreviewMessage<T = unknown> {
  source: "azura-editor";
  type: PreviewMessageType;
  payload: T;
}

export type BlocksPayload = { blocks: Array<Record<string, unknown>>; page: string };
export type SelectPayload = { index: number | null };
export type DevicePayload = { device: "desktop" | "tablet" | "mobile" };
export type ThemeModePayload = { mode: "dark" | "light" };
export type ScrollPayload = { index: number };
export type OutlinesPayload = { enabled: boolean };
export type GridPayload = { enabled: boolean };
export type ReloadPayload = { url?: string };

function msg<T>(type: PreviewMessageType, payload: T): PreviewMessage<T> {
  return { source: "azura-editor", type, payload };
}

export class PreviewBridge {
  private frame: HTMLIFrameElement;
  private origin: string;

  constructor(frame: HTMLIFrameElement, origin = window.location.origin) {
    this.frame = frame;
    this.origin = origin;
  }

  private send<T>(type: PreviewMessageType, payload: T): void {
    try {
      this.frame.contentWindow?.postMessage(msg(type, payload), this.origin);
    } catch {
      /* iframe not ready */
    }
  }

  sendBlocks(blocks: Array<Record<string, unknown>>, page = ""): void {
    this.send<BlocksPayload>("preview:blocks", { blocks, page });
  }

  selectBlock(index: number | null): void {
    this.send<SelectPayload>("preview:select", { index });
  }

  deselect(): void {
    this.send<SelectPayload>("preview:deselect", { index: null });
  }

  setDevice(device: DevicePayload["device"]): void {
    this.send<DevicePayload>("preview:device", { device });
  }

  scrollTo(index: number): void {
    this.send<ScrollPayload>("preview:scroll-to", { index });
  }

  setOutlines(enabled: boolean): void {
    this.send<OutlinesPayload>("preview:outlines", { enabled });
  }

  setGrid(enabled: boolean): void {
    this.send<GridPayload>("preview:grid", { enabled });
  }

  reload(url?: string): void {
    this.send<ReloadPayload>("preview:reload", { url });
  }

  setThemeMode(mode: "dark" | "light"): void {
    this.send<ThemeModePayload>("preview:theme-mode", { mode });
    try {
      this.frame.contentWindow?.postMessage({ type: "azura-theme-mode", mode }, this.origin);
    } catch {
      /* ignore */
    }
  }
}

export interface PreviewMessageHandlers {
  onBlocks?: (payload: BlocksPayload) => void;
  onSelect?: (payload: SelectPayload) => void;
  onDeselect?: () => void;
  onDevice?: (payload: DevicePayload) => void;
  onThemeMode?: (payload: ThemeModePayload) => void;
  onScrollTo?: (payload: ScrollPayload) => void;
  onOutlines?: (payload: OutlinesPayload) => void;
  onGrid?: (payload: GridPayload) => void;
  onReload?: (payload: ReloadPayload) => void;
}

export function listenToPreviewMessages(handlers: PreviewMessageHandlers): () => void {
  function onMessage(event: MessageEvent) {
    const data = event.data as PreviewMessage;
    if (!data || data.source !== "azura-editor") return;

    switch (data.type) {
      case "preview:blocks":
        handlers.onBlocks?.(data.payload as BlocksPayload);
        break;
      case "preview:select":
        handlers.onSelect?.(data.payload as SelectPayload);
        break;
      case "preview:deselect":
        handlers.onDeselect?.();
        break;
      case "preview:device":
        handlers.onDevice?.(data.payload as DevicePayload);
        break;
      case "preview:theme-mode":
        handlers.onThemeMode?.(data.payload as ThemeModePayload);
        break;
      case "preview:scroll-to":
        handlers.onScrollTo?.(data.payload as ScrollPayload);
        break;
      case "preview:outlines":
        handlers.onOutlines?.(data.payload as OutlinesPayload);
        break;
      case "preview:grid":
        handlers.onGrid?.(data.payload as GridPayload);
        break;
      case "preview:reload":
        handlers.onReload?.(data.payload as ReloadPayload);
        break;
    }
  }

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export function applyBlockHighlight(index: number | null, prevIndex: number | null): void {
  if (prevIndex !== null) {
    document.querySelector(`[data-block-index="${prevIndex}"]`)?.classList.remove("az-preview-selected");
  }
  if (index !== null) {
    const el = document.querySelector(`[data-block-index="${index}"]`);
    el?.classList.add("az-preview-selected");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

export function signalPreviewReady(): void {
  if (window.parent !== window) {
    window.parent.postMessage({ source: "azura-preview", type: "preview:ready" }, "*");
  }
}
