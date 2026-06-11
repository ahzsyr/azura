"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useScrollContainer } from "@/hooks/use-scroll-container";
import { AdminPageTransition } from "./admin-motion";

type AdminContentAreaProps = {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
};

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function AdminContentArea({
  children,
  className,
  maxWidth = "xl",
}: AdminContentAreaProps) {
  const pathname = usePathname();
  const scrollRef = useScrollContainer<HTMLDivElement>();

  return (
    <div
      ref={scrollRef}
      className="az-scroll az-scroll-region flex-1 overflow-y-auto"
      data-scrolling="false"
    >
      <AdminPageTransition
        routeKey={pathname}
        className={cn(
          "admin-content mx-auto w-full p-4 md:p-6 lg:p-8",
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {children}
      </AdminPageTransition>
    </div>
  );
}

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="admin-page-title">{title}</h1>
        {description && (
          <p className="admin-field-hint mt-1.5 md:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type AdminCardGridProps = {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

export function AdminCardGrid({ children, columns = 4, className }: AdminCardGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={cn("grid gap-4 md:gap-6", colClass, className)}>{children}</div>;
}
