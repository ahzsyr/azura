import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listFormTemplates } from "@/features/forms/form-template.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await listFormTemplates();
  return NextResponse.json({
    templates: templates.map((t) => ({ id: t.id, name: t.name, category: t.category })),
  });
}
