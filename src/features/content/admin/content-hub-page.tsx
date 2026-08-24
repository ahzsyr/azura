"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Briefcase,
  Building2,
  ExternalLink,
  Folder,
  Layers,
  MoreHorizontal,
  Package,
  Plus,
  Settings2,
  Tag,
} from "lucide-react";
import type { ContentType } from "@prisma/client";
import { AdminCardGrid, AdminPageHeader, AdminSettingsRibbon } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  readAdminDefaultLocaleField,
  type AdminLocalizedEntityView,
} from "@/features/translation/admin-localized-view";
import { getBuiltinContentType } from "@/features/content/content-type.registry";
import { isCustomContentTypeSlug } from "@/templates/preset-template-map";
import { ContentTypeQuickCreateModal } from "@/features/content/admin/content-type-quick-create-modal";
import {
  contentCollectionPublicPath,
  contentTypeItemsHref,
  contentTypeNewItemHref,
  contentTypePublicPath,
  contentTypeSettingsHref,
} from "@/features/content/content-admin-paths";

const ICONS: Record<string, typeof Box> = {
  package: Package,
  building: Building2,
  briefcase: Briefcase,
  box: Box,
  layers: Layers,
  folder: Folder,
  tag: Tag,
};

const HUB_TABS = [
  { id: "content", label: "Content" },
  { id: "types", label: "Types" },
] as const;

type HubTabId = (typeof HUB_TABS)[number]["id"];

export type HubCollection = {
  id: string;
  slug: string;
  name: string;
  isPublished: boolean;
};

export type HubContentType = AdminLocalizedEntityView<
  ContentType & { _count: { items: number; collections: number } }
> & {
  collections: HubCollection[];
};

type Props = {
  types: HubContentType[];
  initialTab?: string;
};

function resolveHubTab(value: string | undefined): HubTabId {
  return value === "types" ? "types" : "content";
}

function resolveTypeLabel(
  type: HubContentType,
  field: "labelPlural" | "labelSingular" | "name",
): string {
  const fromTranslation = readAdminDefaultLocaleField(type, field, "");
  if (fromTranslation) return fromTranslation;
  const builtin = getBuiltinContentType(type.slug);
  if (!builtin) return type.slug;
  if (field === "labelPlural") return builtin.labelPluralEn;
  if (field === "labelSingular") return builtin.labelSingularEn;
  return builtin.nameEn;
}

function PreviewLink({
  href,
  children,
  className,
}: {
  href: string | null;
  children: ReactNode;
  className?: string;
}) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70" title="Set a route prefix to preview">
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className ?? "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"}
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function TypeActionMenu({
  type,
  pluralLabel,
  singularLabel,
}: {
  type: HubContentType;
  pluralLabel: string;
  singularLabel: string;
}) {
  const previewHref = contentTypePublicPath(type.routePrefix, type.slug);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`More actions for ${pluralLabel}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Link & preview</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={contentTypeItemsHref(type.slug)}>Manage {pluralLabel.toLowerCase()}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={contentTypeNewItemHref(type.slug)}>Add {singularLabel.toLowerCase()}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={contentTypeSettingsHref(type.id)}>Edit type schema</Link>
        </DropdownMenuItem>
        {previewHref ? (
          <DropdownMenuItem asChild>
            <a href={previewHref} target="_blank" rel="noreferrer">
              Preview type listing
            </a>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>Preview type listing</DropdownMenuItem>
        )}
        {type.collections.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Collections</DropdownMenuLabel>
            {type.collections.slice(0, 6).map((collection) => (
              <DropdownMenuItem key={collection.id} asChild>
                <Link href={contentTypeItemsHref(type.slug, collection.slug)}>
                  Items in {collection.name}
                </Link>
              </DropdownMenuItem>
            ))}
            {type.collections.slice(0, 6).map((collection) => {
              const collectionPreview = contentCollectionPublicPath(type.routePrefix, collection.slug, type.slug);
              if (!collectionPreview) return null;
              return (
                <DropdownMenuItem key={`preview-${collection.id}`} asChild>
                  <a href={collectionPreview} target="_blank" rel="noreferrer">
                    Preview {collection.name}
                  </a>
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollectionLinks({ type }: { type: HubContentType }) {
  if (type.collections.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No collections yet. Items of this type can still be added directly.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {type.collections.slice(0, 4).map((collection) => {
        const previewHref = contentCollectionPublicPath(type.routePrefix, collection.slug, type.slug);
        return (
          <div
            key={collection.id}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px]"
          >
            <Link
              href={contentTypeItemsHref(type.slug, collection.slug)}
              className="hover:text-foreground"
              title={`Items in ${collection.name}`}
            >
              {collection.name}
            </Link>
            {previewHref ? (
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                aria-label={`Preview ${collection.name}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        );
      })}
      {type.collections.length > 4 ? (
        <span className="self-center text-[11px] text-muted-foreground">
          +{type.collections.length - 4} more
        </span>
      ) : null}
    </div>
  );
}

export function ContentHubPage({ types, initialTab }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HubTabId>(() => resolveHubTab(initialTab));

  const enabledTypes = useMemo(() => types.filter((type) => type.isEnabled), [types]);
  const contentTypes = enabledTypes.length > 0 ? enabledTypes : types;

  const handleTabChange = (tabId: string) => {
    const next: HubTabId = tabId === "types" ? "types" : "content";
    setActiveTab(next);
    router.replace(next === "types" ? "/admin/content?tab=types" : "/admin/content", {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content"
        description="Manage catalog content types, items, collections, and public routes."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 me-1.5" />
            New type
          </Button>
        }
      />

      <AdminSettingsRibbon
        tabs={HUB_TABS.map((tab) => ({
          id: tab.id,
          label: tab.id === "content" ? `Content (${contentTypes.length})` : `Types (${types.length})`,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        layoutId="content-hub-ribbon"
        variant="wrap"
      />

      {activeTab === "content" ? (
        <section aria-labelledby="tab-content">
          {contentTypes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No content types configured</p>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Create a type to start adding items, or run seed to initialize built-in types.
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create first type
              </Button>
            </div>
          ) : (
            <AdminCardGrid columns={3}>
              {contentTypes.map((type) => {
                const Icon = ICONS[type.icon] ?? Box;
                const pluralLabel = resolveTypeLabel(type, "labelPlural");
                const singularLabel = resolveTypeLabel(type, "labelSingular");
                const typeName = resolveTypeLabel(type, "name");
                const previewHref = contentTypePublicPath(type.routePrefix, type.slug);
                return (
                  <Card key={type.id} className="flex flex-col transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {type._count.items} {type._count.items === 1 ? "item" : "items"}
                          </Badge>
                          {type._count.collections > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {type._count.collections}{" "}
                              {type._count.collections === 1 ? "collection" : "collections"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <CardTitle className="mt-2 text-base">{pluralLabel}</CardTitle>
                      <CardDescription className="text-xs">
                        {typeName}
                        <span className="text-muted-foreground/80"> · {type.slug}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-3 pt-0">
                      <CollectionLinks type={type} />
                      <div className="flex items-center justify-between gap-2">
                        <PreviewLink href={previewHref}>Preview listing</PreviewLink>
                        <Link
                          href={contentTypeSettingsHref(type.id)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Settings2 className="h-3 w-3" />
                          Type settings
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link href={contentTypeItemsHref(type.slug)}>Manage</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" title={`Add ${singularLabel.toLowerCase()}`}>
                          <Link href={contentTypeNewItemHref(type.slug)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <TypeActionMenu
                          type={type}
                          pluralLabel={pluralLabel}
                          singularLabel={singularLabel}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </AdminCardGrid>
          )}
        </section>
      ) : (
        <section aria-labelledby="tab-types" className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Content types
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define schemas, field definitions, and display settings. Open items of a type, or preview its public listing and collections.
            </p>
          </div>

          {types.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">No content types yet.</p>
              <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                New type
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {types.map((type) => {
                const Icon = ICONS[type.icon] ?? Box;
                const pluralLabel = resolveTypeLabel(type, "labelPlural");
                const singularLabel = resolveTypeLabel(type, "labelSingular");
                const previewHref = contentTypePublicPath(type.routePrefix, type.slug);
                const custom = isCustomContentTypeSlug(type.slug);
                return (
                  <div
                    key={type.id}
                    className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-muted p-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{pluralLabel}</p>
                          <Badge variant={custom ? "secondary" : "outline"}>
                            {custom ? "Custom" : "Preset"}
                          </Badge>
                          {!type.isEnabled ? <Badge variant="outline">Disabled</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {type.slug}
                          {type.routePrefix ? ` · /${type.routePrefix}` : ` · /${type.slug}`}
                          {` · ${type._count.items} items`}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={contentTypeSettingsHref(type.id)}>Edit</Link>
                      </Button>
                    </div>
                    <CollectionLinks type={type} />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={contentTypeItemsHref(type.slug)}>Items</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={contentTypeNewItemHref(type.slug)}>
                          <Plus className="h-3.5 w-3.5 me-1" />
                          {singularLabel}
                        </Link>
                      </Button>
                      <PreviewLink href={previewHref}>Preview type</PreviewLink>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <ContentTypeQuickCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
