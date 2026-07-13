"use client";

import Link from "next/link";
import {
  Box,
  Briefcase,
  Building2,
  Package,
  Plus,
  Settings2,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { ContentType } from "@prisma/client";
import { AdminCardGrid, AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  readAdminDefaultLocaleField,
  type AdminLocalizedEntityView,
} from "@/features/translation/admin-localized-view";
import { getBuiltinContentType } from "@/features/content/content-type.registry";

const ICONS: Record<string, typeof Box> = {
  package: Package,
  building: Building2,
  briefcase: Briefcase,
  box: Box,
};

type TypeWithCount = AdminLocalizedEntityView<
  ContentType & { _count: { items: number; collections: number } }
>;

type Props = {
  types: TypeWithCount[];
};

function resolveTypeLabel(
  type: TypeWithCount,
  field: "labelPlural" | "name"
): string {
  const fromTranslation = readAdminDefaultLocaleField(type, field, "");
  if (fromTranslation) return fromTranslation;
  const builtin = getBuiltinContentType(type.slug);
  if (!builtin) return type.slug;
  if (field === "labelPlural") return builtin.labelPluralEn;
  return builtin.nameEn;
}

export function ContentHubPage({ types }: Props) {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Content"
        description="Manage all content types — packages, listings, offerings, and custom types."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/content/types/new">
              <Plus className="h-3.5 w-3.5 me-1.5" />
              New type
            </Link>
          </Button>
        }
      />

      {/* Content type cards */}
      <AdminCardGrid columns={3}>
        {types.map((type) => {
          const Icon = ICONS[type.icon] ?? Box;
          const pluralLabel = resolveTypeLabel(type, "labelPlural");
          const typeName = resolveTypeLabel(type, "name");
          return (
            <Card key={type.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {type._count.items} {type._count.items === 1 ? "item" : "items"}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{pluralLabel}</CardTitle>
                <CardDescription className="text-xs">{typeName}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2 pt-0">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/admin/content/${type.slug}`}>Manage</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/content/${type.slug}/new`}>
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </AdminCardGrid>

      {types.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No content types configured</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Run seed or migration to initialize built-in types.
          </p>
          <Button asChild size="sm">
            <Link href="/admin/content/types/new">Create first type</Link>
          </Button>
        </div>
      )}

      {/* Content Types management section */}
      <div>
        <Separator className="mb-6" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Content Types
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define schemas, field definitions, and display settings for each content type.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/content/types">
                View all
                <ArrowRight className="h-3.5 w-3.5 ms-1.5" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/content/types/new">
                <Plus className="h-3.5 w-3.5 me-1" />
                New type
              </Link>
            </Button>
          </div>
        </div>
        <AdminCardGrid columns={3}>
          {types.map((type) => {
            const Icon = ICONS[type.icon] ?? Box;
            const pluralLabel = resolveTypeLabel(type, "labelPlural");
            return (
              <Link
                key={`type-${type.id}`}
                href={`/admin/content/types/${type.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="rounded-md bg-muted p-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{pluralLabel}</p>
                  <p className="text-xs text-muted-foreground">{type.slug}</p>
                </div>
                <Settings2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              </Link>
            );
          })}
        </AdminCardGrid>
      </div>
    </div>
  );
}
