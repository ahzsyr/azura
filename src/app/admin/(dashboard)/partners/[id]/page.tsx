import { notFound } from "next/navigation";
import { partnerProgramService } from "@/features/partners/service";
import { PartnerProgramEditPage } from "@/features/partners/admin/partner-program-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPartnersEditRoute({ params }: Props) {
  const { id } = await params;
  const program = await partnerProgramService.getByIdForAdmin(id);
  if (!program) notFound();
  return <PartnerProgramEditPage program={program} />;
}
