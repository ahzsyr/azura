import type { ReactNode } from "react";
import type { LayoutDirection } from "@/shared/layout/direction/direction-types";

type CatalogContentLayoutProps = {
  dir?: LayoutDirection;
  sidebar?: ReactNode;
  backdrop?: ReactNode;
  dock?: ReactNode;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function CatalogContentLayout({
  dir,
  sidebar,
  backdrop,
  dock,
  className = "pl-workspace catalog-content-layout",
  mainClassName = "pl-main catalog-content-layout__main",
  contentClassName = "pl-content catalog-content-layout__content",
  children,
}: CatalogContentLayoutProps) {
  return (
    <section className={className} dir={dir}>
      {backdrop}
      {sidebar}
      <div className={mainClassName}>
        <section className={contentClassName}>{children}</section>
        {dock}
      </div>
    </section>
  );
}

