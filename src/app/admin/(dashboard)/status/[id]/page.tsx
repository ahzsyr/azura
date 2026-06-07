import { notFound } from "next/navigation";
import { statusBoardService } from "@/features/status/service";
import { StatusBoardEditPage } from "@/features/status/admin/status-board-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminStatusEditRoute({ params }: Props) {
  const { id } = await params;
  const board = await statusBoardService.getByIdForAdmin(id);
  if (!board) notFound();
  return <StatusBoardEditPage board={board} />;
}
