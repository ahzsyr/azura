"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type CatalogDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  /** Extra classes for SheetContent (e.g. wider panel). */
  contentClassName?: string;
};

export function CatalogDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  contentClassName,
}: CatalogDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn("flex w-full flex-col sm:max-w-md", contentClassName)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
        {footer ? <SheetFooter className="mt-auto">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
