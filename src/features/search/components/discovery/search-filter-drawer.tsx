"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchFilterSidebar } from "@/features/search/components/discovery/search-filter-sidebar";
import { searchCopy, type SearchLocale } from "@/features/search/components/search-ui/search-copy";
import type { ComponentProps } from "react";

type SidebarProps = ComponentProps<typeof SearchFilterSidebar>;

export function SearchFilterDrawer({ locale, ...sidebarProps }: SidebarProps & { locale: SearchLocale }) {
  const t = searchCopy(locale);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
          {t.openFilters}
          {sidebarProps.activeFilterCount > 0 ? (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] text-primary-foreground">
              {sidebarProps.activeFilterCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100vw,320px)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.filters}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SearchFilterSidebar locale={locale} {...sidebarProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
