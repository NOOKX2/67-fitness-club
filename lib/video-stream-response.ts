import { Readable } from "stream";
import { Db } from "mongodb";
import { NextRequest } from "next/server";
import {
  getExerciseVideoFileMeta,
  openExerciseVideoStream,
  streamFromBase64DataUrl as exerciseStreamFromBase64,
} from "./exercise-video-storage";
import {
  getFormCheckVideoFileMeta,
  openFormCheckVideoStream,
  streamFromBase64DataUrl as formCheckStreamFromBase64,
} from "./form-check-video-storage";

type VideoStorage = {
  getFileMeta: (
    db: Db,
    fileId: string
  ) => Promise<{ contentType: string; size: number } | null>;
  openStream: (
    db: Db,
    fileId: string,
    range?: { start: number; end: number },
    contentType?: string
  ) => Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null>;
  streamFromBase64: (dataUrl: string) => { body: Buffer; contentType: string } | null;
};

export function parseByteRange(
  rangeHeader: string,
  size: number
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return null;
  }
  end = Math.min(end, size - 1);
  return { start, end };
}

function videoStreamHeaders(
  contentType: string,
  size: number,
  range?: { start: number; end: number }
): HeadersInit {
  if (range) {
    return {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      "Content-Length": String(range.end - range.start + 1),
      "Cache-Control": "private, no-cache",
    };
  }
  return {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Content-Length": String(size),
    "Cache-Control": "private, no-cache",
  };
}

async function respondGridFsVideoStream(
  req: NextRequest,
  db: Db,
  storage: VideoStorage,
  fileId: string,
  fallbackBase64?: string | null
): Promise<Response | null> {
  const rangeHeader = req.headers.get("range");
  const fileMeta = await storage.getFileMeta(db, fileId);

  if (fileMeta) {
    const range =
      rangeHeader != null ? parseByteRange(rangeHeader, fileMeta.size) : null;
    const gridStream = await storage.openStream(
      db,
      fileId,
      range ?? undefined,
      fileMeta.contentType
    );
    if (!gridStream) return null;

    return new Response(
      Readable.toWeb(gridStream.stream as Readable) as ReadableStream,
      {
        status: range != null ? 206 : 200,
        headers: videoStreamHeaders(
          fileMeta.contentType,
          fileMeta.size,
          range ?? undefined
        ),
      }
    );
  }

  if (typeof fallbackBase64 === "string" && fallbackBase64) {
    const inline = storage.streamFromBase64(fallbackBase64);
    if (inline) {
      const size = inline.body.length;
      const range =
        rangeHeader != null ? parseByteRange(rangeHeader, size) : null;
      const body =
        range != null
          ? inline.body.subarray(range.start, range.end + 1)
          : inline.body;
      return new Response(new Uint8Array(body), {
        status: range != null ? 206 : 200,
        headers: videoStreamHeaders(
          inline.contentType,
          size,
          range ?? undefined
        ),
      });
    }
  }

  return null;
}

export async function respondExerciseVideoStream(
  req: NextRequest,
  db: Db,
  fileId: string,
  fallbackBase64?: string | null
): Promise<Response | null> {
  return respondGridFsVideoStream(
    req,
    db,
    {
      getFileMeta: getExerciseVideoFileMeta,
      openStream: openExerciseVideoStream,
      streamFromBase64: exerciseStreamFromBase64,
    },
    fileId,
    fallbackBase64
  );
}

export async function respondFormCheckVideoStream(
  req: NextRequest,
  db: Db,
  fileId: string,
  fallbackBase64?: string | null
): Promise<Response | null> {
  return respondGridFsVideoStream(
    req,
    db,
    {
      getFileMeta: getFormCheckVideoFileMeta,
      openStream: openFormCheckVideoStream,
      streamFromBase64: formCheckStreamFromBase64,
    },
    fileId,
    fallbackBase64
  );
}
