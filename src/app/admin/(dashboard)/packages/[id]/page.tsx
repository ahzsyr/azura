import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPackageEditRedirect({ params }: Props) {
  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const item = await prisma.contentItem.findFirst({ where: { id }, include: { contentType: true } });
  if (item) redirect(`/admin/content/${item.contentType.slug}/${item.id}`);
  redirect("/admin/content/catalog-items");
}
