"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaManager } from "@/features/media/components/media-manager";
import { CatalogMediaManager } from "@/features/media/components/catalog-media-manager";
import type { MediaAssetRow } from "@/features/media/components/media-asset-card";
import type { MediaFolder, MediaType } from "@prisma/client";

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

export function MediaAdminTabs(props: Props) {
  return (
    <Tabs defaultValue="site" className="w-full">
      <TabsList>
        <TabsTrigger value="site">Site (filesystem)</TabsTrigger>
        <TabsTrigger value="cms">CMS (database)</TabsTrigger>
      </TabsList>
      <TabsContent value="site" className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Site media files used by the catalog and block pickers. On serverless hosts, uploads and deletes use Supabase Storage.
        </p>
        <CatalogMediaManager />
      </TabsContent>
      <TabsContent value="cms" className="mt-6">
        <MediaManager
          initialAssets={props.initialAssets}
          folders={props.folders}
          totalBytes={props.totalBytes}
          storageByType={props.storageByType}
        />
      </TabsContent>
    </Tabs>
  );
}
