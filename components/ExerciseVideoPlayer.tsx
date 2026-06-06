"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { youtubeEmbedUrl } from "@/lib/exercise-video-utils";
import { cn } from "@/lib/utils";

export type ExerciseVideoSource = {
  id: string;
  video_url?: string;
  has_uploaded_file?: boolean;
};

function hasPlayableVideo(video: ExerciseVideoSource): boolean {
  return Boolean(
    video.video_url ||
      video.has_uploaded_file
  );
}

function VideoMedia({
  video,
  title,
  className,
  streamBasePath = "/api/exercise-video",
  autoPlay = false,
  controls = true,
}: {
  video: ExerciseVideoSource;
  title?: string;
  className?: string;
  streamBasePath?: string;
  autoPlay?: boolean;
  controls?: boolean;
}) {
  if (video.video_url) {
    const embed = youtubeEmbedUrl(video.video_url);
    if (embed) {
      const src = autoPlay ? `${embed}?autoplay=1` : embed;
      return (
        <iframe
          src={src}
          title={title ?? "Exercise video"}
          className={className}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      );
    }
    return (
      <video
        src={video.video_url}
        controls={controls}
        autoPlay={autoPlay}
        className={className}
        playsInline
      />
    );
  }

  if (video.has_uploaded_file) {
    return (
      <video
        src={`${streamBasePath}/${video.id}/stream`}
        controls={controls}
        autoPlay={autoPlay}
        className={className}
        playsInline
      />
    );
  }

  return null;
}

export function ExerciseVideoPlayer({
  video,
  title,
  compact = false,
  expandable,
  streamBasePath = "/api/exercise-video",
}: {
  video: ExerciseVideoSource;
  title?: string;
  compact?: boolean;
  expandable?: boolean;
  streamBasePath?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const playable = hasPlayableVideo(video);
  const canExpand = compact && (expandable ?? true) && playable;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!playable) {
    return (
      <div
        className={
          compact
            ? "flex h-28 w-44 items-center justify-center rounded-xl bg-zinc-900 text-xs text-zinc-600"
            : "flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-600"
        }
      >
        No video
      </div>
    );
  }

  const compactClass = "h-28 w-44 rounded-xl bg-black object-contain";
  const fullClass = "aspect-video w-full rounded-xl bg-black object-contain";

  if (!compact) {
    return (
      <VideoMedia
        video={video}
        title={title}
        className={fullClass}
        streamBasePath={streamBasePath}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => canExpand && setExpanded(true)}
        disabled={!canExpand}
        className={cn(
          "group relative block overflow-hidden rounded-xl",
          canExpand && "cursor-pointer ring-offset-2 ring-offset-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        )}
        aria-label={canExpand ? `Open ${title ?? "exercise"} tutorial` : undefined}
      >
        <div className={cn(canExpand && "pointer-events-none")}>
          <VideoMedia
            video={video}
            title={title}
            className={compactClass}
            streamBasePath={streamBasePath}
            controls={false}
          />
        </div>
        {canExpand && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Maximize2 className="h-3.5 w-3.5" />
              Tutorial
            </span>
          </span>
        )}
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} demo video` : "Exercise demo video"}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-bold uppercase tracking-wide text-white">
                {title ?? "Exercise Demo"}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500"
                aria-label="Close video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <VideoMedia
              video={video}
              title={title}
              className="aspect-video w-full rounded-2xl bg-black object-contain"
              streamBasePath={streamBasePath}
              autoPlay
            />
            <p className="mt-3 text-center text-xs text-zinc-500">
              Tap outside or press Esc to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
