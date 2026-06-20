import { statusBoardService } from "@/features/status/service";
import { StatusBoardManager } from "@/features/status/admin/status-board-manager";

export default async function AdminStatusPage() {
  let boards: Awaited<ReturnType<typeof statusBoardService.listForAdmin>> = [];
  try {
    boards = await statusBoardService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <StatusBoardManager boards={boards} />;
}
