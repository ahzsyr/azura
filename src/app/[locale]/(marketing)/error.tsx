"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { recordRouteFailure } from "@/lib/performance/runtime-metrics";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    console.error("[marketing] page error:", error);
    if (process.env.NODE_ENV === "development" && error.digest) {
      console.error("[marketing] error digest:", error.digest);
    }
    // #region agent log
    fetch("http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "faeff3" },
      body: JSON.stringify({
        sessionId: "faeff3",
        location: "marketing/error.tsx",
        message: "marketing error boundary caught",
        data: {
          errorMessage: error.message,
          digest: error.digest,
          pathname,
        },
        timestamp: Date.now(),
        hypothesisId: "E",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
    recordRouteFailure({
      pathname,
      message: error.message,
      kind: "render",
      digest: error.digest,
    });
  }, [error, pathname]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Something went wrong while loading this page. Please try again, or return to the homepage.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </div>
  );
}
