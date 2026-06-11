import { partnerProgramService } from "@/features/partners/service";
import { PartnerProgramManager } from "@/features/partners/admin/partner-program-manager";

export default async function AdminPartnersPage() {
  let programs: Awaited<ReturnType<typeof partnerProgramService.listForAdmin>> = [];
  try {
    programs = await partnerProgramService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <PartnerProgramManager programs={programs} />;
}
