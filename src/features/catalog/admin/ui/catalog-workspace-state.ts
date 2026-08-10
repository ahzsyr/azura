export type CatalogWorkspaceStatus =
  | "idle"
  | "loading"
  | "empty"
  | "error"
  | "filtered_empty"
  | "permission_denied"
  | "saving"
  | "saved"
  | "unsaved";

export type CatalogWorkspaceState = {
  status: CatalogWorkspaceStatus;
  message?: string | null;
};

export function catalogStatusLabel(status: CatalogWorkspaceStatus): string {
  switch (status) {
    case "loading":
      return "Loading…";
    case "empty":
      return "Nothing here yet";
    case "error":
      return "Something went wrong";
    case "filtered_empty":
      return "No results match your filters";
    case "permission_denied":
      return "You don’t have permission to view this";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "unsaved":
      return "Unsaved changes";
    default:
      return "";
  }
}
