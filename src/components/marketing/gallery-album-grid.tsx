import { Link } from "@/i18n/navigation";
import { Images } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { GalleryAlbumPublic } from "@/features/gallery/types";
import { getLocalizedField } from "@/lib/utils";
import { sharedElementAttrs, sharedElementRootAttrs } from "@/lib/navigation/shared-elements";

type Props = {
  albums: GalleryAlbumPublic[];
  locale: string;
};

export async function GalleryAlbumGrid({ albums, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "gallery" });

  if (albums.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <Images className="mx-auto h-10 w-10 opacity-40" />
        <p className="mt-4">{t("noGalleries")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => {
        const imageShared = sharedElementAttrs("gallery", album.slug, "image");
        const titleShared = sharedElementAttrs("gallery", album.slug, "title");
        return (
        <Link
          key={album.id}
          href={`/gallery/${album.slug}`}
          className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
          {...sharedElementRootAttrs("gallery", album.slug)}
        >
          <div
            className="aspect-video overflow-hidden bg-muted"
            data-shared-element={imageShared["data-shared-element"]}
            data-shared-element-type={imageShared["data-shared-element-type"]}
            data-shared-element-id={imageShared["data-shared-element-id"]}
            style={imageShared.style}
          >
            {album.coverUrl ? (
              <img
                src={album.coverUrl}
                alt={getLocalizedField(album, "title", locale)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Images className="h-10 w-10 opacity-40" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3
              className="font-medium"
              data-shared-element={titleShared["data-shared-element"]}
              data-shared-element-type={titleShared["data-shared-element-type"]}
              data-shared-element-id={titleShared["data-shared-element-id"]}
              style={titleShared.style}
            >
              {getLocalizedField(album, "title", locale)}
            </h3>
            {getLocalizedField(album, "excerpt", locale) && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {getLocalizedField(album, "excerpt", locale)}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("mediaCount", { count: album.mediaCount })}
            </p>
          </div>
        </Link>
        );
      })}
    </div>
  );
}
