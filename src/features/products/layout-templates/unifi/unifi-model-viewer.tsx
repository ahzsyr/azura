"use client";

import { useEffect, useRef } from "react";
import type { ProductModel3dObject, ProductModel3dVariant } from "@/features/products/types";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";

let modelViewerLoader: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("model-viewer")) return Promise.resolve();
  if (modelViewerLoader) return modelViewerLoader;
  modelViewerLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MODEL_VIEWER_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("model-viewer failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("model-viewer failed to load"));
    document.head.appendChild(script);
  });
  return modelViewerLoader;
}

type ModelViewerEl = HTMLElement & {
  availableVariants?: string[];
  variantName?: string;
};

function applyColorVariant(el: ModelViewerEl, color?: string): void {
  const want = color?.trim().toLowerCase();
  if (!want) return;
  const names = el.availableVariants ?? [];
  if (!names.length) return;
  const match =
    names.find((name) => name.toLowerCase() === want) ??
    names.find((name) => name.toLowerCase().includes(want));
  if (match) el.variantName = match;
}

type Props = {
  model: ProductModel3dObject;
  variant?: ProductModel3dVariant;
  alt: string;
};

export function UniFiModelViewer({ model, variant, alt }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadModelViewer().catch(() => undefined);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = host.querySelector("model-viewer") as ModelViewerEl | null;
    if (!el) return;
    const onLoad = () => applyColorVariant(el, variant?.color);
    el.addEventListener("load", onLoad);
    applyColorVariant(el, variant?.color);
    return () => el.removeEventListener("load", onLoad);
  }, [variant?.color, model.url]);

  if (!model.url) {
    return variant?.thumbnail ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={variant.thumbnail} alt={alt} className="unifi-gallery__main-img unifi-gallery__main-img--static" />
    ) : (
      <div className="unifi-empty">3D model unavailable</div>
    );
  }

  const camera = variant?.camera;
  const cameraOrbit =
    camera && camera.theta != null && camera.phi != null && camera.radius != null
      ? `${camera.theta}deg ${camera.phi}deg ${camera.radius}m`
      : undefined;

  return (
    <div
      ref={hostRef}
      className="unifi-model-viewer"
      key={`${model.url}-${variant?.color ?? "default"}`}
    >
      <model-viewer
        src={model.url}
        alt={alt}
        poster={variant?.thumbnail}
        {...(variant?.color ? { "variant-name": variant.color } : {})}
        camera-controls
        interaction-prompt="none"
        exposure={camera?.brightness != null ? String(camera.brightness) : "1"}
        camera-orbit={cameraOrbit}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
