import { partnerProgramService } from "@/presets/partner/service";
import { PartnerProgramManager } from "@/presets/partner/admin/partner-program-manager";

export default async function AdminPartnersPage() {
  let programs: Awaited<ReturnType<typeof partnerProgramService.listForAdmin>> = [];
  try {
    programs = await partnerProgramService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <PartnerProgramManager programs={programs} />;
}
