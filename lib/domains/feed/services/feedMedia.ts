import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage/localStorage";

/** Número máximo de imagens por post. */
export const MAX_IMAGES_PER_POST = 4;

/** Guarda imagens para um post futuro e regista-as, para o post poder referenciar os URLs. */
export async function saveFeedImages(eventId: string, userId: string, files: File[]) {
  const uploads = await Promise.all(files.map((file) => saveUpload(file, ["feed", eventId])));
  await prisma.hubPostMedia.createMany({
    data: uploads.map((upload) => ({
      url: upload.url,
      originalFileName: upload.fileName,
      fileSizeBytes: BigInt(upload.fileSize),
      uploadedByUserId: userId,
      contentType: upload.contentType,
      uploadedAtUtc: new Date(),
    })),
  });
  return uploads.map(({ url, fileName, fileSize }) => ({ url, fileName, fileSize }));
}
