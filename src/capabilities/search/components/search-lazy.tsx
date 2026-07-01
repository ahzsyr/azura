"use client";

import dynamic from "next/dynamic";

const SearchCommand = dynamic(
  () => import("./search-command").then((m) => m.SearchCommand),
  {
    ssr: false,
    loading: () => null,
  }
);

export { SearchCommand };
