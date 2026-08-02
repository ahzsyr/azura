import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireCatalogAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
