"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, User } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import { CardioEditor } from "@/components/admin/CardioEditor";
import type { AdminClient, ExerciseVideo, NutritionLimits, ProgramExercise } from "@/lib/data";
import { limitMacrosToKcal } from "@/lib/nutrition-utils";
import {
  cardioToFormState,
  formStateToCardio,
  type ProgramCardio,
} from "@/lib/program-cardio";

export function CustomPrograms({
  clients,
  selectedEmail,
  week,
  day,
  initialExercises,
  initialCardio,
  initialLimits,
  videos,
}: {
  clients: AdminClient[];
  selectedEmail: string;
  week: number;
  day: number;
  initialExercises: ProgramExercise[];
  initialCardio: ProgramCardio | null;
  initialLimits: NutritionLimits;
  videos: ExerciseVideo[];
}) {
  const router = useRouter();
  const initialCardioForm = cardioToFormState(initialCardio);
  const [exercises, setExercises] = useState<ProgramExercise[]>(
    initialExercises.length > 0
      ? initialExercises
      : []
  );
  const [cardioMinutes, setCardioMinutes] = useState(initialCardioForm.minutes);
  const [cardioKm, setCardioKm] = useState(initialCardioForm.km);
  const [cardioNotes, setCardioNotes] = useState(initialCardioForm.notes);
  const [limits, setLimits] = useState({
    protein: initialLimits.protein != null ? String(initialLimits.protein) : "",
    carbs: initialLimits.carbs != null ? String(initialLimits.carbs) : "",
    fat: initialLimits.fat != null ? String(initialLimits.fat) : "",
  });
  const calculatedCalories = useMemo(
    () =>
      limitMacrosToKcal({
        protein: Number(limits.protein) || 0,
        carbs: Number(limits.carbs) || 0,
        fat: Number(limits.fat) || 0,
      }),
    [limits.protein, limits.carbs, limits.fat]
  );
  const [saving, setSaving] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [message, setMessage] = useState("");
  const [limitsMessage, setLimitsMessage] = useState("");
  const [error, setError] = useState("");
  const [limitsError, setLimitsError] = useState("");

  const selected = clients.find((c) => c.email === selectedEmail);

  function navigate(email: string, nextWeek: number, nextDay: number) {
    const params = new URLSearchParams();
    if (email) params.set("client", email);
    params.set("week", String(nextWeek));
    params.set("day", String(nextDay));
    router.push(`/admin/custom-programs?${params.toString()}`);
  }

  function addExercise() {
    setExercises([
      ...exercises,
      {
        id: uuidv4(),
        name: "",
        target_sets: 3,
        target_reps: "8-12",
        demo_video_id: null,
      },
    ]);
  }

  function updateExercise(id: string, patch: Partial<ProgramExercise>) {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function selectExercise(id: string, videoId: string) {
    const video = videos.find((v) => v.id === videoId);
    updateExercise(id, {
      demo_video_id: videoId || null,
      name: video?.name ?? "",
    });
  }

  async function save() {
    if (!selectedEmail) return;
    const cardio = formStateToCardio({
      minutes: cardioMinutes,
      km: cardioKm,
      notes: cardioNotes,
    });
    const hasCardio = cardio != null;
    const incomplete = exercises.some((ex) => !ex.demo_video_id || !ex.name.trim());
    if (exercises.length === 0 && !hasCardio) {
      setError("Add at least one exercise or cardio assignment");
      setMessage("");
      return;
    }
    if (exercises.length > 0 && incomplete) {
      setError("Please select an exercise from the library for every row");
      setMessage("");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api("admin/custom-programs", {
        method: "POST",
        body: JSON.stringify({
          client_email: selectedEmail,
          week,
          day,
          exercises,
          cardio,
        }),
      });
      setMessage(`Saved Week ${week}, Day ${day} for ${selected?.name ?? "client"}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveLimits() {
    if (!selectedEmail) return;
    setSavingLimits(true);
    setLimitsMessage("");
    setLimitsError("");
    try {
      await api("admin/nutrition-limits", {
        method: "POST",
        body: JSON.stringify({
          client_email: selectedEmail,
          calories: calculatedCalories > 0 ? calculatedCalories : undefined,
          protein: limits.protein ? Number(limits.protein) : undefined,
          carbs: limits.carbs ? Number(limits.carbs) : undefined,
          fat: limits.fat ? Number(limits.fat) : undefined,
        }),
      });
      setLimitsMessage(`Nutrition limits saved for ${selected?.name ?? "client"}`);
      router.refresh();
    } catch (err) {
      setLimitsError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingLimits(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-white">
          Custom Programs
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Assign personalized exercises to individual clients
        </p>
      </div>

      <div className="border border-zinc-800 p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          <User className="h-4 w-4" />
          Select Client
        </div>
        <select
          value={selectedEmail}
          onChange={(e) => navigate(e.target.value, week, day)}
          className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
        >
          <option value="">Choose a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.email}>
              {c.name} ({c.email}) - {c.tier_level}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <div className="border border-zinc-800 p-6">
            <h2 className="text-sm font-bold uppercase text-white">
              Daily Nutrition Limits
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Set daily macro targets for {selected.name}. Calories are
              calculated automatically (P×4 + C×4 + F×8).
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel>Calories (kcal)</FieldLabel>
                <Input
                  type="number"
                  readOnly
                  value={calculatedCalories > 0 ? calculatedCalories : ""}
                  placeholder="Auto"
                  className="cursor-not-allowed text-zinc-400"
                />
              </div>
              <div>
                <FieldLabel>Protein (g)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="150"
                  value={limits.protein}
                  onChange={(e) =>
                    setLimits({ ...limits, protein: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Carb (g)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="200"
                  value={limits.carbs}
                  onChange={(e) =>
                    setLimits({ ...limits, carbs: e.target.value })
                  }
                />
              </div>
              <div>
                <FieldLabel>Fat (g)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="70"
                  value={limits.fat}
                  onChange={(e) =>
                    setLimits({ ...limits, fat: e.target.value })
                  }
                />
              </div>
            </div>
            {limitsError && (
              <p className="mt-4 text-sm text-red-400">{limitsError}</p>
            )}
            {limitsMessage && (
              <p className="mt-4 text-sm text-[#6B93B8]">{limitsMessage}</p>
            )}
            <Button
              type="button"
              className="mt-5 h-11 w-full gap-2 bg-[#6B93B8] text-white sm:w-auto"
              onClick={saveLimits}
              disabled={savingLimits}
            >
              <Save className="h-4 w-4" />
              {savingLimits ? "Saving…" : "Save Nutrition Limits"}
            </Button>
          </div>

          <div className="border border-zinc-800 p-6">
          <div className="mb-4 grid max-w-md grid-cols-2 gap-4">
            <div>
              <FieldLabel>Week</FieldLabel>
              <select
                value={week}
                onChange={(e) =>
                  navigate(selectedEmail, Number(e.target.value), day)
                }
                className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
              >
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Day</FieldLabel>
              <select
                value={day}
                onChange={(e) =>
                  navigate(selectedEmail, week, Number(e.target.value))
                }
                className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-white">
              Exercises for {selected.name}
            </h2>
            <Button
              type="button"
              className="h-9 gap-1 bg-[#6B93B8] text-xs text-white"
              onClick={addExercise}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Exercise
            </Button>
          </div>

          {videos.length === 0 ? (
            <p className="mb-4 text-sm text-amber-400">
              No exercises in the video library yet. Add demo videos under
              Exercise Video Library first.
            </p>
          ) : null}

          {exercises.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No custom exercises yet. Add exercises for this client.
            </p>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex gap-3">
                  <select
                    value={ex.demo_video_id ?? ""}
                    onChange={(e) => selectExercise(ex.id, e.target.value)}
                    className="h-[46px] min-w-0 flex-1 border border-zinc-700 bg-black px-3 text-sm text-white"
                  >
                    <option value="">Select exercise from library...</option>
                    {videos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Sets"
                    value={ex.target_sets}
                    onChange={(e) =>
                      updateExercise(ex.id, {
                        target_sets: Number(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <Input
                    placeholder="Reps"
                    value={ex.target_reps}
                    onChange={(e) =>
                      updateExercise(ex.id, { target_reps: e.target.value })
                    }
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExercises(exercises.filter((x) => x.id !== ex.id))
                    }
                    className="flex h-[46px] w-10 items-center justify-center bg-red-900/40 text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {message && <p className="mt-4 text-sm text-[#6B93B8]">{message}</p>}

          <CardioEditor
            minutes={cardioMinutes}
            km={cardioKm}
            notes={cardioNotes}
            onMinutesChange={setCardioMinutes}
            onKmChange={setCardioKm}
            onNotesChange={setCardioNotes}
          />

          {(exercises.length > 0 ||
            cardioMinutes.trim() ||
            cardioKm.trim() ||
            cardioNotes.trim()) && (
            <Button
              type="button"
              className="mt-6 h-11 w-full gap-2 bg-[#6B93B8] text-white"
              onClick={save}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Custom Program"}
            </Button>
          )}
        </div>
        </>
      )}
    </div>
  );
}
