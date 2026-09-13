"use client";

import { createContext, useContext } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";

const empty: HeaderBuilderCatalog = {
  pages: [],
  collections: [],
  brands: [],
  tags: [],
  products: [],
  posts: [],
  contentByType: {},
  contentTypes: [],
  sourceFamilies: [],
};

export type HeaderBuilderCatalogContextValue = {
  catalog: HeaderBuilderCatalog;
  refreshCatalog: () => Promise<void>;
};

const noopRefresh = async () => {};

const HeaderBuilderCatalogContext = createContext<HeaderBuilderCatalogContextValue>({
  catalog: empty,
  refreshCatalog: noopRefresh,
});

export function HeaderBuilderCatalogProvider({
  catalog,
  refreshCatalog,
  children,
}: {
  catalog: HeaderBuilderCatalog;
  refreshCatalog?: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <HeaderBuilderCatalogContext.Provider
      value={{
        catalog: catalog ?? empty,
        refreshCatalog: refreshCatalog ?? noopRefresh,
      }}
    >
      {children}
    </HeaderBuilderCatalogContext.Provider>
  );
}

export function useHeaderBuilderCatalog(): HeaderBuilderCatalogContextValue {
  return useContext(HeaderBuilderCatalogContext);
}
