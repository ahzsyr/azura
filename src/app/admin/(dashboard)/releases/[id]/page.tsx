import { notFound } from "next/navigation";
import { releaseSetService } from "@/features/releases/service";
import { ReleaseSetEditPage } from "@/features/releases/admin/release-set-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminReleaseSetEditRoute({ params }: Props) {
  const { id } = await params;
  const releaseSet = await releaseSetService.getByIdForAdmin(id);
  if (!releaseSet) notFound();
  return <ReleaseSetEditPage releaseSet={releaseSet} />;
}
