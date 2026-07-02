import { releaseSetService } from "@/presets/release/service";
import { ReleaseSetManager } from "@/presets/release/admin/release-set-manager";

export default async function AdminReleasesPage() {
  let sets: Awaited<ReturnType<typeof releaseSetService.listForAdmin>> = [];
  try {
    sets = await releaseSetService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <ReleaseSetManager sets={sets} />;
}
