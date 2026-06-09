"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { ExerciseVideoPlayer } from "@/components/ExerciseVideoPlayer";
import { api } from "@/lib/api-client";
import type { ExerciseVideo } from "@/lib/data";
import { FilePicker } from "@/components/FilePicker";
import { MAX_VIDEO_MB } from "@/lib/exercise-video-constants";
import { readFileAsDataUrl } from "@/lib/file-upload";

export function ExerciseVideoLibrary({ videos }: { videos: ExerciseVideo[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [videoFile, setVideoFile] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function onVideoSelect(file: File) {
    setError("");
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video must be under ${MAX_VIDEO_MB}MB`);
      return;
    }
    setFileName(file.name);
    try {
      setVideoFile(await readFileAsDataUrl(file));
    } catch {
      setError("Could not read video file");
      setFileName("");
      setVideoFile("");
    }
  }

  async function uploadVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!videoFile) {
      setError("Please choose a video file");
      return;
    }
    setError("");
    setAdding(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api("admin/exercise-videos", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          video_base64: videoFile,
          tags: tagList,
        }),
      });
      setName("");
      setTags("");
      setVideoFile("");
      setFileName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-white">
          <Video className="h-6 w-6 text-[#6B93B8]" />
          Exercise Video Library
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage demo videos for program exercises
        </p>
      </div>

      <section className="border border-zinc-800 p-6">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-white">
          Upload New Demo
        </h2>
        <form onSubmit={uploadVideo} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Exercise Title</FieldLabel>
              <Input
                placeholder="e.g., Barbell Squat Demo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>Tags (comma-separated)</FieldLabel>
              <Input
                placeholder="Legs, Push, Cardio"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <FieldLabel>Video File</FieldLabel>
              <FilePicker
                accept="video/*"
                disabled={adding}
                onFile={onVideoSelect}
                className="flex h-12 w-full items-center justify-center gap-2 border border-zinc-700 bg-black text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {fileName || "Choose Video File"}
              </FilePicker>
            </div>
            <Button
              type="submit"
              className="h-12 gap-2 bg-[#6B93B8] px-8 text-white hover:bg-[#5a82a7]"
              disabled={adding || !videoFile}
            >
              <Upload className="h-4 w-4" />
              {adding ? "Uploading…" : "Upload"}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </section>

      {videos.length === 0 ? (
        <p className="border border-zinc-800 p-12 text-center text-sm text-zinc-500">
          No exercise videos yet. Upload your first demo above.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((v) => (
            <article
              key={v.id}
              className="overflow-hidden border border-zinc-800 bg-zinc-950"
            >
              <ExerciseVideoPlayer
                video={{
                  id: v.id,
                  video_url: v.video_url,
                  has_uploaded_file: Boolean(v.video_file_id || v.video_base64),
                }}
                title={v.name}
                streamBasePath="/api/admin/exercise-videos"
              />
              <div className="p-4">
                <p className="font-bold uppercase tracking-wide text-white">
                  {v.name}
                </p>
                {v.tags && v.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B93B8]"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
