import { createContext, useContext } from "react";
import type { HeaderBuilderCatalog } from "@/features/navigation/types";

const empty: HeaderBuilderCatalog = {
  pages: [],
  collections: [],
  brands: [],
  tags: [],
  products: [],
  posts: [],
};

const HeaderBuilderCatalogContext = createContext<HeaderBuilderCatalog>(empty);

export function HeaderBuilderCatalogProvider({
  catalog,
  children,
}: {
  catalog: HeaderBuilderCatalog;
  children: React.ReactNode;
}) {
  return (
    <HeaderBuilderCatalogContext.Provider value={catalog ?? empty}>{children}</HeaderBuilderCatalogContext.Provider>
  );
}

export function useHeaderBuilderCatalog(): HeaderBuilderCatalog {
  return useContext(HeaderBuilderCatalogContext);
}
