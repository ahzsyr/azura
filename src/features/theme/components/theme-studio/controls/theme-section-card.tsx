"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  searchTerms?: string[];
  actions?: ReactNode;
};

export function ThemeSectionCard({
  title,
  description,
  children,
  className,
  searchTerms = [],
  actions,
}: Props) {
  return (
    <Card
      className={cn(className)}
      data-theme-search={[title, description, ...searchTerms].filter(Boolean).join(" ").toLowerCase()}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
