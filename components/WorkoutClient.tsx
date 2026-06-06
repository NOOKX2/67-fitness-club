"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RunningIcon } from "@/components/icons/RunningIcon";
import { ExerciseVideoPlayer } from "@/components/ExerciseVideoPlayer";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FitSelect } from "@/components/FitSelect";
import { api } from "@/lib/api-client";
import { useMuscleReward } from "@/components/MuscleStreakContext";
import type { CardioLog, WorkoutDay } from "@/lib/data";
import { formatProgramCardio } from "@/lib/program-cardio";
import { cn } from "@/lib/utils";

export function WorkoutClient({
  userId,
  week,
  day,
  days,
  initialLogs,
  initialCardioLog,
}: {
  userId: string;
  week: number;
  day: number;
  days: WorkoutDay[];
  initialLogs: Record<string, { actual_weight: string; actual_reps: string }>;
  initialCardioLog: CardioLog;
}) {
  const router = useRouter();
  const { celebrateMuscleTask } = useMuscleReward();
  const [logs, setLogs] = useState(initialLogs);
  const [cardioLog, setCardioLog] = useState(initialCardioLog);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingCardio, setSavingCardio] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [cardioMessage, setCardioMessage] = useState("");

  const dayData = days.find((d) => d.day === day);

  function navigate(nextWeek: number, nextDay: number) {
    router.push(`/workouts?week=${nextWeek}&day=${nextDay}`);
  }

  async function saveLog(exerciseId: string) {
    const entry = logs[exerciseId];
    setSavingId(exerciseId);
    setMessages((m) => ({ ...m, [exerciseId]: "" }));
    try {
      await api("workouts/log", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          exercise_id: exerciseId,
          week,
          day,
          actual_weight: entry?.actual_weight ?? "0",
          actual_reps: entry?.actual_reps ?? "0",
        }),
      });
      setMessages((m) => ({ ...m, [exerciseId]: "Saved" }));
      celebrateMuscleTask("workout");
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [exerciseId]: err instanceof Error ? err.message : "Save failed",
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function saveCardioLog() {
    setSavingCardio(true);
    setCardioMessage("");
    try {
      await api("workouts/cardio-log", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          week,
          day,
          duration_minutes: cardioLog.duration_minutes,
          distance_km: cardioLog.distance_km,
          calories_burned: cardioLog.calories_burned,
        }),
      });
      setCardioMessage("Saved");
      celebrateMuscleTask("workout");
      router.refresh();
    } catch (err) {
      setCardioMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingCardio(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
          Training Program
        </h1>
        <div className="mt-6">
          <FitSelect
            label="Week"
            value={week}
            onChange={(w) => navigate(w, day)}
            options={[1, 2, 3, 4].map((w) => ({
              value: w,
              label: `Week ${w}`,
            }))}
          />
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => navigate(week, d)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border py-5 transition-colors",
                day === d
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 bg-black text-white hover:border-zinc-500"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-widest">
                Day
              </span>
              <span className="mt-1 text-4xl font-light">{d}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-tight text-white">
          Day {day} Exercises
        </h2>

        <div className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-black/70 backdrop-blur-sm">
          {dayData?.exercises.map((ex) => (
            <div key={ex.id} className="p-6">
              <div className="flex gap-5">
                <div className="shrink-0">
                  {ex.demo_video ? (
                    <ExerciseVideoPlayer
                      video={ex.demo_video}
                      title={ex.name}
                      compact
                    />
                  ) : ex.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ex.image_url}
                      alt={ex.name}
                      className="h-28 w-36 rounded-xl object-cover grayscale"
                    />
                  ) : (
                    <div className="h-28 w-36 rounded-xl bg-zinc-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold uppercase tracking-wide text-white">
                    {ex.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Target: {ex.target_sets} sets × {ex.target_reps} reps
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Weight (kg)</FieldLabel>
                      <Input
                        type="number"
                        placeholder="0"
                        value={logs[ex.id]?.actual_weight ?? ""}
                        onChange={(e) =>
                          setLogs({
                            ...logs,
                            [ex.id]: {
                              actual_weight: e.target.value,
                              actual_reps: logs[ex.id]?.actual_reps ?? "",
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Reps</FieldLabel>
                      <Input
                        type="number"
                        placeholder="0"
                        value={logs[ex.id]?.actual_reps ?? ""}
                        onChange={(e) =>
                          setLogs({
                            ...logs,
                            [ex.id]: {
                              actual_reps: e.target.value,
                              actual_weight: logs[ex.id]?.actual_weight ?? "",
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="mt-5 h-12 w-full text-sm"
                    onClick={() => saveLog(ex.id)}
                    disabled={savingId === ex.id}
                  >
                    {savingId === ex.id ? "Saving…" : "Save"}
                  </Button>
                  {messages[ex.id] && (
                    <p
                      className={`mt-2 text-xs ${
                        messages[ex.id] === "Saved"
                          ? "text-[#a3e635]"
                          : "text-red-400"
                      }`}
                    >
                      {messages[ex.id]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {dayData?.cardio && (
        <section>
          <h2 className="mb-6 text-2xl font-bold uppercase tracking-tight text-white">
            Cardio
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#a3e635]/10 text-[#a3e635]">
                <RunningIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold uppercase tracking-wide text-white">
                  Today&apos;s Cardio
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Target: {formatProgramCardio(dayData.cardio)}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <div>
                    <FieldLabel>Duration (min)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={cardioLog.duration_minutes}
                      onChange={(e) =>
                        setCardioLog({
                          ...cardioLog,
                          duration_minutes: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Distance (km)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="0"
                      value={cardioLog.distance_km}
                      onChange={(e) =>
                        setCardioLog({
                          ...cardioLog,
                          distance_km: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Burn (kcal)</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={cardioLog.calories_burned}
                      onChange={(e) =>
                        setCardioLog({
                          ...cardioLog,
                          calories_burned: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-5 h-12 w-full text-sm"
                  onClick={saveCardioLog}
                  disabled={savingCardio}
                >
                  {savingCardio ? "Saving…" : "Save"}
                </Button>
                {cardioMessage && (
                  <p
                    className={`mt-2 text-xs ${
                      cardioMessage === "Saved"
                        ? "text-[#a3e635]"
                        : "text-red-400"
                    }`}
                  >
                    {cardioMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
