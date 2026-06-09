"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { api } from "@/lib/api-client";
import { CardioEditor } from "@/components/admin/CardioEditor";
import type { ExerciseVideo, ProgramExercise, ProgramTemplate } from "@/lib/data";
import {
  cardioToFormState,
  formStateToCardio,
} from "@/lib/program-cardio";

const TRACKS = ["Fat Loss", "Muscle Gain", "Maintenance"];

export function ProgramBuilder({
  track,
  day,
  program,
  videos,
}: {
  track: string;
  day: number;
  program: ProgramTemplate;
  videos: ExerciseVideo[];
}) {
  const router = useRouter();
  const initialCardioForm = cardioToFormState(program.cardio);
  const [exercises, setExercises] = useState<ProgramExercise[]>(
    program.exercises.length > 0
      ? program.exercises
      : [{ id: uuidv4(), name: "", target_sets: 3, target_reps: "8-12", demo_video_id: null }]
  );
  const [cardioMinutes, setCardioMinutes] = useState(initialCardioForm.minutes);
  const [cardioKm, setCardioKm] = useState(initialCardioForm.km);
  const [cardioNotes, setCardioNotes] = useState(initialCardioForm.notes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function navigate(nextTrack: string, nextDay: number) {
    router.push(
      `/admin/programs?track=${encodeURIComponent(nextTrack)}&day=${nextDay}`
    );
  }

  function addExercise() {
    setExercises([
      ...exercises,
      { id: uuidv4(), name: "", target_sets: 3, target_reps: "8-12", demo_video_id: null },
    ]);
  }

  function removeExercise(id: string) {
    setExercises(exercises.filter((e) => e.id !== id));
  }

  function updateExercise(id: string, patch: Partial<ProgramExercise>) {
    setExercises(exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api("admin/programs", {
        method: "POST",
        body: JSON.stringify({
          track,
          day,
          exercises,
          cardio: formStateToCardio({
            minutes: cardioMinutes,
            km: cardioKm,
            notes: cardioNotes,
          }),
          id: program.id,
        }),
      });
      setMessage("Program saved to database");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-white">
          Program Builder
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create and edit workout programs. Changes are published globally to all
          assigned clients.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div>
          <FieldLabel>Master Track</FieldLabel>
          <select
            value={track}
            onChange={(e) => navigate(e.target.value, day)}
            className="w-full border border-zinc-700 bg-black px-4 py-3 text-sm text-white"
          >
            {TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Day</FieldLabel>
          <select
            value={day}
            onChange={(e) => navigate(track, Number(e.target.value))}
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

      <div className="border border-zinc-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Exercises
          </h2>
          <Button
            type="button"
            className="h-9 gap-1 bg-[#6B93B8] text-xs text-white hover:bg-[#5a82a7]"
            onClick={addExercise}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Exercise
          </Button>
        </div>

        <div className="space-y-4">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              className="grid grid-cols-[1fr_80px_100px_1fr_40px] items-end gap-3"
            >
              <div>
                <FieldLabel>Exercise Name</FieldLabel>
                <Input
                  value={ex.name}
                  onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                  placeholder="Chest Press"
                />
              </div>
              <div>
                <FieldLabel>Sets</FieldLabel>
                <Input
                  type="number"
                  value={ex.target_sets}
                  onChange={(e) =>
                    updateExercise(ex.id, { target_sets: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <FieldLabel>Reps</FieldLabel>
                <Input
                  value={ex.target_reps}
                  onChange={(e) =>
                    updateExercise(ex.id, { target_reps: e.target.value })
                  }
                  placeholder="8-12"
                />
              </div>
              <div>
                <FieldLabel>Demo Video</FieldLabel>
                <select
                  value={ex.demo_video_id ?? ""}
                  onChange={(e) => {
                    const video = videos.find((v) => v.id === e.target.value);
                    updateExercise(ex.id, {
                      demo_video_id: e.target.value || null,
                      name: video?.name ?? ex.name,
                    });
                  }}
                  className="w-full border border-zinc-700 bg-black px-3 py-3 text-sm text-white"
                >
                  <option value="">Select video</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(ex.id)}
                className="mb-1 flex h-10 w-10 items-center justify-center bg-red-900/40 text-red-400 hover:bg-red-900/60"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

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

        <Button
          type="button"
          className="mt-6 h-12 w-full gap-2 bg-[#6B93B8] text-white hover:bg-[#5a82a7]"
          onClick={save}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save and Publish Changes"}
        </Button>
      </div>
    </div>
  );
}
