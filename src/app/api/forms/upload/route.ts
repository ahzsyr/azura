import { NextResponse } from "next/server";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { persistMediaUpload } from "@/features/media/persist-upload";
import { storeUploadedFile } from "@/lib/media-storage";
import { validateUploadFile } from "@/lib/local-media-storage";
import {
  checkFormSubmitRateLimit,
} from "@/features/forms/platform/handlers/spam-handler";
import { mergeFormDefinitionWithSchema } from "@/features/forms/adapters/schema-document.adapter";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (!checkFormSubmitRateLimit(`upload:${clientIp}`)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const templateId = String(formData.get("templateId") ?? "");
    if (!templateId) {
      return NextResponse.json({ error: "templateId required" }, { status: 400 });
    }

    const template = await getFormTemplateById(templateId);
    if (!template?.isPublished) {
      return NextResponse.json({ error: "Form template not found" }, { status: 404 });
    }

    const fieldId = String(formData.get("fieldId") ?? "");
    const { form } = mergeFormDefinitionWithSchema(template.definition);
    const field = fieldId ? form.fields.find((f) => f.id === fieldId) : undefined;

    if (field?.validation?.maxFileSizeMb) {
      const maxBytes = field.validation.maxFileSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `File too large (max ${field.validation.maxFileSizeMb} MB)` },
          { status: 400 },
        );
      }
    }

    if (field?.validation?.accept) {
      const accept = field.validation.accept;
      const name = file.name.toLowerCase();
      const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const ok = tokens.some((token) => {
        if (token.startsWith(".")) return name.endsWith(token);
        if (token.includes("/")) {
          if (token.endsWith("/*")) return file.type.startsWith(token.slice(0, -1));
          return file.type === token;
        }
        return name.endsWith(token);
      });
      if (!ok) {
        return NextResponse.json({ error: `File type not allowed (${accept})` }, { status: 400 });
      }
    }

    const validation = validateUploadFile(file);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { mediaType } = validation;
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeUploadedFile(file, buffer, mediaType);
    const asset = await persistMediaUpload({
      filename: file.name,
      url: stored.url,
      mimeType: file.type || "application/octet-stream",
      mediaType,
      sizeBytes: file.size,
      assetScope: "FORM",
    });

    return NextResponse.json({
      ok: true,
      id: asset.id,
      url: asset.url,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      mediaType,
    });
  } catch (error) {
    console.error("[forms/upload]", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
