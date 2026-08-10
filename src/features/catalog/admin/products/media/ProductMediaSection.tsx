import type { MediaItem, MediaType } from "@/features/media/fs/types";
import type { ProductMedia, ProductMediaFile } from "@/features/products/types";
import type { ManagedProduct } from "@/features/products/lib/product-manager-normalize";
import { objectPatch, readControlledCheckboxChecked, readControlledInputValue } from "./product-media-utils";
import { ProductMediaUploader } from "./ProductMediaUploader";
import { ProductMediaTable } from "./ProductMediaTable";

type Props = {
  media: ProductMedia;
  productTitle: string;
  patchActive: (mutator: (product: ManagedProduct) => ManagedProduct) => void;
  openMediaPicker: (accept: MediaType[] | undefined, onSelect: (item: MediaItem) => void) => void;
};

export function ProductMediaSection({ media, productTitle, patchActive, openMediaPicker }: Props) {
  return (
    <div className="pm-product-media text-foreground">
      <p className="mb-3 text-[0.72rem] leading-relaxed text-muted-foreground">
        Paste a URL, upload files, or pick from the Media Library. Files can be stored under{" "}
        <code className="rounded bg-primary/10 px-1 text-foreground">/uploads/</code> and referenced by URL.
      </p>

      <ProductMediaUploader
        onAddEmptyRow={(kind) => {
          if (kind === "image") {
            patchActive((prev) => ({
              ...prev,
              media: { ...prev.media, images: [...(prev.media.images || []), { url: "", alt: "", type: "gallery" }] },
            }));
          } else if (kind === "video") {
            patchActive((prev) => ({
              ...prev,
              media: { ...prev.media, videos: [...(prev.media.videos || []), { url: "", type: "youtube" }] },
            }));
          } else {
            patchActive((prev) => ({
              ...prev,
              media: {
                ...prev.media,
                files: [...((prev.media.files || []) as ProductMediaFile[]), { name: "", url: "" }],
              },
            }));
          }
        }}
        onAddImageWithUrl={(url, alt) => {
          patchActive((prev) => ({
            ...prev,
            media: {
              ...prev.media,
              images: [
                ...(prev.media.images || []),
                { url, alt: alt || productTitle, type: "gallery" as const },
              ],
            },
          }));
        }}
        onAddVideoWithUrl={(url) => {
          patchActive((prev) => ({
            ...prev,
            media: {
              ...prev.media,
              videos: [...(prev.media.videos || []), { url, type: url.startsWith("data:") ? ("upload" as const) : ("youtube" as const) }],
            },
          }));
        }}
        onAddFileWithUrl={(name, url) => {
          patchActive((prev) => ({
            ...prev,
            media: {
              ...prev.media,
              files: [...((prev.media.files || []) as ProductMediaFile[]), { name, url }],
            },
          }));
        }}
        openMediaPicker={openMediaPicker}
      />

      <ProductMediaTable media={media} patchActive={patchActive} openMediaPicker={openMediaPicker} />

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-3">
        <div className="mb-2 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
          3D model
        </div>
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-[0.78rem] text-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={Boolean(media["3d_model"])}
            onChange={(e) =>
              patchActive((prev) => ({
                ...prev,
                media: { ...prev.media, "3d_model": readControlledCheckboxChecked(e) },
              }))
            }
          />
          <span>Flag product as having a 3D model</span>
        </label>
        {(() => {
          const files = (media.files || []) as ProductMediaFile[];
          const dIdx = files.findIndex((x) => x.type === "3d_model");
          const dUrl = dIdx >= 0 ? ((files[dIdx].url as string | undefined) ?? "") : "";
          return (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                value={dUrl}
                placeholder="GLB / GLTF / viewer URL"
                onChange={(e) => {
                  const v = readControlledInputValue(e);
                  patchActive((prev) => {
                    const copy = [...(((prev.media.files || []) as ProductMediaFile[]) ?? [])];
                    let i = copy.findIndex((x) => x.type === "3d_model");
                    if (i < 0) {
                      copy.push({ type: "3d_model", name: "3D model", url: v });
                      i = copy.length - 1;
                    } else {
                      const row = objectPatch(copy[i]);
                      copy[i] = { ...row, type: "3d_model", name: (row.name as string) || "3D model", url: v };
                    }
                    return {
                      ...prev,
                      media: { ...prev.media, files: copy, "3d_model": Boolean(v.trim()) || prev.media["3d_model"] },
                    };
                  });
                }}
              />
              <button
                type="button"
                className="rounded-md border border-primary/30 bg-primary/12 px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-primary/20"
                onClick={() =>
                  openMediaPicker(["other"], (item) => {
                    patchActive((prev) => {
                      const copy = [...(((prev.media.files || []) as ProductMediaFile[]) ?? [])];
                      let i = copy.findIndex((x) => x.type === "3d_model");
                      if (i < 0) copy.push({ type: "3d_model", name: "3D model", url: item.url });
                      else {
                        const row = objectPatch(copy[i]);
                        copy[i] = { ...row, type: "3d_model", name: (row.name as string) || "3D model", url: item.url };
                      }
                      return { ...prev, media: { ...prev.media, files: copy, "3d_model": true } };
                    });
                  })
                }
              >
                Browse Media
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
