import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { docPortalService } from "@/features/documentation/service";
import { loadDocPortalFormDrafts } from "@/features/documentation/admin/doc-portal-form-data";
import { DocPortalEditPage } from "@/features/documentation/admin/doc-portal-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDocumentationEditRoute({ params }: Props) {
  const { id } = await params;
  const portal = await docPortalService.getByIdForAdmin(id);
  if (!portal) notFound();
  const [displayTitle, formDrafts] = await Promise.all([
    loadAdminDisplayTitle("DocPortal", id, "title", portal.slug),
    loadDocPortalFormDrafts(portal),
  ]);
  return <DocPortalEditPage portal={portal} displayTitle={displayTitle} formDrafts={formDrafts} />;
}
