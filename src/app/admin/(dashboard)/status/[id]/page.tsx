import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { statusBoardService } from "@/modules/status-page/service";
import { loadStatusBoardFormDrafts } from "@/modules/status-page/admin/status-board-form-data";
import { StatusBoardEditPage } from "@/modules/status-page/admin/status-board-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminStatusEditRoute({ params }: Props) {
  const { id } = await params;
  const board = await statusBoardService.getByIdForAdmin(id);
  if (!board) notFound();
  const [displayTitle, formDrafts] = await Promise.all([
    loadAdminDisplayTitle("StatusBoard", id, "title", board.slug),
    loadStatusBoardFormDrafts(board),
  ]);
  return <StatusBoardEditPage board={board} displayTitle={displayTitle} formDrafts={formDrafts} />;
}
