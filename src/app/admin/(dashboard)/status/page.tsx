import { statusBoardService } from "@/modules/status-page/service";
import { StatusBoardManager } from "@/modules/status-page/admin/status-board-manager";

export default async function AdminStatusPage() {
  let boards: Awaited<ReturnType<typeof statusBoardService.listForAdmin>> = [];
  try {
    boards = await statusBoardService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <StatusBoardManager boards={boards} />;
}
