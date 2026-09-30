"use client";

import { Suspense, useCallback, useEffect, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MediaManager } from "@/features/media/components/media-manager";
import { CatalogMediaManager } from "@/features/media/components/catalog-media-manager";
import type { MediaAssetRow } from "@/features/media/components/media-asset-card";
import type { MediaFolder, MediaType } from "@prisma/client";
import { IconLibrary } from "@/features/icons";
import { cn } from "@/lib/utils";
import { Database, HardDrive, ImageIcon, Shapes } from "lucide-react";

type FolderRow = MediaFolder & { _count: { assets: number; children: number } };

type StorageStat = {
  mediaType: MediaType;
  _sum: { sizeBytes: number | null };
  _count: { id: number };
};

type Props = {
  initialAssets: MediaAssetRow[];
  folders: FolderRow[];
  totalBytes: number;
  storageByType: StorageStat[];
};

type RootTab = "cms" | "site";
type CmsView = "media" | "icons";

function isRootTab(value: string | null): value is RootTab {
  return value === "cms" || value === "site";
}

function isCmsView(value: string | null): value is CmsView {
  return value === "media" || value === "icons";
}

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  size?: "md" | "sm";
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-grid w-full gap-1 rounded-xl border border-border/80 bg-muted/50 p-1 sm:w-auto",
        options.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-none sm:auto-cols-fr sm:grid-flow-col"
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex items-start gap-2.5 rounded-lg text-start transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              size === "md" ? "px-3.5 py-2.5 sm:min-w-[11.5rem]" : "px-3 py-2 sm:min-w-[8.5rem]",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-md border transition-colors",
                size === "md" ? "h-8 w-8" : "h-7 w-7",
                active
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-transparent bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}
            >
              <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className={cn("block font-medium", size === "md" ? "text-sm" : "text-xs")}>
                {option.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-muted-foreground",
                  size === "md" ? "text-[11px]" : "text-[10px]",
                  active ? "text-muted-foreground" : "opacity-80"
                )}
              >
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ROOT_OPTIONS: SegmentOption<RootTab>[] = [
  {
    value: "cms",
    label: "CMS",
    description: "Database library",
    icon: Database,
  },
  {
    value: "site",
    label: "Site",
    description: "Filesystem /uploads",
    icon: HardDrive,
  },
];

const CMS_VIEW_OPTIONS: SegmentOption<CmsView>[] = [
  {
    value: "media",
    label: "Media",
    description: "Images, video, files",
    icon: ImageIcon,
  },
  {
    value: "icons",
    label: "Icons",
    description: "SVG icon set",
    icon: Shapes,
  },
];

function MediaAdminTabsClient(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const viewParam = searchParams.get("view");
  const iconIdParam = searchParams.get("iconId");

  const [rootTab, setRootTab] = useState<RootTab>(() => (isRootTab(tabParam) ? tabParam : "cms"));
  const [cmsView, setCmsView] = useState<CmsView>(() => (isCmsView(viewParam) ? viewParam : "media"));

  useEffect(() => {
    if (isRootTab(tabParam)) setRootTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (isCmsView(viewParam)) setCmsView(viewParam);
  }, [viewParam]);

  const replaceParams = useCallback(
    (updates: { tab?: RootTab; view?: CmsView; iconId?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextTab = updates.tab ?? rootTab;
      const nextView = updates.view ?? cmsView;

      params.set("tab", nextTab);
      if (nextTab === "cms") {
        params.set("view", nextView);
        if (nextView === "icons") {
          if (typeof updates.iconId === "string" && updates.iconId) {
            params.set("iconId", updates.iconId);
          } else if (updates.iconId === null) {
            params.delete("iconId");
          }
        } else {
          params.delete("iconId");
        }
      } else {
        params.delete("view");
        params.delete("iconId");
      }

      router.replace(`/admin/media?${params.toString()}`, { scroll: false });
    },
    [cmsView, rootTab, router, searchParams],
  );

  const handleRootTabChange = (value: string) => {
    if (!isRootTab(value)) return;
    setRootTab(value);
    replaceParams({ tab: value });
  };

  const handleCmsViewChange = (value: string) => {
    if (!isCmsView(value)) return;
    setCmsView(value);
    replaceParams({ view: value, iconId: value === "icons" ? undefined : null });
  };

  const handleIconIdChange = (iconId: string | null) => {
    if (!iconId) {
      replaceParams({ view: "icons", iconId: null });
      return;
    }
    setCmsView("icons");
    setRootTab("cms");
    replaceParams({ tab: "cms", view: "icons", iconId });
  };

  return (
    <Tabs value={rootTab} onValueChange={handleRootTabChange} className="w-full">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Storage source
          </p>
          <SegmentedControl
            ariaLabel="Storage source"
            value={rootTab}
            onChange={handleRootTabChange}
            options={ROOT_OPTIONS}
          />
        </div>

        {rootTab === "cms" ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Library
            </p>
            <SegmentedControl
              ariaLabel="CMS library"
              value={cmsView}
              onChange={handleCmsViewChange}
              options={CMS_VIEW_OPTIONS}
              size="sm"
            />
          </div>
        ) : null}
      </div>

      <TabsContent value="cms" className="mt-6">
        {cmsView === "media" ? (
          <MediaManager
            initialAssets={props.initialAssets}
            folders={props.folders}
            totalBytes={props.totalBytes}
            storageByType={props.storageByType}
          />
        ) : (
          <IconLibrary
            initialIconId={cmsView === "icons" ? iconIdParam : null}
            onIconIdChange={handleIconIdChange}
          />
        )}
      </TabsContent>
      <TabsContent value="site" className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Site media files used by the catalog and block pickers. On serverless hosts, uploads and deletes use cloud storage.
        </p>
        <CatalogMediaManager />
      </TabsContent>
    </Tabs>
  );
}

function MediaAdminTabsFallback() {
  return <div className="h-48 animate-pulse rounded-lg bg-muted/40" aria-hidden />;
}

export function MediaAdminTabs(props: Props) {
  return (
    <Suspense fallback={<MediaAdminTabsFallback />}>
      <MediaAdminTabsClient {...props} />
    </Suspense>
  );
}
