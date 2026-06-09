"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { Coach } from "@/lib/data";
import { MOBILE_FILE_INPUT_CLASS, readImageDataUrl } from "@/lib/file-upload";

export function CoachProfileEditor({ coach }: { coach: Coach }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(coach.name);
  const [avatarSrc, setAvatarSrc] = useState(coach.profile_image_url);
  const [photoBase64, setPhotoBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(coach.name);
    setAvatarSrc(coach.profile_image_url);
    setPhotoBase64("");
  }, [coach.name, coach.profile_image_url]);

  async function onPhotoSelect(file: File | null) {
    if (!file) return;
    try {
      const result = await readImageDataUrl(file);
      setAvatarSrc(result);
      setPhotoBase64(result);
    } catch {
      setError("Could not read photo");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api<{ message: string; coach: Coach | null }>(
        `admin/coaches/${coach.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            ...(photoBase64 ? { profile_photo_base64: photoBase64 } : {}),
          }),
        }
      );
      if (res.coach) {
        setName(res.coach.name);
        setAvatarSrc(res.coach.profile_image_url);
        setPhotoBase64("");
      }
      setMessage("Coach profile saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5"
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#6B93B8]">
        Coach Profile
      </p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-[#6B93B8]/30">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-zinc-500" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={MOBILE_FILE_INPUT_CLASS}
            aria-hidden
            tabIndex={-1}
            onChange={(e) => onPhotoSelect(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 flex w-20 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400 hover:border-zinc-500 hover:text-white"
          >
            <Camera className="h-3.5 w-3.5" />
            Photo
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <FieldLabel>Coach Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="21Coach"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Shown to clients on the Coach chat page.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-[#6B93B8]">{message}</p>}
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Saving…" : "Save Coach Profile"}
          </Button>
        </div>
      </div>
    </form>
  );
}
