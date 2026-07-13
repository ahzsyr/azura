import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import {
  importContentTypeDocument,
  type ContentTypeImportOptions,
} from "@/features/content/content-type-import-export.service";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      document?: unknown;
      options?: ContentTypeImportOptions;
    } & ContentTypeImportOptions;

    const document = body.document ?? body;
    const options: ContentTypeImportOptions = {
      dryRun: body.options?.dryRun ?? body.dryRun,
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
