"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Scale, TrendingUp } from "lucide-react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { StepperInput } from "@/components/StepperInput";
import { WeightProgressChart } from "@/components/WeightProgressChart";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import { clientCard, clientCardInner, clientSaveButtonClass, clientSectionLabel, clientField } from "@/lib/client-ui";
import type { ProgressJourneyStats, ProgressPhoto, WeightEntry } from "@/lib/data";
import { MOBILE_FILE_INPUT_CLASS, readImageDataUrl } from "@/lib/file-upload";
import { cn } from "@/lib/utils";

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
  const { t } = useLanguage();
  const photo = photos.find((p) => p.id === selectedId);
  if (!photo) return null;

  const src = photo.photo_base64 ?? photo.photo_url ?? "";

  return (
    <div className="min-w-0 space-y-2 sm:space-y-3">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className={cn(
          "w-full min-w-0 px-1.5 py-2 text-[10px] text-white focus:outline-none sm:px-3 sm:py-2.5 sm:text-sm",
          clientField
        )}
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
          className="aspect-square w-full rounded-lg object-cover sm:rounded-xl"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-zinc-900 text-[10px] text-zinc-600 sm:rounded-xl sm:text-sm">
          {t("progress.noPhoto")}
        </div>
      )}
      <div className="text-[11px] sm:text-sm">
        <p className="text-white">{formatPhotoDate(photo.date)}</p>
        <p className="mt-0.5 text-zinc-400 sm:mt-1">
          {photo.weight != null
            ? `${photo.weight} ${t("common.kg")}`
            : t("progress.weightNotRecorded")}
        </p>
        {photo.notes ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500 sm:mt-1 sm:text-xs">
            {photo.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function JourneyStatCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn(clientCardInner, "px-4 py-4")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-bold sm:text-2xl", valueClassName ?? "text-white")}>
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-white/35">{hint}</p>
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
  const { t } = useLanguage();
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
  const [journeyStats, setJourneyStats] = useState<ProgressJourneyStats | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

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

  useEffect(() => {
    const before = photos.find((photo) => photo.id === beforePhotoId);
    const after = photos.find((photo) => photo.id === afterPhotoId);
    if (!before?.date || !after?.date) {
      setJourneyStats(null);
      return;
    }

    const start = before.date.slice(0, 10);
    const end = after.date.slice(0, 10);
    let cancelled = false;
    setJourneyLoading(true);

    void api<ProgressJourneyStats>(
      `progress/journey?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    )
      .then((stats) => {
        if (!cancelled) setJourneyStats(stats);
      })
      .catch(() => {
        if (!cancelled) setJourneyStats(null);
      })
      .finally(() => {
        if (!cancelled) setJourneyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [beforePhotoId, afterPhotoId, photos]);

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
      setMessage(t("progress.weightSaved"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveFailed"));
    }
  }

  async function onPhotoSelect(f: File | null) {
    if (!f) return;
    setUploadingPhoto(true);
    setPhotoMessage("");
    setPhotoError("");
    try {
      const dataUrl = await readImageDataUrl(f);
      setPhotoPreview(dataUrl);
      await submitPhoto(dataUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : t("common.uploadFailed"));
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
    setPhotoMessage(t("progress.photoSaved"));
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

  function signedChangeColor(value: number | null | undefined) {
    if (value == null || value === 0) return "text-[#A8C5DC]";
    return value < 0 ? "text-red-400" : "text-emerald-400";
  }

  function formatSigned(value: number, suffix: string) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}${suffix}`;
  }

  return (
    <div className="space-y-8">
      <ClientPageHeader eyebrow={t("progress.eyebrow")} title={t("progress.title")} />

      {message && <p className="text-sm text-[#6B93B8]">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className={cn(clientCard, "p-6")}>
        <p className={clientSectionLabel}>{t("progress.weightTracker")}</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t("progress.currentWeight")}</FieldLabel>
            <StepperInput value={weight} onChange={setWeight} step={0.5} />
          </div>
          <div>
            <FieldLabel>{t("progress.heightCm")}</FieldLabel>
            <StepperInput
              value={height}
              onChange={setHeight}
              step={1}
              inputMode="numeric"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="save"
          className={cn("mt-5", clientSaveButtonClass)}
          onClick={logWeight}
        >
          {t("progress.logWeight")}
        </Button>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={cn(clientCardInner, "px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {t("progress.totalChange")}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                hasWeightHistory ? signedChangeColor(changePercent) : "text-white"
              )}
            >
              {hasWeightHistory ? formatSigned(changePercent, "%") : "—"}
            </p>
          </div>
          <div className={cn(clientCardInner, "px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {t("progress.changeKg")}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                hasWeightHistory ? signedChangeColor(changeKg) : "text-white"
              )}
            >
              {hasWeightHistory ? formatSigned(changeKg, " kg") : "—"}
            </p>
          </div>
          <div className={cn(clientCardInner, "px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {t("progress.currentBmi")}
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {bmi != null ? bmi.toFixed(1) : "—"}
            </p>
          </div>
          <div className={cn(clientCardInner, "px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
              {t("progress.volTime")}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                avgPerTime == null ? "text-white" : signedChangeColor(avgPerTime)
              )}
            >
              {avgPerTime != null ? (
                <>
                  {formatSigned(avgPerTime, "")}
                  <span className="ml-1 text-sm font-normal text-white/45">kg</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {!hasWeightHistory ? (
          <div className="mt-10 flex flex-col items-center py-12 text-white/45">
            <Scale className="mb-4 h-12 w-12 stroke-1" />
            <p className="text-sm">{t("progress.startWeightTracking")}</p>
          </div>
        ) : (
          <div className="mt-8">
            <p className={clientSectionLabel}>{t("progress.weightProgress")}</p>
            <WeightProgressChart history={history} />
          </div>
        )}
      </section>

      <section className={cn(clientCard, "p-6")}>
        <p className={clientSectionLabel}>{t("progress.uploadPhoto")}</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t("progress.currentWeightShort")}</FieldLabel>
            <StepperInput value={photoWeight} onChange={setPhotoWeight} step={0.5} />
          </div>
          <div>
            <FieldLabel>{t("progress.notes")}</FieldLabel>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("progress.notesPlaceholder")}
            />
          </div>
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
          <p className="mt-4 text-sm text-[#6B93B8]">{photoMessage}</p>
        )}
        <Button
          type="button"
          variant="save"
          className={cn("mt-5 flex h-12 w-full items-center justify-center gap-2 text-sm")}
          onClick={openPhotoPicker}
          disabled={uploadingPhoto}
        >
          <Camera className="h-4 w-4" />
          {uploadingPhoto ? t("progress.uploading") : t("progress.takeUploadPhoto")}
        </Button>
      </section>

      <section className={cn(clientCard, "p-6")}>
        <p className={clientSectionLabel}>{t("progress.beforeAfter")}</p>
        {!hasPhotos ? (
          <div className="mt-6 flex flex-col items-center py-12 text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-white/25" />
            <p className="font-medium text-white">{t("progress.startTracking")}</p>
            <p className="mt-2 max-w-sm text-sm text-white/45">
              {t("progress.startTrackingHint")}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-6">
            <ComparePhotoColumn
              photos={photos}
              selectedId={beforePhotoId}
              onSelect={setBeforePhotoId}
              label={t("progress.before")}
            />
            <ComparePhotoColumn
              photos={photos}
              selectedId={afterPhotoId}
              onSelect={setAfterPhotoId}
              label={t("progress.after")}
            />
          </div>
        )}

        {hasPhotos ? (
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className={clientSectionLabel}>{t("progress.howYouGotThere")}</p>
            <p className="mt-1 text-xs text-white/40">{t("progress.journeyHint")}</p>

            {journeyLoading ? (
              <p className="mt-5 text-sm text-white/45">{t("progress.calculating")}</p>
            ) : journeyStats ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <JourneyStatCard
                  label={t("progress.days")}
                  value={String(journeyStats.daysSpent)}
                  hint={t("progress.daysHint")}
                />
                <JourneyStatCard
                  label={t("progress.trainingDays")}
                  value={String(journeyStats.activeTrainingDays)}
                  hint={t("progress.trainingDaysHint")}
                />
                <JourneyStatCard
                  label={t("progress.totalReps")}
                  value={journeyStats.totalReps.toLocaleString()}
                  hint={t("progress.totalRepsHint")}
                />
                <JourneyStatCard
                  label={t("progress.caloriesVsTdee")}
                  value={
                    journeyStats.calorieBalance != null
                      ? journeyStats.calorieBalance < 0
                        ? t("progress.deficit", {
                            amount: Math.abs(Math.round(journeyStats.calorieBalance)).toLocaleString(),
                          })
                        : journeyStats.calorieBalance > 0
                          ? t("progress.surplus", {
                              amount: Math.round(journeyStats.calorieBalance).toLocaleString(),
                            })
                          : t("progress.onTarget")
                      : t("progress.setTdee")
                  }
                  valueClassName={
                    journeyStats.calorieBalance == null
                      ? undefined
                      : journeyStats.calorieBalance < 0
                        ? "text-red-400"
                        : journeyStats.calorieBalance > 0
                          ? "text-emerald-400"
                          : "text-[#A8C5DC]"
                  }
                  hint={
                    journeyStats.tdee
                      ? t("progress.tdeeHint", {
                          eaten: journeyStats.totalCaloriesConsumed.toLocaleString(),
                          tdee: journeyStats.tdee.toLocaleString(),
                        })
                      : t("progress.tdeeMissing")
                  }
                />
              </div>
            ) : (
              <p className="mt-5 text-sm text-white/45">{t("progress.selectPhotos")}</p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

