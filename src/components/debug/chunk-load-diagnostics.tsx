"use client";

import { useEffect } from "react";

function postDebugLog(payload: {
  location: string;
  message: string;
  hypothesisId: string;
  data?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return;

  fetch("/api/debug/session-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId: "pre-fix", ...payload }),
  }).catch(() => {});
}

function collectScriptSources() {
  return Array.from(document.querySelectorAll("script[src]"))
    .map((node) => node.getAttribute("src") ?? "")
    .filter(Boolean)
    .slice(0, 20);
}

export function ChunkLoadDiagnostics() {
  useEffect(() => {
    const origin = window.location.origin;
    const href = window.location.href;
    const scripts = collectScriptSources();
    const hasTurbopackScript = scripts.some((src) => src.includes("turbopack"));

    postDebugLog({
      location: "chunk-load-diagnostics.tsx:mount",
      message: "page boot script inventory",
      hypothesisId: "A",
      data: {
        origin,
        href,
        hasTurbopackScript,
        scriptCount: scripts.length,
        scripts,
      },
    });

    postDebugLog({
      location: "chunk-load-diagnostics.tsx:env",
      message: "runtime host vs configured public site",
      hypothesisId: "B",
      data: {
        origin,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
      },
    });

    const onError = (event: ErrorEvent) => {
      const target = event.target;
      const failedUrl =
        target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
            ? target.href
            : null;

      postDebugLog({
        location: "chunk-load-diagnostics.tsx:error",
        message: "resource load failure",
        hypothesisId: failedUrl ? "C" : "D",
        data: {
          message: event.message,
          filename: event.filename,
          failedUrl,
          origin,
          isChunkError: event.message.includes("ChunkLoadError"),
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "unknown";

      postDebugLog({
        location: "chunk-load-diagnostics.tsx:rejection",
        message: "unhandled rejection",
        hypothesisId: "D",
        data: {
          message,
          isChunkError: message.includes("ChunkLoadError"),
          origin,
        },
      });
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
