import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaItem, MediaType } from "@/features/media/fs/types";

type AddKind = "image" | "video" | "file";

export type ProductMediaUploaderProps = {
  onAddEmptyRow: (kind: AddKind) => void;
  onAddImageWithUrl: (url: string, alt?: string) => void;
  onAddVideoWithUrl: (url: string) => void;
  onAddFileWithUrl: (name: string, url: string) => void;
  openMediaPicker: (accept: MediaType[] | undefined, onSelect: (item: MediaItem) => void) => void;
};

export function ProductMediaUploader({
  onAddEmptyRow,
  onAddImageWithUrl,
  onAddVideoWithUrl,
  onAddFileWithUrl,
  openMediaPicker,
}: ProductMediaUploaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const vidInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuOpen && !pasteOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPasteOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen, pasteOpen]);

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          const url = await new Promise<string | null>((resolve) => {
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (url) onAddImageWithUrl(url, file.name.replace(/\.[^.]+$/, ""));
        } else if (file.type.startsWith("video/")) {
          const reader = new FileReader();
          const url = await new Promise<string | null>((resolve) => {
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (url) onAddVideoWithUrl(url);
        } else {
          const reader = new FileReader();
          const url = await new Promise<string | null>((resolve) => {
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (url) onAddFileWithUrl(file.name || "File", url);
        }
      }
    },
    [onAddFileWithUrl, onAddImageWithUrl, onAddVideoWithUrl],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) void ingestFiles(e.dataTransfer.files);
    },
    [ingestFiles],
  );

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/25 hover:border-primary/40"
        }`}
      >
        <p className="mb-2 text-xs text-muted-foreground">
          Drag and drop files here, or use <strong className="font-semibold text-foreground">Add media</strong> below.
        </p>
        <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
          Images, videos, and other files are stored as URLs (including data URLs for small uploads).
        </p>
      </div>

      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void ingestFiles([f]);
        }}
      />
      <input
        ref={vidInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void ingestFiles([f]);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void ingestFiles([f]);
        }}
      />

      <div className="relative flex flex-wrap items-center gap-2" ref={menuRef}>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/15 px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-primary/25"
          onClick={() => {
            setMenuOpen((o) => !o);
            setPasteOpen(false);
          }}
        >
          + Add media
          <span className="text-[0.65rem] text-muted-foreground">{menuOpen ? "▲" : "▼"}</span>
        </button>

        {menuOpen && (
          <div
            className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                imgInputRef.current?.click();
              }}
            >
              Upload image…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                vidInputRef.current?.click();
              }}
            >
              Upload video…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
            >
              Upload file…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                openMediaPicker(["image", "svg"], (item) => onAddImageWithUrl(item.url, item.alt));
              }}
            >
              Pick image from library…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                openMediaPicker(["video"], (item) => onAddVideoWithUrl(item.url));
              }}
            >
              Pick video from library…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                openMediaPicker(undefined, (item) => onAddFileWithUrl(item.originalName || item.filename || item.alt || "File", item.url));
              }}
            >
              Pick file from library…
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs text-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                setPasteOpen(true);
                setPasteUrl("");
              }}
            >
              Paste URL…
            </button>
            <div className="border-t border-primary/15" />
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-[0.7rem] text-muted-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                onAddEmptyRow("image");
              }}
            >
              Empty image row
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-[0.7rem] text-muted-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                onAddEmptyRow("video");
              }}
            >
              Empty video row
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-[0.7rem] text-muted-foreground hover:bg-primary/10"
              onClick={() => {
                setMenuOpen(false);
                onAddEmptyRow("file");
              }}
            >
              Empty file row
            </button>
          </div>
        )}

        {pasteOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full max-w-md rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
            <label className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Paste URL
            </label>
            <input
              type="url"
              className="mb-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
              placeholder="https://…"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-primary/20 px-2 py-1 text-xs font-semibold text-foreground hover:bg-primary/30"
                onClick={() => {
                  const u = pasteUrl.trim();
                  if (!u) return;
                  const lower = u.toLowerCase();
                  if (lower.match(/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/) || lower.startsWith("data:image")) {
                    onAddImageWithUrl(u);
                  } else if (lower.match(/\.(mp4|webm|ogg|mov)(\?|$)/) || lower.startsWith("data:video")) {
                    onAddVideoWithUrl(u);
                  } else {
                    onAddFileWithUrl("Linked file", u);
                  }
                  setPasteOpen(false);
                  setPasteUrl("");
                }}
              >
                Add
              </button>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-primary/10"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteUrl("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
