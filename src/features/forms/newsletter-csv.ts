/** Client-safe CSV export (no Prisma / email imports). */

export function subscribersToCsv(
  rows: Array<{ email: string; name: string | null; segment: string; status: string; createdAt: Date }>,
): string {
  const header = "email,name,segment,status,createdAt";
  const lines = rows.map(
    (r) =>
      `"${r.email}","${(r.name ?? "").replace(/"/g, '""')}","${r.segment}","${r.status}","${r.createdAt.toISOString()}"`,
  );
  return [header, ...lines].join("\n");
}
