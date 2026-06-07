"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Briefcase, Building2, Package } from "lucide-react";
import type { ContentType } from "@prisma/client";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentAdminTabs } from "@/features/content/admin/content-admin-tabs";

const ICONS: Record<string, typeof Box> = {
  package: Package,
  building: Building2,
  briefcase: Briefcase,
  box: Box,
};

type TypeWithCount = ContentType & { _count: { items: number; collections: number } };

type Props = {
  types: TypeWithCount[];
};

export function ContentHubPage({ types }: Props) {
  return (
    <div className="space-y-6">
      <ContentAdminTabs />
      <AdminPageHeader
        title="Content"
        description="Industry-agnostic catalog — collections, listings, offerings, and future content types."
      />

      <AdminCardGrid columns={3}>
        {types.map((type) => {
          const Icon = ICONS[type.icon] ?? Box;
          return (
            <Card key={type.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Icon className="h-8 w-8 text-primary opacity-80" />
                  <Badge variant="secondary">{type._count.items} items</Badge>
                </div>
                <CardTitle className="text-lg">{type.labelPluralEn}</CardTitle>
                <CardDescription>{type.nameEn}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/admin/content/${type.slug}`}>Manage</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/content/${type.slug}/new`}>Add new</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </AdminCardGrid>

      {types.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No content types configured. Run seed or migration to initialize built-in types.
        </p>
      ) : null}
    </div>
  );
}
