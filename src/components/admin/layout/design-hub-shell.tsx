"use client";

import type { ReactNode } from "react";
import { AdminPageHeader } from "./admin-content-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DesignHubShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  preview?: ReactNode;
  previewTitle?: string;
  previewDescription?: string;
  children: ReactNode;
};

export function DesignHubShell({
  title,
  description,
  actions,
  preview,
  previewTitle = "Live preview",
  previewDescription,
  children,
}: DesignHubShellProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} description={description} actions={actions} />

      {preview ? (
        <Card className="sticky top-12 z-10 overflow-hidden shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{previewTitle}</CardTitle>
            {previewDescription ? <CardDescription>{previewDescription}</CardDescription> : null}
          </CardHeader>
          <CardContent className="pt-0">{preview}</CardContent>
        </Card>
      ) : null}

      <div>{children}</div>
    </div>
  );
}
