import { useCallback, useMemo, useRef, useState } from "react";
import type { MediaType } from "@/features/media/fs/types";
import type { ProductMedia, ProductMediaFile, ProductMediaImageType, ProductMediaVideoType } from "@/features/products/types";
import type { ManagedProduct } from "@/features/products/lib/product-manager-normalize";
import { objectPatch } from "./product-media-utils";
import { ProductMediaRow } from "./ProductMediaRow";

type RowKind = "image" | "video" | "file";

function dragKey(kind: RowKind, index: number) {
  return `${kind}:${index}`;
}

function parseDragKey(key: string): { kind: RowKind; index: number } | null {
  const [kind, idx] = key.split(":");
  if (kind !== "image" && kind !== "video" && kind !== "file") return null;
  const index = Number(idx);
  if (!Number.isFinite(index)) return null;
  return { kind: kind as RowKind, index };
}

function fileLabel(url: string): string {
  const u = url.split("?")[0] ?? "";
  const base = u.split("/").pop() || u;
  return base.slice(0, 48) || "Video";
}

type Props = {
  media: ProductMedia;
  patchActive: (mutator: (product: ManagedProduct) => ManagedProduct) => void;
  openMediaPicker: (accept: MediaType[] | undefined, onSelect: (item: { url: string; alt?: string }) => void) => void;
};

export function ProductMediaTable({ media, patchActive, openMediaPicker }: Props) {
  const images = media.images || [];
  const videos = media.videos || [];
  const files = ((media.files || []) as ProductMediaFile[]).filter((f) => f.type !== "3d_model");
  const dragSrc = useRef<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rowKeys = useMemo(() => {
    const keys: string[] = [];
    images.forEach((_, i) => keys.push(dragKey("image", i)));
    videos.forEach((_, i) => keys.push(dragKey("video", i)));
    files.forEach((_, i) => keys.push(dragKey("file", i)));
    return keys;
  }, [images, videos, files]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === rowKeys.length) setSelected(new Set());
    else setSelected(new Set(rowKeys));
  }, [rowKeys, selected.size]);

  const onDragStart = useCallback((e: React.DragEvent, key: string) => {
    dragSrc.current = key;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      const srcKey = dragSrc.current || e.dataTransfer.getData("text/plain");
      dragSrc.current = null;
      if (!srcKey || srcKey === targetKey) return;
      const src = parseDragKey(srcKey);
      const tgt = parseDragKey(targetKey);
      if (!src || !tgt || src.kind !== tgt.kind) return;
      patchActive((prev) => {
        if (src.kind === "image") {
          const arr = [...(prev.media.images || [])];
          const [item] = arr.splice(src.index, 1);
          arr.splice(tgt.index, 0, item);
          return { ...prev, media: { ...prev.media, images: arr } };
        }
        if (src.kind === "video") {
          const arr = [...(prev.media.videos || [])];
          const [item] = arr.splice(src.index, 1);
          arr.splice(tgt.index, 0, item);
          return { ...prev, media: { ...prev.media, videos: arr } };
        }
        const arr = [...((prev.media.files || []) as ProductMediaFile[])];
        const non3d = arr.filter((f) => f.type !== "3d_model");
        const d3 = arr.filter((f) => f.type === "3d_model");
        const [item] = non3d.splice(src.index, 1);
        non3d.splice(tgt.index, 0, item);
        return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
      });
    },
    [patchActive],
  );

  const confirmDelete = useCallback((label: string) => window.confirm(`Remove this media row?\n${label}`), []);

  const deleteRow = useCallback(
    (kind: RowKind, index: number) => {
      patchActive((prev) => applyDeleteOne(prev, kind, index));
    },
    [patchActive],
  );

  const bulkDelete = useCallback(() => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected media row(s)?`)) return;
    const parsed = [...selected].map(parseDragKey).filter(Boolean) as { kind: RowKind; index: number }[];
    const byKind: Record<RowKind, number[]> = { image: [], video: [], file: [] };
    for (const p of parsed) byKind[p.kind].push(p.index);
    patchActive((prev) => {
      let next = { ...prev };
      for (const kind of ["image", "video", "file"] as RowKind[]) {
        const idxs = [...new Set(byKind[kind])].sort((a, b) => b - a);
        for (const index of idxs) {
          next = applyDeleteOne(next, kind, index);
        }
      }
      return next;
    });
    setSelected(new Set());
  }, [patchActive, selected]);

  const empty = images.length === 0 && videos.length === 0 && files.length === 0;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card/80">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-xs text-foreground">{selected.size} selected</span>
          <button
            type="button"
            className="rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/20"
            onClick={bulkDelete}
          >
            Delete selected
          </button>
        </div>
      )}
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No media added yet</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Use <strong className="font-semibold text-foreground">Add media</strong> above to upload, pick from the library, or paste a URL.
          </p>
        </div>
      ) : (
        <table
          className="w-full min-w-[640px] border-collapse text-left text-xs"
          onDragEnd={() => {
            dragSrc.current = null;
          }}
        >
          <thead>
            <tr className="border-b border-border bg-muted/35 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-1 py-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-primary"
                  checked={rowKeys.length > 0 && selected.size === rowKeys.length}
                  onChange={selectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-2 py-2">Preview</th>
              <th className="px-2 py-2">Name / title</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Role</th>
              <th className="px-2 py-2">URL</th>
              <th className="w-[200px] px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img, idx) => {
              const key = dragKey("image", idx);
              const url = img.url || "";
              return (
                <ProductMediaRow
                  key={key}
                  dragKey={key}
                  selected={selected.has(key)}
                  onToggleSelect={() => toggleSelect(key)}
                  preview={
                    url ? (
                      <img src={url} alt="" className="h-10 w-10 rounded-md border border-primary/15 object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-[0.65rem] text-muted-foreground">
                        IMG
                      </div>
                    )
                  }
                  name={img.alt || ""}
                  onNameChange={(v) =>
                    patchActive((prev) => {
                      const copy = [...(prev.media.images || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), alt: v };
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  typeLabel="Image"
                  roleValue={img.type || "gallery"}
                  roleOptions={[
                    { value: "main", label: "main" },
                    { value: "gallery", label: "gallery" },
                    { value: "thumbnail", label: "thumbnail" },
                  ]}
                  onRoleChange={(v) =>
                    patchActive((prev) => {
                      const copy = [...(prev.media.images || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), type: v as ProductMediaImageType };
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  url={url}
                  onUrlChange={(v) =>
                    patchActive((prev) => {
                      const copy = [...(prev.media.images || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), url: v };
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  canSetMain
                  onSetMain={() =>
                    patchActive((prev) => {
                      const copy = (prev.media.images || []).map((row, i) => {
                        const base = { ...objectPatch(row) };
                        if (i === idx) return { ...base, type: "main" as const };
                        if (row.type === "main") return { ...base, type: "gallery" as const };
                        return { ...base, type: row.type };
                      });
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  onMoveUp={() =>
                    idx > 0 &&
                    patchActive((prev) => {
                      const copy = [...(prev.media.images || [])];
                      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  onMoveDown={() =>
                    idx < images.length - 1 &&
                    patchActive((prev) => {
                      const copy = [...(prev.media.images || [])];
                      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                      return { ...prev, media: { ...prev.media, images: copy } };
                    })
                  }
                  onDelete={() => {
                    if (confirmDelete(url || "Empty image")) deleteRow("image", idx);
                  }}
                  disableUp={idx === 0}
                  disableDown={idx >= images.length - 1}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onOpen={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                />
              );
            })}
            {videos.map((vid, idx) => {
              const key = dragKey("video", idx);
              const url = vid.url || "";
              return (
                <ProductMediaRow
                  key={key}
                  dragKey={key}
                  selected={selected.has(key)}
                  onToggleSelect={() => toggleSelect(key)}
                  nameReadOnly
                  preview={
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-lg">
                      ▶
                    </div>
                  }
                  name={fileLabel(url)}
                  onNameChange={() => {}}
                  typeLabel="Video"
                  roleValue={vid.type || "youtube"}
                  roleOptions={[
                    { value: "youtube", label: "youtube" },
                    { value: "vimeo", label: "vimeo" },
                    { value: "upload", label: "upload" },
                  ]}
                  onRoleChange={(v) =>
                    patchActive((prev) => {
                      const copy = [...(prev.media.videos || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), type: v as ProductMediaVideoType };
                      return { ...prev, media: { ...prev.media, videos: copy } };
                    })
                  }
                  url={url}
                  onUrlChange={(v) =>
                    patchActive((prev) => {
                      const copy = [...(prev.media.videos || [])];
                      copy[idx] = { ...objectPatch(copy[idx]), url: v };
                      return { ...prev, media: { ...prev.media, videos: copy } };
                    })
                  }
                  canSetMain={false}
                  onSetMain={() => {}}
                  onMoveUp={() =>
                    idx > 0 &&
                    patchActive((prev) => {
                      const copy = [...(prev.media.videos || [])];
                      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                      return { ...prev, media: { ...prev.media, videos: copy } };
                    })
                  }
                  onMoveDown={() =>
                    idx < videos.length - 1 &&
                    patchActive((prev) => {
                      const copy = [...(prev.media.videos || [])];
                      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                      return { ...prev, media: { ...prev.media, videos: copy } };
                    })
                  }
                  onDelete={() => {
                    if (confirmDelete(url || "Empty video")) deleteRow("video", idx);
                  }}
                  disableUp={idx === 0}
                  disableDown={idx >= videos.length - 1}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onOpen={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                />
              );
            })}
            {files.map((f, idx) => {
              const key = dragKey("file", idx);
              const url = (f.url as string | undefined) ?? "";
              const name = (f.name as string | undefined) ?? "";
              return (
                <ProductMediaRow
                  key={key}
                  dragKey={key}
                  selected={selected.has(key)}
                  onToggleSelect={() => toggleSelect(key)}
                  preview={
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/30 text-[0.6rem] font-bold text-muted-foreground">
                      FILE
                    </div>
                  }
                  name={name}
                  onNameChange={(v) =>
                    patchActive((prev) => {
                      const all = [...((prev.media.files || []) as ProductMediaFile[])];
                      const non3d = all.filter((x) => x.type !== "3d_model");
                      const d3 = all.filter((x) => x.type === "3d_model");
                      non3d[idx] = { ...objectPatch(non3d[idx]), name: v };
                      return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
                    })
                  }
                  typeLabel="File"
                  roleValue="file"
                  roleOptions={[]}
                  onRoleChange={() => {}}
                  url={url}
                  onUrlChange={(v) =>
                    patchActive((prev) => {
                      const all = [...((prev.media.files || []) as ProductMediaFile[])];
                      const non3d = all.filter((x) => x.type !== "3d_model");
                      const d3 = all.filter((x) => x.type === "3d_model");
                      non3d[idx] = { ...objectPatch(non3d[idx]), url: v };
                      return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
                    })
                  }
                  canSetMain={false}
                  onSetMain={() => {}}
                  onMoveUp={() =>
                    idx > 0 &&
                    patchActive((prev) => {
                      const all = [...((prev.media.files || []) as ProductMediaFile[])];
                      const non3d = all.filter((x) => x.type !== "3d_model");
                      const d3 = all.filter((x) => x.type === "3d_model");
                      [non3d[idx - 1], non3d[idx]] = [non3d[idx], non3d[idx - 1]];
                      return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
                    })
                  }
                  onMoveDown={() =>
                    idx < files.length - 1 &&
                    patchActive((prev) => {
                      const all = [...((prev.media.files || []) as ProductMediaFile[])];
                      const non3d = all.filter((x) => x.type !== "3d_model");
                      const d3 = all.filter((x) => x.type === "3d_model");
                      [non3d[idx], non3d[idx + 1]] = [non3d[idx + 1], non3d[idx]];
                      return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
                    })
                  }
                  onDelete={() => {
                    if (confirmDelete(name || url || "File")) deleteRow("file", idx);
                  }}
                  disableUp={idx === 0}
                  disableDown={idx >= files.length - 1}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onOpen={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function applyDeleteOne(prev: ManagedProduct, kind: RowKind, index: number): ManagedProduct {
  if (kind === "image") {
    const copy = [...(prev.media.images || [])];
    copy.splice(index, 1);
    return { ...prev, media: { ...prev.media, images: copy } };
  }
  if (kind === "video") {
    const copy = [...(prev.media.videos || [])];
    copy.splice(index, 1);
    return { ...prev, media: { ...prev.media, videos: copy } };
  }
  const all = [...((prev.media.files || []) as ProductMediaFile[])];
  const non3d = all.filter((f) => f.type !== "3d_model");
  const d3 = all.filter((f) => f.type === "3d_model");
  non3d.splice(index, 1);
  return { ...prev, media: { ...prev.media, files: [...non3d, ...d3] } };
}
