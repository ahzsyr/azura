"use client";

import { useEffect } from "react";

const DEBUG_ENDPOINT =
  "http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";
const SESSION_ID = "3353e0";

function isLocalDebugHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function probeLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  if (!isLocalDebugHost()) return;
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

/**
 * Captures production hosting console/DOM issues while the user browses the deployed site.
 * Logs are ingested on the local debug server (127.0.0.1:7300).
 */
export function ProductionHostingProbe() {
  useEffect(() => {
    probeLog(
      "production-hosting-probe.tsx:mount",
      "probe active on deployed origin",
      {
        href: window.location.href,
        host: window.location.host,
        hasSuspenseMarkers: document.documentElement.outerHTML.includes("<!--$-->"),
        hasGaId: Boolean(process.env.NEXT_PUBLIC_GA_ID),
      },
      "H2",
    );

    const onError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      if (
        /deferred dom|parentnode|null is not an object|\$RS/i.test(message)
      ) {
        probeLog(
          "window.error",
          "streaming or DOM resolution error",
          {
            message,
            filename: event.filename,
            lineno: event.lineno,
          },
          "H2",
        );
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      if (/google-analytics|googletagmanager|gtag/i.test(message)) {
        probeLog(
          "window.unhandledrejection",
          "analytics promise rejection",
          { message },
          "H7",
        );
      }
    };

    const onResourceError = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLScriptElement)) return;
      const src = target.src ?? "";
      if (!/google-analytics|googletagmanager/i.test(src)) return;
      probeLog(
        "resource.error",
        "analytics script resource error",
        { src },
        "H6",
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onResourceError, true);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onResourceError, true);
    };
  }, []);

  return null;
}
