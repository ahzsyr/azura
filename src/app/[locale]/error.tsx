"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[locale] page error:", error);
    // #region agent log
    fetch("http://127.0.0.1:7296/ingest/be83af48-a38d-4332-bd14-ca24ef067ce8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "846d9e" },
      body: JSON.stringify({
        sessionId: "846d9e",
        location: "locale/error.tsx",
        message: "locale page error boundary",
        data: {
          digest: error.digest ?? null,
          name: error.name,
          message: error.message?.slice(0, 300) ?? null,
        },
        hypothesisId: "H4",
        runId: "pre-fix",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Something went wrong while loading this page. Try again, or return to the homepage.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/en">Go to homepage</Link>
        </Button>
      </div>
    </div>
  );
}
