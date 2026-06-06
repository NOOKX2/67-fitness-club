"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Scale, TrendingUp } from "lucide-react";
import { WeightProgressChart } from "@/components/WeightProgressChart";
import { useMuscleReward } from "@/components/MuscleStreakContext";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import type { ProgressPhoto, WeightEntry } from "@/lib/data";

function formatPhotoDate(date?: string) {
  if (!date) return "—";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function photoSelectLabel(photo: ProgressPhoto) {
  const date = formatPhotoDate(photo.date);
  const weight = photo.weight != null ? `${photo.weight} kg` : "Weight —";
  return `${date} · ${weight}`;
}

function ComparePhotoColumn({
  photos,
  selectedId,
  onSelect,
  label,
}: {
  photos: ProgressPhoto[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const photo = photos.find((p) => p.id === selectedId);
  if (!photo) return null;

  const src = photo.photo_base64 ?? photo.photo_url ?? "";

  return (
    <div className="space-y-3">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white"
      >
        {photos.map((p) => (
          <option key={p.id} value={p.id}>
            {photoSelectLabel(p)}
          </option>
        ))}
      </select>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="aspect-square w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-900 text-sm text-zinc-600">
          No photo
        </div>
      )}
      <div className="text-sm">
        <p className="text-white">{formatPhotoDate(photo.date)}</p>
        <p className="mt-1 text-zinc-400">
          {photo.weight != null ? `${photo.weight} kg` : "Weight not recorded"}
        </p>
        {photo.notes ? (
          <p className="mt-1 text-xs text-zinc-500">{photo.notes}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressClient({
  userId,
  initialHistory,
  initialPhotos,
  initialHeight,
}: {
  userId: string;
  initialHistory: WeightEntry[];
  initialPhotos: ProgressPhoto[];
  initialHeight: number | null;
}) {
  const router = useRouter();
  const { celebrateMuscleTask } = useMuscleReward();
  const last = initialHistory[initialHistory.length - 1];
  const [weight, setWeight] = useState(last ? String(last.weight) : "85");
  const [height, setHeight] = useState(
    initialHeight != null
      ? String(initialHeight)
      : last?.height
        ? String(last.height)
        : "180"
  );
  const [photoWeight, setPhotoWeight] = useState(last ? String(last.weight) : "85");
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState(initialHistory);
  const [photos, setPhotos] = useState(initialPhotos);
  const [beforePhotoId, setBeforePhotoId] = useState("");
  const [afterPhotoId, setAfterPhotoId] = useState("");

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    if (!photos.length) {
      setBeforePhotoId("");
      setAfterPhotoId("");
      return;
    }
    setBeforePhotoId((current) =>
      photos.some((p) => p.id === current) ? current : photos[0].id
    );
    setAfterPhotoId((current) =>
      photos.some((p) => p.id === current) ? current : photos[photos.length - 1].id
    );
  }, [photos]);

  async function logWeight() {
    setMessage("");
    setError("");
    try {
      const entry = await api<WeightEntry & { id?: string }>("weight-tracking", {
        method: "POST",
        body: JSON.stringify({
          weight: Number(weight),
          height: height ? Number(height) : undefined,
        }),
      });
      setHistory((prev) => [
        ...prev,
        {
          weight: Number(entry.weight),
          height: entry.height,
          date: entry.date ?? new Date().toISOString(),
        },
      ]);
      setMessage("Weight saved");
      celebrateMuscleTask("weight");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function onPhotoSelect(f: File | null) {
    if (!f) return;
    setUploadingPhoto(true);
    setPhotoMessage("");
    setPhotoError("");
    try {
      const dataUrl = await readPhotoDataUrl(f);
      setPhotoPreview(dataUrl);
      await submitPhoto(dataUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submitPhoto(dataUrl: string) {
    const doc = await api<ProgressPhoto & { photo_url?: string }>("progress/photo", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        photo_base64: dataUrl,
        weight: photoWeight ? Number(photoWeight) : undefined,
        notes,
      }),
    });
    setPhotos((prev) => [
      ...prev,
      {
        id: doc.id,
        photo_base64: dataUrl,
        weight: doc.weight,
        notes: doc.notes,
        date: doc.date ?? new Date().toISOString(),
      },
    ]);
    setAfterPhotoId(doc.id);
    if (photos.length === 0) setBeforePhotoId(doc.id);
    setPhotoMessage("Photo saved");
    setPhotoPreview("");
    setNotes("");
    router.refresh();
  }

  function openPhotoPicker() {
    fileInputRef.current?.click();
  }

  const hasPhotos = photos.length > 0;
  const hasWeightHistory = history.length > 0;

  const currentWeight = Number(weight) || 0;
  const currentHeight = Number(height) || 0;
  const startWeight = history[0]?.weight ?? currentWeight;
  const changeKg = currentWeight - startWeight;
  const changePercent =
    startWeight > 0 ? (changeKg / startWeight) * 100 : 0;
  const bmi =
    currentWeight > 0 && currentHeight > 0
      ? currentWeight / Math.pow(currentHeight / 100, 2)
      : null;

  let avgPerTime: number | null = null;
  if (history.length >= 2) {
    let totalDelta = 0;
    for (let i = 1; i < history.length; i++) {
      totalDelta += Number(history[i].weight) - Number(history[i - 1].weight);
    }
    avgPerTime = totalDelta / (history.length - 1);
  }

  const changeColor =
    changeKg < 0
      ? "text-[#a3e635]"
      : changeKg > 0
        ? "text-amber-400"
        : "text-white";

  function formatSigned(value: number, suffix: string) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}${suffix}`;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
        Progress Tracker
      </h1>

      {message && <p className="text-sm text-[#a3e635]">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="rounded-2xl border border-zinc-800 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-white">
          Weight Tracker
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Today&apos;s Weight (kg)</FieldLabel>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Height (cm)</FieldLabel>
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-5 h-12 w-full text-sm"
          onClick={logWeight}
        >
          Log Weight
        </Button>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Change
            </p>
            <p className={`mt-1 text-2xl font-bold ${changeColor}`}>
              {hasWeightHistory ? formatSigned(changePercent, "%") : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Change in Kg
            </p>
            <p className={`mt-1 text-2xl font-bold ${changeColor}`}>
              {hasWeightHistory ? formatSigned(changeKg, " kg") : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Current BMI
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {bmi != null ? bmi.toFixed(1) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Avg / Time
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                avgPerTime == null
                  ? "text-white"
                  : avgPerTime < 0
                    ? "text-[#a3e635]"
                    : avgPerTime > 0
                      ? "text-amber-400"
                      : "text-white"
              }`}
            >
              {avgPerTime != null ? (
                <>
                  {formatSigned(avgPerTime, "")}
                  <span className="ml-1 text-sm font-normal text-zinc-500">
                    kg
                  </span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {!hasWeightHistory ? (
          <div className="mt-10 flex flex-col items-center py-12 text-zinc-500">
            <Scale className="mb-4 h-12 w-12 stroke-1" />
            <p className="text-sm">
              Start tracking your weight to see progress
            </p>
          </div>
        ) : (
          <WeightProgressChart history={history} />
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-white">
          Upload Progress Photo
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Current Weight (kg)</FieldLabel>
            <Input
              type="number"
              value={photoWeight}
              onChange={(e) => setPhotoWeight(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Feeling strong today!"
            />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPhotoSelect(e.target.files?.[0] ?? null)}
        />
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Selected progress photo"
            className="mt-4 aspect-square w-full max-w-xs rounded-xl object-cover"
          />
        ) : null}
        {photoError && <p className="mt-4 text-sm text-red-400">{photoError}</p>}
        {photoMessage && (
          <p className="mt-4 text-sm text-[#a3e635]">{photoMessage}</p>
        )}
        <Button
          type="button"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 text-sm"
          onClick={openPhotoPicker}
          disabled={uploadingPhoto}
        >
          <Camera className="h-4 w-4" />
          {uploadingPhoto ? "Uploading…" : "Take/Upload Photo"}
        </Button>
      </section>

      <section className="rounded-2xl border border-zinc-800 p-6">
        <h2 className="text-lg font-bold uppercase tracking-wide text-white">
          Before &amp; After
        </h2>
        {!hasPhotos ? (
          <div className="mt-6 flex flex-col items-center py-12 text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-zinc-600" />
            <p className="font-medium text-white">
              Start tracking your transformation
            </p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Upload a progress photo to see your first and latest comparison
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ComparePhotoColumn
              photos={photos}
              selectedId={beforePhotoId}
              onSelect={setBeforePhotoId}
              label="Before"
            />
            <ComparePhotoColumn
              photos={photos}
              selectedId={afterPhotoId}
              onSelect={setAfterPhotoId}
              label="After"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function readPhotoDataUrl(file: File): Promise<string> {
  return compressProgressPhoto(file).catch(() => readFileAsDataUrl(file));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function compressProgressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSize = 960;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
