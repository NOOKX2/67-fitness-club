"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { useLanguage } from "@/components/LanguageProvider";
import { NutritionHeader } from "@/components/NutritionHeader";
import { useMuscleReward } from "@/components/MuscleStreakContext";
import { api } from "@/lib/api-client";
import { clientCard, clientField } from "@/lib/client-ui";
import { readImageDataUrl } from "@/lib/file-upload";
import { cn } from "@/lib/utils";

const MEAL_OPTION_KEYS = [
  { value: 1, labelKey: "nutrition.meal1" },
  { value: 2, labelKey: "nutrition.meal2" },
  { value: 3, labelKey: "nutrition.meal3" },
  { value: 4, labelKey: "nutrition.meal4" },
] as const;

export function NutritionSubmitClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { celebrateMuscleTask } = useMuscleReward();
  const [mealNumber, setMealNumber] = useState(1);
  const [customName, setCustomName] = useState("");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onPhoto(file: File) {
    setPhotoLoading(true);
    setError("");
    try {
      const dataUrl = await readImageDataUrl(file);
      setPhoto(dataUrl);
      setPhotoName(file.name);
    } catch {
      setPhoto("");
      setPhotoName("");
      setError(t("nutrition.photoReadError"));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function submitMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError(t("nutrition.photoRequired"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api("nutrition/meals-v2", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          meal_number: mealNumber,
          meal_type: customName ? "custom" : "main",
          custom_name: customName,
          photo_base64: photo,
          description,
          weight,
        }),
      });
      celebrateMuscleTask("meal");
      router.push("/nutrition");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-0">
      <NutritionHeader showAddButton={false} />

      <form onSubmit={submitMeal} className={cn(clientCard, "mx-auto mt-10 max-w-2xl p-8")}>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wide text-white">
            {t("nutrition.submitTitle")}
          </h2>
          <Link
            href="/nutrition"
            className="text-zinc-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Link>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("nutrition.mealNumber")}</FieldLabel>
              <select
                value={mealNumber}
                onChange={(e) => setMealNumber(Number(e.target.value))}
                className={cn("w-full px-4 py-3 text-sm text-white focus:outline-none", clientField)}
              >
                {MEAL_OPTION_KEYS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(m.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>{t("nutrition.customMealName")}</FieldLabel>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t("nutrition.customMealPlaceholder")}
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t("nutrition.weightGrams")}</FieldLabel>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="250"
            />
          </div>

          <div>
            <FieldLabel>{t("nutrition.mealDescription")}</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("nutrition.mealDescriptionPlaceholder")}
              rows={5}
              className={cn("w-full resize-none px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none", clientField)}
            />
          </div>

          <div>
            <FieldLabel>{t("nutrition.mealPhoto")}</FieldLabel>
            <FilePicker
              accept="image/*"
              disabled={photoLoading || submitting}
              onFile={onPhoto}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-2 text-sm font-medium uppercase tracking-wide text-white transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-60",
                clientField
              )}
            >
              <Camera className="h-5 w-5" />
              {photoLoading
                ? t("common.loadingPhoto")
                : photoName
                  ? photoName
                  : t("nutrition.takeUploadPhoto")}
            </FilePicker>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Meal preview"
                className="mt-4 max-h-48 w-full object-cover"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            className="h-14 w-full text-sm"
            disabled={submitting || photoLoading || !photo}
          >
            {submitting ? t("nutrition.submitting") : t("nutrition.submitToCoach")}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            {t("nutrition.coachReviewNote")}
          </p>
        </div>
      </form>
    </div>
  );
}
