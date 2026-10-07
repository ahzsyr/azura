import { uploadMediaFile } from "@/features/media/upload-client";
import { defaultAltFromFilename } from "@/features/media/default-alt";

export async function uploadEditorImage(file: File): Promise<{ url: string; alt: string }> {
  const result = await uploadMediaFile(file, { mediaType: "IMAGE" });
  return { url: result.url, alt: defaultAltFromFilename(result.filename) };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export async function insertImageFiles(
  files: File[],
  insert: (url: string, alt: string) => void
): Promise<void> {
  for (const file of files) {
    if (!isImageFile(file)) continue;
    const { url, alt } = await uploadEditorImage(file);
    insert(url, alt);
  }
}
