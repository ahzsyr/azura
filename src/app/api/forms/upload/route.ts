import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { getFormTemplateById } from "@/features/forms/form-template.service";
import { persistMediaUpload } from "@/features/media/persist-upload";
import { storeUploadedFile } from "@/lib/media-storage";
import { validateFormUploadFile } from "@/lib/local-media-storage";
import { checkFormSubmitRateLimit } from "@/features/forms/platform/handlers/spam-handler";
import { mergeFormDefinitionWithSchema } from "@/features/forms/adapters/schema-document.adapter";
import { getTrustedClientIp } from "@/lib/client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { formUploadKindMatches, sniffFormUploadKind } from "@/lib/security/upload-magic-bytes";
import { PUBLIC_FORM_BODY_MAX_BYTES, classifyContentLength } from "@/lib/security/abuse-controls";
import { RateLimitUnavailableError } from "@/features/forms/platform/handlers/spam-handler";

/** Generic messages: never echo storage errors or file-system details. */
const GENERIC_BAD_REQUEST = "Upload rejected";
const GENERIC_SERVER_ERROR = "Upload failed";

function badRequest(error = GENERIC_BAD_REQUEST) {
  return NextResponse.json({ error }, { status: 400 });
}

export const POST = defineApiRoute({
  access: "public",
  handler: async ({ request }) => {
    const clientIp = getTrustedClientIp(request);
    const size = classifyContentLength(request.headers.get("content-length"), PUBLIC_FORM_BODY_MAX_BYTES);
    if (size !== "ok") {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    try {
      let allowed = false;
      try {
        allowed = await checkFormSubmitRateLimit(`upload:${clientIp}`);
      } catch (error) {
        if (error instanceof RateLimitUnavailableError) {
          return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }
        throw error;
      }
      if (!allowed) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const headerToken = request.headers.get("x-turnstile-token");
      if (headerToken) {
        const headerOk = await verifyTurnstileToken(headerToken, clientIp);
        if (!headerOk) {
          return NextResponse.json({ error: "Captcha failed. Please try again." }, { status: 400 });
        }
      }

      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) return badRequest("No file provided");

      if (!headerToken) {
        const turnstileToken = formData.get("turnstileToken");
        const turnstileOk = await verifyTurnstileToken(
          typeof turnstileToken === "string" ? turnstileToken : null,
          clientIp,
        );
        if (!turnstileOk) {
          return NextResponse.json({ error: "Captcha failed. Please try again." }, { status: 400 });
        }
      }

      const templateId = String(formData.get("templateId") ?? "");
      if (!templateId) return badRequest("templateId required");

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
          return badRequest(`File too large (max ${field.validation.maxFileSizeMb} MB)`);
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
        if (!ok) return badRequest(`File type not allowed (${accept})`);
      }

      // Extension / MIME allowlist (images + PDF only, no SVG/ZIP).
      const validation = validateFormUploadFile(file);
      if ("error" in validation) return badRequest(validation.error);

      const { mediaType } = validation;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Magic bytes must match both the allowed set and the declared type.
      const kind = sniffFormUploadKind(buffer);
      if (!kind || !formUploadKindMatches(kind, { name: file.name, type: file.type })) {
        return badRequest("File content does not match its type");
      }

      const stored = await storeUploadedFile(file, buffer, mediaType);
      const asset = await persistMediaUpload({
        filename: file.name,
        url: stored.url,
        mimeType: file.type || "application/octet-stream",
        mediaType,
        sizeBytes: file.size,
        assetScope: "FORM",
        // Form uploads are PRIVATE. Callers that need a public image must set
        // visibility PUBLIC explicitly on the asset.
        visibility: "PRIVATE",
        storageBackend: stored.storage,
        bucket: stored.bucket,
        objectKey: stored.objectKey,
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
      console.error("[forms/upload]", error instanceof Error ? error.name : "unknown");
      return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
    }
  },
});
