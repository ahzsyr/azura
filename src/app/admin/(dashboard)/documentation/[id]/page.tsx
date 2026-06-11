import { notFound } from "next/navigation";
import { docPortalService } from "@/features/documentation/service";
import { DocPortalEditPage } from "@/features/documentation/admin/doc-portal-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminDocumentationEditRoute({ params }: Props) {
  const { id } = await params;
  const portal = await docPortalService.getByIdForAdmin(id);
  if (!portal) notFound();
  return <DocPortalEditPage portal={portal} />;
}
