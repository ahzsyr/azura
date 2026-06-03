import { createUploadthing, type FileRouter } from "uploadthing/next";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createMediaFromUpload } from "@/features/media/actions";
import { mediaTypeFromMime } from "@/features/media/media.service";

const f = createUploadthing();

const uploadInput = z.object({
  folderId: z.string().optional(),
});

async function persistUpload(
  file: { name: string; url: string; size: number; type: string },
  userId: string,
  folderId?: string | null
) {
  const result = await createMediaFromUpload({
    filename: file.name,
    url: file.url,
    mimeType: file.type,
    mediaType: mediaTypeFromMime(file.type),
    sizeBytes: file.size,
    folderId,
    uploadedById: userId,
  });
  return result;
}

export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
  })
    .input(uploadInput)
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id, folderId: input.folderId ?? null };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const url = file.ufsUrl ?? file.url;
      const saved = await persistUpload(
        { name: file.name, url, size: file.size, type: file.type || "image/jpeg" },
        metadata.userId,
        metadata.folderId
      );
      return { url, mediaId: saved.id };
    }),

  videoUploader: f({
    video: { maxFileSize: "64MB", maxFileCount: 5 },
  })
    .input(uploadInput)
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id, folderId: input.folderId ?? null };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const url = file.ufsUrl ?? file.url;
      const saved = await persistUpload(
        { name: file.name, url, size: file.size, type: file.type || "video/mp4" },
        metadata.userId,
        metadata.folderId
      );
      return { url, mediaId: saved.id };
    }),

  documentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    text: { maxFileSize: "4MB", maxFileCount: 10 },
  })
    .input(uploadInput)
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id, folderId: input.folderId ?? null };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const url = file.ufsUrl ?? file.url;
      const saved = await persistUpload(
        { name: file.name, url, size: file.size, type: file.type || "application/pdf" },
        metadata.userId,
        metadata.folderId
      );
      return { url, mediaId: saved.id };
    }),

  svgUploader: f({
    "image/svg+xml": { maxFileSize: "2MB", maxFileCount: 10 },
  })
    .input(uploadInput)
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id, folderId: input.folderId ?? null };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const url = file.ufsUrl ?? file.url;
      const saved = await persistUpload(
        { name: file.name, url, size: file.size, type: "image/svg+xml" },
        metadata.userId,
        metadata.folderId
      );
      return { url, mediaId: saved.id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
