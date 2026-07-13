"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, Gallery, GalleryMedia } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { toggleGalleryPublished, patchGalleryFromForm } from "@/features/gallery/actions";
import { useEntityFormPatch } from "@/hooks/use-entity-form-patch";
import {
  AdminFormProvider,
  AdminPageHeader,
} from "@/components/admin/layout/admin-shell";
import { AdminSettingsLayout } from "@/components/admin/layout/admin-settings-layout";
import { GalleryAlbumForm } from "./gallery-album-form";
import { GalleryAddMediaModal } from "./gallery-add-media-modal";
import { GalleryMediaSortList } from "./gallery-media-sort-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import type { GalleryMediaAdmin } from "@/features/gallery/types";

const GALLERY_TABS = [
  { id: "details", label: "Details" },
  { id: "media", label: "Media" },
] as const;

const MEDIA_FIELDS = ["title", "excerpt", "description", "info"] as const;

function mapMediaAdmin(
  item: GalleryMedia,
  mediaTranslations: Map<string, EntityTranslation[]>
): GalleryMediaAdmin {
  const rowTranslations = mediaTranslations.get(item.id) ?? [];
  const legacy = legacyShapeFromTranslations(rowTranslations, [...MEDIA_FIELDS]);
  return {
    ...item,
    titleEn: legacy.titleEn ?? "",
    titleAr: legacy.titleAr ?? "",
    excerptEn: legacy.excerptEn || null,
    excerptAr: legacy.excerptAr || null,
    descriptionEn: legacy.descriptionEn ?? "",
    descriptionAr: legacy.descriptionAr ?? "",
    infoEn: legacy.infoEn || null,
    infoAr: legacy.infoAr || null,
  };
}

type Props = {
  album: Gallery & { media: GalleryMedia[] };
  locales: PublicLocale[];
  translations?: EntityTranslation[];
  mediaTranslations?: Map<string, EntityTranslation[]>;
};

function GalleryEditPageContent({
  album,
  locales,
  translations = [],
  mediaTranslations = new Map(),
}: Props) {
  const albumLegacy = useMemo(
    () => ({
      ...album,
      ...legacyShapeFromTranslations(translations, ["title"]),
    }),
    [album, translations]
  ) as Gallery & { media: GalleryMedia[]; titleEn: string; titleAr: string };

  const mediaItems = useMemo(
    () => album.media.map((item) => mapMediaAdmin(item, mediaTranslations)),
    [album.media, mediaTranslations]
  );

  const router = useRouter();
  const albumFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [publishing, startPublishTransition] = useTransition();
  const albumPatch = useEntityFormPatch({ formRef: albumFormRef });

  const handleSaveDetails = useCallback(async () => {
    await patchGalleryFromForm(album.id, albumPatch.getBaseline(), albumPatch.getCurrent());
    albumPatch.resetBaseline();
    router.refresh();
    return true;
  }, [album.id, albumPatch, router]);

  const handlePreview = useCallback(() => {
    window.open(`/gallery/${album.slug}`, "_blank", "noopener,noreferrer");
  }, [album.slug]);

  const handlePublish = useCallback(() => {
    startPublishTransition(async () => {
      await toggleGalleryPublished(album.id, true);
      router.refresh();
    });
  }, [album.id, router]);

  const description = `${album.media.length} item${album.media.length === 1 ? "" : "s"} · /gallery/${album.slug}`;

  return (
    <AdminFormProvider
      onSave={activeTab === "details" ? handleSaveDetails : undefined}
      getBaseline={activeTab === "details" ? albumPatch.getBaseline : undefined}
      getCurrent={activeTab === "details" ? albumPatch.getCurrent : undefined}
      patchSyncKey={activeTab === "details" ? album.updatedAt : undefined}
      onPreview={handlePreview}
      onPublish={handlePublish}
      canPreview={album.isPublished}
      canPublish={!publishing}
    >
      <AdminPageHeader
        title={`Edit: ${albumLegacy.titleEn}`}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!album.isPublished && <Badge variant="secondary">Hidden</Badge>}
            {album.isPublished && (
              <Link
                href={`/gallery/${album.slug}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-primary"
              >
                <ExternalLink className="h-3 w-3" /> View live
              </Link>
            )}
          </div>
        }
      />

      <AdminSettingsLayout
        tabs={[...GALLERY_TABS]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {(tab) => (
          <>
            {tab === "details" && (
              <Card>
                <CardHeader>
                  <CardTitle>Gallery details</CardTitle>
                  <CardDescription>Title, slug, descriptions, cover image, and publish status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GalleryAlbumForm
                    album={albumLegacy}
                    locales={locales}
                    translations={translations}
                    mode="edit"
                    embedded
                    formRef={albumFormRef}
                  />
                </CardContent>
              </Card>
            )}

            {tab === "media" && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Media ({album.media.length})</CardTitle>
                    <CardDescription>Reorder, edit, show/hide, or delete gallery items.</CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={() => setAddMediaOpen(true)}>
                    <Plus className="me-1 h-4 w-4" />
                    Add media
                  </Button>
                </CardHeader>
                <CardContent>
                  <GalleryMediaSortList
                    galleryId={album.id}
                    items={mediaItems}
                    onAddMedia={() => setAddMediaOpen(true)}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AdminSettingsLayout>

      <GalleryAddMediaModal
        galleryId={album.id}
        open={addMediaOpen}
        onOpenChange={setAddMediaOpen}
      />

      {activeTab === "details" && (
        <div className="flex flex-wrap gap-3 border-t pt-4 lg:hidden">
          <Button type="button" onClick={handleSaveDetails}>
            Save
          </Button>
        </div>
      )}
    </AdminFormProvider>
  );
}

export function GalleryEditPage({
  album,
  locales,
  translations,
  mediaTranslations,
}: Props) {
  return (
    <GalleryEditPageContent
      album={album}
      locales={locales}
      translations={translations}
      mediaTranslations={mediaTranslations}
    />
  );
}
