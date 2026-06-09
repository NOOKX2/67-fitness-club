import { Readable } from "stream";
import { Db, GridFSBucket } from "mongodb";
import { MAX_FORM_CHECK_VIDEO_BYTES, MAX_FORM_CHECK_VIDEO_MB } from "./form-check-constants";

const BUCKET_NAME = "form_check_video_files";

function parseBase64DataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid video data");
  const meta = dataUrl.slice(0, comma);
  const contentTypeMatch = meta.match(/^data:([^;]+)/);
  if (!contentTypeMatch) throw new Error("Invalid video data");
  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
  return { buffer, contentType: contentTypeMatch[1] };
}

export async function deleteFormCheckVideoFromGridFS(
  db: Db,
  fileId: string
): Promise<void> {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const files = await bucket.find({ filename: fileId }).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id)));
}

export async function saveFormCheckVideoToGridFS(
  db: Db,
  fileId: string,
  dataUrl: string
): Promise<{ contentType: string; size: number }> {
  const { buffer, contentType } = parseBase64DataUrl(dataUrl);
  if (buffer.length > MAX_FORM_CHECK_VIDEO_BYTES) {
    throw new Error(`Video must be under ${MAX_FORM_CHECK_VIDEO_MB}MB`);
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

export async function getFormCheckVideoFileMeta(
  db: Db,
  fileId: string
): Promise<{ contentType: string; size: number } | null> {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const files = await bucket.find({ filename: fileId }).limit(1).toArray();
  if (!files.length) return null;
  return {
    contentType:
      (files[0].metadata as { contentType?: string } | undefined)?.contentType ??
      "video/mp4",
    size: files[0].length,
  };
}

export async function openFormCheckVideoStream(
  db: Db,
  fileId: string,
  range?: { start: number; end: number },
  contentType = "video/mp4"
): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
  const bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  const streamOptions =
    range != null ? { start: range.start, end: range.end + 1 } : undefined;
  try {
    return {
      stream: bucket.openDownloadStreamByName(fileId, streamOptions),
      contentType,
    };
  } catch {
    return null;
  }
}

export function streamFromBase64DataUrl(
  dataUrl: string
): { body: Buffer; contentType: string } | null {
  try {
    const { buffer, contentType } = parseBase64DataUrl(dataUrl);
    return { body: buffer, contentType };
  } catch {
    return null;
  }
}
