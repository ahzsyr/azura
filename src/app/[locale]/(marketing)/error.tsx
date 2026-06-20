"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cardSessionDebugLog } from "@/lib/debug/agent-log";
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
