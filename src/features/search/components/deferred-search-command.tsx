"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { markSearchOpenPending } from "@/features/search/components/search-open-bridge";

const SearchCommand = dynamic(
  () => import("./search-command").then((m) => m.SearchCommand),
  { ssr: false },
);

/** Mounts search modal only after the user opens search — saves initial JS on marketing pages. */
export function DeferredSearchCommand() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onOpenRequest = () => {
      setMounted((wasMounted) => {
        if (!wasMounted) {
          markSearchOpenPending();
        }
        return true;
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        onOpenRequest();
      }
    };
    document.addEventListener("sm:open-search", onOpenRequest);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("sm:open-search", onOpenRequest);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!mounted) return null;
  return <SearchCommand />;
}
