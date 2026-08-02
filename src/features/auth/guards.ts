import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireCustomer() {
  const session = await requireSession();
  if (session.user.role !== "CUSTOMER") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireRole(role: UserRole) {
  const session = await requireSession();
  if (session.user.role !== role) {
    throw new Error("Forbidden");
  }
  return session;
}
