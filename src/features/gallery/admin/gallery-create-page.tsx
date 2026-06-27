"use client";

import { useCallback, useRef } from "react";
import {
  AdminFormProvider,
  AdminPageHeader,
} from "@/components/admin/layout/admin-shell";
import type { PublicLocale } from "@/i18n/locale-config";
import { GalleryAlbumForm } from "./gallery-album-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locales: PublicLocale[];
};

export function GalleryCreatePage({ locales }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <AdminFormProvider onSave={handleSave}>
      <AdminPageHeader
        title="New Gallery"
        description="Create a gallery album, then add photos and videos on the next screen."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Gallery details</CardTitle>
          <CardDescription>Basic information for the new gallery album.</CardDescription>
        </CardHeader>
        <CardContent>
          <GalleryAlbumForm mode="create" embedded formRef={formRef} locales={locales} />
        </CardContent>
      </Card>

      <div className="flex justify-end lg:hidden">
        <Button type="button" onClick={handleSave}>
          Create gallery
        </Button>
      </div>
    </AdminFormProvider>
  );
}
