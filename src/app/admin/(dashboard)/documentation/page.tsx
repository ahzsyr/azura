import { docPortalService } from "@/features/documentation/service";
import { DocPortalManager } from "@/features/documentation/admin/doc-portal-manager";

export default async function AdminDocumentationPage() {
  let portals: Awaited<ReturnType<typeof docPortalService.listForAdmin>> = [];
  try {
    portals = await docPortalService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <DocPortalManager portals={portals} />;
}
