"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] page error:", error.message || error, error.stack);
  }, [error]);

  const message = error.message ?? "";
  const isPoolTimeout =
    message.includes("connection pool") ||
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("P2024") ||
    message.includes("Timed out fetching");
  const isRenderLoop =
    message.includes("Maximum update depth") ||
    message.includes("too many re-renders");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Admin page could not load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {isRenderLoop
          ? "The page editor hit a render loop while loading. Try again; if it persists after a refresh, report which block type you were adding."
          : "An error occurred while loading this admin page (server or client). Try again, or sign in again if the problem persists."}
      </p>
      {message ? (
        <p className="max-w-md text-xs text-muted-foreground break-words rounded-md border bg-muted/30 px-3 py-2">
          {message}
        </p>
      ) : null}
      {isPoolTimeout ? (
        <p className="max-w-md text-sm text-amber-800 dark:text-amber-200">
          Database connection pool timed out. On Vercel with Supabase, use the transaction pooler (port
          6543) with <code className="text-xs">connection_limit=1</code> in DATABASE_URL, add{" "}
          <code className="text-xs">DIRECT_URL</code> for deploy migrations, and confirm your Supabase
          project is active.
        </p>
      ) : null}
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/login">Admin login</Link>
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/en">View website</Link>
        </Button>
      </div>
    </div>
  );
}
