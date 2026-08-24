export type GalleryColumnCount = 2 | 3 | 4;

export function normalizeGalleryColumns(raw: unknown): GalleryColumnCount {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 2 || n === 3 || n === 4) return n;
  return 3;
}

/** CSS multi-column classes for masonry gallery layouts. */
export function masonryColumnClass(columns: GalleryColumnCount): string {
  switch (columns) {
    case 2:
      return "columns-2";
    case 4:
      return "columns-2 lg:columns-4";
    default:
      return "columns-2 lg:columns-3";
  }
}

/** Tailwind grid column classes for uniform gallery grids. */
export function galleryGridColumnClass(columns: GalleryColumnCount): string {
  switch (columns) {
    case 2:
      return "grid-cols-2";
    case 4:
      return "grid-cols-2 lg:grid-cols-4";
    default:
      return "grid-cols-2 lg:grid-cols-3";
  }
}

export function galleryImageSizes(columns: GalleryColumnCount): string {
  switch (columns) {
    case 2:
      return "(max-width: 1024px) 50vw, 50vw";
    case 4:
      return "(max-width: 1024px) 50vw, 25vw";
    default:
      return "(max-width: 1024px) 50vw, 33vw";
  }
}
