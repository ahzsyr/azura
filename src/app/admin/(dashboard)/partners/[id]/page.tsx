import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { partnerProgramService } from "@/presets/partner/service";
import { PartnerProgramEditPage } from "@/presets/partner/admin/partner-program-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPartnersEditRoute({ params }: Props) {
  const { id } = await params;
  const program = await partnerProgramService.getByIdForAdmin(id);
  if (!program) notFound();
  const displayTitle = await loadAdminDisplayTitle("PartnerProgram", id, "title", program.slug);
  return <PartnerProgramEditPage program={program} displayTitle={displayTitle} />;
}
