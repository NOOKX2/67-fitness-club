import { Readable } from "stream";
import { Db, GridFSBucket } from "mongodb";

const BUCKET_NAME = "profile_photo_files";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid photo data");
  const meta = dataUrl.slice(0, comma);
  const contentTypeMatch = meta.match(/^data:([^;]+)/);
  if (!contentTypeMatch) throw new Error("Invalid photo data");
  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
  return { buffer, contentType: contentTypeMatch[1] };
}

export function profilePhotoStreamPath(photoId: string): string {
  return `/api/profile-photo/${photoId}/stream`;
}

export async function saveProfilePhotoToGridFS(
  db: Db,
  fileId: string,
  dataUrl: string
): Promise<{ contentType: string; size: number }> {
  const { buffer, contentType } = parseBase64DataUrl(dataUrl);
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be under 4MB");
  }

  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(fileId, {
      metadata: { contentType },
    });
    uploadStream.on("finish", () => resolve({ contentType, size: buffer.length }));
    uploadStream.on("error", reject);
    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function deleteProfilePhotoFromGridFS(db: Db, fileId: string): Promise<void> {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const files = await bucket.find({ filename: fileId }).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id)));
}

export async function openProfilePhotoStream(
  db: Db,
  fileId: string
): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const files = await bucket.find({ filename: fileId }).limit(1).toArray();
  if (!files.length) return null;
  return {
    stream: bucket.openDownloadStreamByName(fileId),
    contentType:
      (files[0].metadata as { contentType?: string } | undefined)?.contentType ??
      "image/jpeg",
  };
}
