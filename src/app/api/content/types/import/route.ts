import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import {
  importContentTypeDocument,
  importContentTypeSchema,
  type ContentTypeImportOptions,
} from "@/features/content/content-type-import-export.service";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      document?: unknown;
      options?: ContentTypeImportOptions & { targetTypeId?: string; mode?: "full" | "schema" };
    } & ContentTypeImportOptions;

    const document = body.document ?? body;
    const mode = body.options?.mode ?? body.mode ?? "full";
    const targetTypeId = body.options?.targetTypeId ?? body.targetTypeId;
    const dryRun = body.options?.dryRun ?? body.dryRun;

    if (mode === "schema") {
      if (!targetTypeId) {
        return NextResponse.json(
          { error: "targetTypeId is required for schema import" },
          { status: 400 },
        );
      }
      const result = await importContentTypeSchema(document, {
        targetTypeId,
        dryRun,
      });
      return NextResponse.json(result);
    }

    const options: ContentTypeImportOptions = {
      dryRun,
      duplicatePolicy: body.options?.duplicatePolicy ?? body.duplicatePolicy ?? "overwrite",
    };

    const result = await importContentTypeDocument(document, options);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 },
    );
  }
}
