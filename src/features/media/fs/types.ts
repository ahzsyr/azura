export type MediaType = "image" | "video" | "document" | "audio" | "svg" | "zip" | "other";

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  type: MediaType;
  ext: string;
  size: number;
  uploadedAt: string;
  title?: string;
  alt?: string;
  description?: string;
  tags?: string[];
  usedIn?: MediaUsage[];
}

export interface MediaUsage {
  type: "product" | "collection" | "page" | "settings" | "block";
  id: string;
  label?: string;
  field?: string;
  url?: string;
}

export interface MediaLibraryMeta {
  [filename: string]: {
    id: string;
    originalName: string;
    uploadedAt: string;
    title?: string;
    alt?: string;
    description?: string;
    tags?: string[];
    /** Remote-only entries (Supabase) not present on local disk scan */
    url?: string;
    size?: number;
    ext?: string;
    type?: MediaType;
  };
}

export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type MediaSortField = "date" | "name" | "size" | "type";
export type MediaSortDir = "asc" | "desc";

export interface MediaFilters {
  type?: MediaType | "all";
  search?: string;
  sort?: MediaSortField;
  dir?: MediaSortDir;
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  onSelectMultiple?: (items: MediaItem[]) => void;
  accept?: MediaType[];
  title?: string;
  multi?: boolean;
}

export interface BulkActionPayload {
  action: "delete";
  filenames: string[];
}

export interface UploadResult {
  item: MediaItem;
}

export interface ReplaceResult {
  newUrl: string;
  oldUrl: string;
  newFilename: string;
  updatedProducts: number;
  updatedPages: number;
}

export interface RelationshipsResult {
  filename: string;
  usages: MediaUsage[];
}
