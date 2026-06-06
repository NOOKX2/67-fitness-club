"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { NutritionHeader } from "@/components/NutritionHeader";
import { useMuscleReward } from "@/components/MuscleStreakContext";
import { api } from "@/lib/api-client";

const MEAL_OPTIONS = [
  { value: 1, label: "Meal 1" },
  { value: 2, label: "Meal 2" },
  { value: 3, label: "Meal 3" },
  { value: 4, label: "Meal 4" },
];

export function NutritionSubmitClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { celebrateMuscleTask } = useMuscleReward();
  const [mealNumber, setMealNumber] = useState(1);
  const [customName, setCustomName] = useState("");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function onPhoto(f: File | null) {
    if (!f) return;
    setPhotoName(f.name);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function submitMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) {
      setError("Please add a meal photo");
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

      <form
        onSubmit={submitMeal}
        className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8"
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wide text-white">
            Submit Meal
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
              <FieldLabel>Meal Number</FieldLabel>
              <select
                value={mealNumber}
                onChange={(e) => setMealNumber(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white focus:border-zinc-500 focus:outline-none"
              >
                {MEAL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Custom Meal Name (optional)</FieldLabel>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Pre-workout snack"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Weight (grams)</FieldLabel>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="250"
            />
          </div>

          <div>
            <FieldLabel>Meal Description</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your meal... (e.g., Grilled chicken with rice and vegetables)"
              rows={5}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <FieldLabel>Meal Photo</FieldLabel>
            <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-black text-sm font-medium uppercase tracking-wide text-white transition-colors hover:border-zinc-500">
              <Camera className="h-5 w-5" />
              {photoName ? photoName : "Take/Upload Photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
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
            disabled={submitting || !photo}
          >
            {submitting ? "Submitting…" : "Submit to Coach"}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Your coach will review and provide feedback
          </p>
        </div>
      </form>
    </div>
  );
}
