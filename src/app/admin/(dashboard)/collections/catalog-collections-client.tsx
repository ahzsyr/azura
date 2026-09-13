"use client";

import AdminCollectionsPanel from "@/features/catalog/admin/collections/AdminCollectionsPanel";
import type { CollectionsAdminInitialProps } from "@/features/catalog/admin/load-collections-admin-props";

export function CatalogCollectionsClient(props: CollectionsAdminInitialProps) {
  return <AdminCollectionsPanel {...props} />;
}
