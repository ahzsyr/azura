import { prisma } from "@/lib/prisma";

export function maskAdminEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export async function getAdminEmailHint(): Promise<{
  email: string | null;
  maskedEmail: string | null;
  dbReady: boolean;
}> {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { email: true },
    });
    if (!admin?.email) {
      return { email: null, maskedEmail: null, dbReady: true };
    }
    return {
      email: admin.email,
      maskedEmail: maskAdminEmail(admin.email),
      dbReady: true,
    };
  } catch (error) {
    console.error("[admin-email-hint] lookup failed:", error);
    return { email: null, maskedEmail: null, dbReady: false };
  }
}
