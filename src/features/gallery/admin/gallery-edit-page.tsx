"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
import { GalleryMediaManager } from "./gallery-media-manager";
import { GalleryMediaSortList } from "./gallery-media-sort-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import type { GalleryMediaAdmin } from "@/features/gallery/types";

const GALLERY_TABS = [
  { id: "details", label: "Details" },
  { id: "add-media", label: "Add Media" },
  { id: "media", label: "Media" },
] as const;

type Props = {
  album: Gallery & { media: GalleryMedia[] };
  locales: PublicLocale[];
  translations?: EntityTranslation[];
};

function GalleryEditPageContent({ album, locales, translations = [] }: Props) {
  const albumLegacy = useMemo(
    () => ({
      ...album,
      ...legacyShapeFromTranslations(translations, ["title"]),
    }),
    [album, translations]
  ) as Gallery & { media: GalleryMedia[]; titleEn: string; titleAr: string };

  const mediaItems = useMemo(
    () =>
      album.media.map((item) => ({
        ...item,
        titleEn: "",
        titleAr: "",
        excerptEn: null,
        excerptAr: null,
        descriptionEn: "",
        descriptionAr: "",
        infoEn: null,
        infoAr: null,
      })) as GalleryMediaAdmin[],
    [album.media]
  );

  const router = useRouter();
  const albumFormRef = useRef<HTMLFormElement>(null);
  const mediaFormRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [publishing, startPublishTransition] = useTransition();
  const albumPatch = useEntityFormPatch({ formRef: albumFormRef });

  const handleSaveDetails = useCallback(async () => {
    await patchGalleryFromForm(album.id, albumPatch.getBaseline(), albumPatch.getCurrent());
    albumPatch.resetBaseline();
    router.refresh();
    return true;
  }, [album.id, albumPatch, router]);

  const handleSaveMedia = useCallback(() => {
    mediaFormRef.current?.requestSubmit();
  }, []);

  const onSave = useMemo(() => {
    if (activeTab === "details") return handleSaveDetails;
    if (activeTab === "media" && editingMediaId) return handleSaveMedia;
    return undefined;
  }, [activeTab, editingMediaId, handleSaveDetails, handleSaveMedia]);

  const handlePreview = useCallback(() => {
    window.open(`/gallery/${album.slug}`, "_blank", "noopener,noreferrer");
  }, [album.slug]);

  const handlePublish = useCallback(() => {
    startPublishTransition(async () => {
      await toggleGalleryPublished(album.id, true);
      router.refresh();
    });
  }, [album.id, router]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== "media") {
      setEditingMediaId(null);
    }
  }, []);

  const description = `${album.media.length} item${album.media.length === 1 ? "" : "s"} · /gallery/${album.slug}`;

  return (
    <AdminFormProvider
      onSave={onSave}
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
        onTabChange={handleTabChange}
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

            {tab === "add-media" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add media</CardTitle>
                  <CardDescription>Link a URL, upload a file, or pick from the media library.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GalleryMediaManager galleryId={album.id} />
                </CardContent>
              </Card>
            )}

            {tab === "media" && (
              <Card>
                <CardHeader>
                  <CardTitle>Media ({album.media.length})</CardTitle>
                  <CardDescription>Reorder, edit, show/hide, or delete gallery items.</CardDescription>
                </CardHeader>
                <CardContent>
                  <GalleryMediaSortList
                    galleryId={album.id}
                    items={mediaItems}
                    editingMediaId={editingMediaId}
                    onEditingMediaChange={setEditingMediaId}
                    mediaFormRef={mediaFormRef}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AdminSettingsLayout>

      {onSave && (
        <div className="flex flex-wrap gap-3 border-t pt-4 lg:hidden">
          <Button type="button" onClick={onSave}>
            Save
          </Button>
        </div>
      )}
    </AdminFormProvider>
  );
}

export function GalleryEditPage({ album, locales, translations }: Props) {
  return (
    <GalleryEditPageContent album={album} locales={locales} translations={translations} />
  );
}
