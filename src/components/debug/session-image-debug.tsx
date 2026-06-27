"use client";

import { useEffect } from "react";

const SAMPLE_GETIC_URL =
  "https://www.getic.com/images/catalogue/1488/srj10_1-5fdb2e5dd5277-medium.jpg";

/** Session debug probe — remove after image 503 / removeChild investigation. */
export function SessionImageDebug() {
  useEffect(() => {
    const optimizerUrl = `/_next/image?url=${encodeURIComponent(SAMPLE_GETIC_URL)}&w=640&q=75`;

    // #region agent log
    fetch("http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4569cd" },
      body: JSON.stringify({
        sessionId: "4569cd",
        location: "session-image-debug.tsx:mount",
        message: "marketing layout mounted",
        data: { pathname: window.location.pathname },
        timestamp: Date.now(),
        hypothesisId: "H1",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion

    void fetch(optimizerUrl)
      .then(async (res) => {
        // #region agent log
        fetch("http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4569cd" },
          body: JSON.stringify({
            sessionId: "4569cd",
            location: "session-image-debug.tsx:optimizer-probe",
            message: "next/image optimizer probe result",
            data: {
              status: res.status,
              ok: res.ok,
              contentType: res.headers.get("content-type"),
              optimizerUrl,
            },
            timestamp: Date.now(),
            hypothesisId: "H1-H2",
            runId: "post-fix",
          }),
        }).catch(() => {});
        // #endregion
      })
      .catch((err: unknown) => {
        // #region agent log
        fetch("http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4569cd" },
          body: JSON.stringify({
            sessionId: "4569cd",
            location: "session-image-debug.tsx:optimizer-probe-error",
            message: "next/image optimizer probe failed",
            data: {
              error: err instanceof Error ? err.message : String(err),
              optimizerUrl,
            },
            timestamp: Date.now(),
            hypothesisId: "H1-H2",
            runId: "post-fix",
          }),
        }).catch(() => {});
        // #endregion
      });

    const onWindowError = (event: ErrorEvent) => {
      if (!event.message?.includes("removeChild")) return;
      // #region agent log
      fetch("http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4569cd" },
        body: JSON.stringify({
          sessionId: "4569cd",
          location: "session-image-debug.tsx:window-error",
          message: "removeChild window error",
          data: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            pathname: window.location.pathname,
          },
          timestamp: Date.now(),
          hypothesisId: "H3-H5",
          runId: "post-fix",
        }),
      }).catch(() => {});
      // #endregion
    };

    window.addEventListener("error", onWindowError);
    return () => window.removeEventListener("error", onWindowError);
  }, []);

  return null;
}
