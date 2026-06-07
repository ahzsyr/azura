"use client";

import dynamic from "next/dynamic";
import { SearchTriggerButton } from "@/features/search/components/search-ui/search-trigger-button";

const SearchCommand = dynamic(
  () => import("./search-command").then((m) => m.SearchCommand),
  {
    ssr: false,
    loading: () => (
      <SearchTriggerButton
        label="Search"
        onClick={() => {}}
        className="pointer-events-none opacity-70"
        showShortcut={false}
      />
    ),
  }
);

export { SearchCommand };
