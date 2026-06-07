"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SearchCommand = dynamic(
  () => import("./search-command").then((m) => m.SearchCommand),
  { ssr: false },
);

/** Mounts search modal only after the user opens search — saves initial JS on marketing pages. */
export function DeferredSearchCommand() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const open = () => {
      setMounted(true);
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent("sm:open-search", { bubbles: true }));
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        open();
      }
    };
    document.addEventListener("sm:open-search", open);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("sm:open-search", open);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!mounted) return null;
  return <SearchCommand />;
}
