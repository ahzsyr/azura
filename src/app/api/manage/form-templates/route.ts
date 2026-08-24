import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { listFormTemplates } from "@/features/forms/form-template.service";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async () => {
    const templates = await listFormTemplates();
    return NextResponse.json({
      templates: templates.map((t) => ({ id: t.id, name: t.name, category: t.category })),
    });
  },
});
