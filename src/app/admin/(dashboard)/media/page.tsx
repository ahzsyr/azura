import { mediaRepository } from "@/repositories/media.repository";
import { MediaAdminTabs } from "@/features/media/components/media-admin-tabs";

export default async function MediaAdminPage() {
  let assets;
  let folders;
  let totalBytes;
  let storageByType;
  try {
    [assets, folders, totalBytes, storageByType] = await Promise.all([
      mediaRepository.listAssets(),
      mediaRepository.listFolders(),
      mediaRepository.totalStorageBytes(),
      mediaRepository.storageStatsByType(),
    ]);
  } catch (err) {
    throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Media Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Site media for the JSON catalog lives on disk under /uploads. CMS media is stored in the database.
        </p>
      </div>
      <MediaAdminTabs
        initialAssets={assets as import("@/features/media/components/media-asset-card").MediaAssetRow[]}
        folders={folders}
        totalBytes={totalBytes}
        storageByType={storageByType}
      />
    </div>
  );
}
