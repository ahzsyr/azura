"use client";

import { useEffect } from "react";
import { c37cd4Log, describeUnknownError, isC37cd4DebugEnabled } from "@/lib/debug/c37cd4-log";
import { isLocalDebugLoggingEnabled, sessionDebugLog } from "@/lib/debug/session-log";

/** Temporary debug session instrumentation — localhost only; remove after root cause is confirmed. */
export function SessionDebugInstrumentation() {
  useEffect(() => {
    const localDebugEnabled = isLocalDebugLoggingEnabled();
    const c37DebugEnabled = isC37cd4DebugEnabled();
    if (!localDebugEnabled && !c37DebugEnabled) return;

    if (localDebugEnabled) {
      sessionDebugLog(
        "session-debug-instrumentation.tsx:mount",
        "debug instrumentation active",
        { pathname: window.location.pathname, href: window.location.href },
        "setup",
      );
    }

    if (isC37cd4DebugEnabled()) {
      c37cd4Log({
        location: "session-debug-instrumentation.tsx:mount",
        message: "c37cd4 navigation debug active",
        data: { pathname: window.location.pathname, href: window.location.href },
        hypothesisId: "setup",
      });
    }

    const rangeProto = Range.prototype as Range & {
      selectNode?: (node: Node) => void;
    };
    const originalSelectNode = rangeProto.selectNode;
    if (localDebugEnabled && typeof originalSelectNode === "function") {
      rangeProto.selectNode = function patchedSelectNode(node: Node) {
        const detached = Boolean(node && !node.parentNode);
        if (detached) {
          sessionDebugLog(
            "Range.selectNode",
            "selectNode called on detached node",
            {
              nodeName: node.nodeName,
              nodeType: node.nodeType,
              stack: new Error().stack?.slice(0, 1200),
            },
            "A",
          );
        }
        return originalSelectNode.call(this, node);
      };
    }

    const onError = (event: ErrorEvent) => {
      if (localDebugEnabled && event.message?.includes("replace is not a function")) {
        sessionDebugLog(
          "window.error",
          "uncaught replace-related error",
          {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error instanceof Error ? event.error.stack?.slice(0, 1200) : undefined,
          },
          "H1",
        );
        return;
      }
      if (localDebugEnabled && event.message?.includes("selectNode")) {
        sessionDebugLog(
          "window.error",
          "uncaught selectNode-related error",
          {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error instanceof Error ? event.error.stack?.slice(0, 1200) : undefined,
          },
          "C",
        );
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";

      if (isC37cd4DebugEnabled() && message.includes("Transition was skipped")) {
        c37cd4Log({
          location: "window.unhandledrejection",
          message: "unhandled transition-skipped rejection",
          data: {
            pathname: window.location.pathname,
            ...describeUnknownError(reason),
          },
          hypothesisId: "H2",
        });
      }

      if (localDebugEnabled && message.includes("selectNode")) {
        sessionDebugLog(
          "window.unhandledrejection",
          "unhandled selectNode-related rejection",
          {
            message,
            stack: reason instanceof Error ? reason.stack?.slice(0, 1200) : undefined,
          },
          "C",
        );
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      if (typeof originalSelectNode === "function") {
        rangeProto.selectNode = originalSelectNode;
      }
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
