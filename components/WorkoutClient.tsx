"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ListPlus, Plus, Trash2, Zap } from "lucide-react";
import { ClientSectionHeading } from "@/components/ClientSectionHeading";
import { useLanguage } from "@/components/LanguageProvider";
import { ExerciseVideoPlayer } from "@/components/ExerciseVideoPlayer";
import { StepperInput } from "@/components/StepperInput";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { useMuscleReward } from "@/components/MuscleStreakContext";
import type {
  CardioLog,
  FormCheckSubmission,
  WorkoutDay,
  WorkoutSetEntry,
} from "@/lib/data";
import { MAX_FORM_CHECK_VIDEO_MB } from "@/lib/form-check-constants";
import {
  clientCard,
  clientDayTab,
  clientDayTabActive,
  clientFieldLabel,
  clientPageEyebrow,
  clientPageTitle,
  clientSaveButtonClass,
  clientWeekSelect,
} from "@/lib/client-ui";
import { MOBILE_FILE_INPUT_CLASS } from "@/lib/file-upload";
import { formatProgramCardio } from "@/lib/program-cardio";
import { cn } from "@/lib/utils";

const WEEK_OPTIONS = [1, 2, 3, 4];

type ExerciseLogState = {
  actual_weight: string;
  actual_reps: string;
  sets?: WorkoutSetEntry[];
};

export function WorkoutClient({
  userId,
  week,
  day,
  days,
  initialLogs,
  initialCardioLog,
  initialFormChecks = [],
}: {
  userId: string;
  week: number;
  day: number;
  days: WorkoutDay[];
  initialLogs: Record<string, ExerciseLogState>;
  initialCardioLog: CardioLog;
  initialFormChecks?: FormCheckSubmission[];
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { celebrateMuscleTask } = useMuscleReward();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [logs, setLogs] = useState(initialLogs);
  const [customSetsOpen, setCustomSetsOpen] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    for (const [exerciseId, log] of Object.entries(initialLogs)) {
      if (log.sets?.length) open[exerciseId] = true;
    }
    return open;
  });
  const [cardioLog, setCardioLog] = useState(initialCardioLog);
  const [formChecks, setFormChecks] = useState<Record<string, FormCheckSubmission>>(() => {
    const map: Record<string, FormCheckSubmission> = {};
    for (const fc of initialFormChecks) {
      if (fc.exercise_id) map[fc.exercise_id] = fc;
    }
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingFormCheckId, setUploadingFormCheckId] = useState<string | null>(null);
  const [savingCardio, setSavingCardio] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [cardioSaved, setCardioSaved] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const dayData = days.find((d) => d.day === day);

  async function uploadFormCheck(exerciseId: string, exerciseName: string, file: File) {
    if (file.size > MAX_FORM_CHECK_VIDEO_MB * 1024 * 1024) {
      setMessages((m) => ({
        ...m,
        [exerciseId]: `Video must be under ${MAX_FORM_CHECK_VIDEO_MB}MB`,
      }));
      return;
    }

    setUploadingFormCheckId(exerciseId);
    setMessages((m) => ({ ...m, [exerciseId]: "" }));

    try {
      const video_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Could not read video file"));
        reader.readAsDataURL(file);
      });

      const result = await api<{ submission: FormCheckSubmission }>("form-checks/submit", {
        method: "POST",
        body: JSON.stringify({
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          week,
          day,
          video_base64,
        }),
      });

      setFormChecks((prev) => ({
        ...prev,
        [exerciseId]: result.submission,
      }));
      setMessages((m) => ({
        ...m,
        [exerciseId]: t("workouts.formCheckUploaded"),
      }));
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [exerciseId]: err instanceof Error ? err.message : t("common.uploadFailed"),
      }));
    } finally {
      setUploadingFormCheckId(null);
    }
  }

  function onFormCheckFileSelect(
    exerciseId: string,
    exerciseName: string,
    file: File | null
  ) {
    if (!file) return;
    void uploadFormCheck(exerciseId, exerciseName, file);
  }

  function formCheckButtonLabel(exerciseId: string) {
    const fc = formChecks[exerciseId];
    if (uploadingFormCheckId === exerciseId) return t("workouts.uploading");
    if (!fc) return t("workouts.uploadFormCheck");
    if (fc.status === "reviewed") return t("workouts.reuploadFormCheck");
    return t("workouts.formCheckPending");
  }

  function navigate(nextWeek: number, nextDay: number) {
    router.push(`/workouts?week=${nextWeek}&day=${nextDay}`);
  }

  function openCustomSets(exerciseId: string) {
    setCustomSetsOpen((prev) => ({ ...prev, [exerciseId]: true }));
    setLogs((prev) => {
      const current = prev[exerciseId];
      if (current?.sets?.length) return prev;
      return {
        ...prev,
        [exerciseId]: {
          actual_weight: current?.actual_weight ?? "",
          actual_reps: current?.actual_reps ?? "",
          sets: [
            {
              weight: current?.actual_weight ?? "",
              reps: current?.actual_reps ?? "",
            },
          ],
        },
      };
    });
  }

  function addSet(exerciseId: string) {
    setLogs((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        actual_weight: prev[exerciseId]?.actual_weight ?? "",
        actual_reps: prev[exerciseId]?.actual_reps ?? "",
        sets: [
          ...(prev[exerciseId]?.sets ?? []),
          { weight: prev[exerciseId]?.sets?.at(-1)?.weight ?? "", reps: "" },
        ],
      },
    }));
  }

  function updateSet(
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) {
    setLogs((prev) => {
      const entry = prev[exerciseId];
      const sets = [...(entry?.sets ?? [])];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      return {
        ...prev,
        [exerciseId]: {
          actual_weight: entry?.actual_weight ?? "",
          actual_reps: entry?.actual_reps ?? "",
          sets,
        },
      };
    });
  }

  function removeSet(exerciseId: string, setIndex: number) {
    setLogs((prev) => {
      const entry = prev[exerciseId];
      const sets = [...(entry?.sets ?? [])];
      if (sets.length <= 1) return prev;
      sets.splice(setIndex, 1);
      return {
        ...prev,
        [exerciseId]: {
          actual_weight: entry?.actual_weight ?? "",
          actual_reps: entry?.actual_reps ?? "",
          sets,
        },
      };
    });
  }

  async function saveLog(exerciseId: string) {
    const entry = logs[exerciseId];
    const useCustomSets = customSetsOpen[exerciseId] && (entry?.sets?.length ?? 0) > 0;
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
          ...(useCustomSets ? { sets: entry?.sets } : {}),
        }),
      });
      setSavedIds((s) => ({ ...s, [exerciseId]: true }));
      setTimeout(() => setSavedIds((s) => ({ ...s, [exerciseId]: false })), 2000);
      celebrateMuscleTask("workout");
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [exerciseId]: err instanceof Error ? err.message : t("common.saveFailed"),
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function saveCardioLog() {
    setSavingCardio(true);
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
      setCardioSaved(true);
      setTimeout(() => setCardioSaved(false), 2000);
      celebrateMuscleTask("workout");
      router.refresh();
    } catch (err) {
      setMessages((m) => ({
        ...m,
        cardio: err instanceof Error ? err.message : t("common.saveFailed"),
      }));
    } finally {
      setSavingCardio(false);
    }
  }

  return (
    <div>
      <p className={clientPageEyebrow}>{t("workouts.eyebrow")}</p>
      <h1 className={cn(clientPageTitle, "mb-8")}>{t("workouts.title")}</h1>

      <div className="mb-7 flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {t("common.week")}
        </span>
        <select
          value={week}
          onChange={(e) => navigate(Number(e.target.value), day)}
          className={clientWeekSelect}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B93B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          }}
        >
          {WEEK_OPTIONS.map((w) => (
            <option key={w} value={w} className="bg-zinc-900">
              {t("workouts.weekOption", { n: w })}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-9 flex gap-1 sm:flex-wrap sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const active = day === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => navigate(week, d)}
              className={cn(
                clientDayTab,
                "min-w-0 flex-1 rounded-[10px] px-1 py-2 sm:min-w-[70px] sm:flex-none sm:rounded-[14px] sm:px-[18px] sm:py-3.5",
                active && clientDayTabActive
              )}
            >
              <span
                className={cn(
                  "text-[7px] font-bold uppercase tracking-[0.1em] sm:text-[9px] sm:tracking-[0.18em]",
                  active ? "text-black/50" : "text-white/45"
                )}
              >
                {t("common.day")}
              </span>
              <span
                className={cn(
                  "font-[family-name:var(--font-inter)] text-lg font-extrabold leading-none tracking-[-0.04em] sm:text-[26px]",
                  active ? "text-black" : "text-white/60"
                )}
              >
                {d}
              </span>
            </button>
          );
        })}
      </div>

      <ClientSectionHeading className="mb-4">
        {t("workouts.dayExercises", { day })}
      </ClientSectionHeading>

      <div className="space-y-4">
        {dayData?.exercises.map((ex) => (
          <div key={ex.id} className={cn(clientCard, "w-full px-5 py-6 sm:px-6")}>
            <h3 className="font-[family-name:var(--font-inter)] text-lg font-extrabold tracking-[-0.03em] text-white">
              {ex.name}
            </h3>
            <p className="mt-1 mb-5 text-[13px] text-white/45">
              {t("common.target")}:{" "}
              {t("workouts.targetLine", {
                sets: ex.target_sets,
                reps: ex.target_reps,
              })}
            </p>

            {customSetsOpen[ex.id] ? (
              <>
                {(ex.demo_video || ex.image_url) && (
                  <div className="mb-3 flex min-w-0 items-end">
                    {ex.demo_video ? (
                      <ExerciseVideoPlayer
                        video={ex.demo_video}
                        title={ex.name}
                        compact
                        className="h-[4.75rem] w-[4.75rem] rounded-lg sm:h-28 sm:w-44 sm:rounded-xl"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.image_url!}
                        alt={ex.name}
                        className="h-[4.75rem] w-[4.75rem] shrink-0 rounded-lg object-cover sm:h-28 sm:w-44 sm:rounded-xl"
                      />
                    )}
                  </div>
                )}
              <div className="mb-4 space-y-3">
                {(logs[ex.id]?.sets ?? []).map((set, setIndex) => (
                  <div key={setIndex} className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="col-span-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A8C5DC]">
                      {t("common.set")} {setIndex + 1}
                    </p>
                      {(logs[ex.id]?.sets ?? []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSet(ex.id, setIndex)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                          aria-label={`Delete set ${setIndex + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("common.delete")}
                        </button>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                      <label className={cn(clientFieldLabel, "truncate")}>{t("common.weightKg")}</label>
                      <StepperInput
                        compact
                        className="w-full"
                        value={set.weight}
                        onChange={(weight) => updateSet(ex.id, setIndex, "weight", weight)}
                        step={1}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                      <label className={cn(clientFieldLabel, "truncate")}>{t("common.reps")}</label>
                      <StepperInput
                        compact
                        className="w-full"
                        value={set.reps}
                        onChange={(reps) => updateSet(ex.id, setIndex, "reps", reps)}
                        step={1}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full gap-1.5 border-white/15 text-[11px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
                  onClick={() => addSet(ex.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("workouts.addSet")}
                </Button>
              </div>
              </>
            ) : (
              <div className="mb-4 flex min-w-0 items-end gap-2 sm:gap-3">
                {(ex.demo_video || ex.image_url) && (
                  <div className="shrink-0">
                    {ex.demo_video ? (
                      <ExerciseVideoPlayer
                        video={ex.demo_video}
                        title={ex.name}
                        compact
                        className="h-[4.75rem] w-[4.75rem] rounded-lg sm:h-28 sm:w-44 sm:rounded-xl"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.image_url!}
                        alt={ex.name}
                        className="h-[4.75rem] w-[4.75rem] rounded-lg object-cover sm:h-28 sm:w-44 sm:rounded-xl"
                      />
                    )}
                  </div>
                )}
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                    <label className={cn(clientFieldLabel, "truncate")}>
                      {t("common.weightKg")}
                    </label>
                    <StepperInput
                      compact
                      className="w-full"
                      value={logs[ex.id]?.actual_weight ?? ""}
                      onChange={(actual_weight) =>
                        setLogs({
                          ...logs,
                          [ex.id]: {
                            actual_weight,
                            actual_reps: logs[ex.id]?.actual_reps ?? "",
                            sets: logs[ex.id]?.sets,
                          },
                        })
                      }
                      step={1}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                    <label className={cn(clientFieldLabel, "truncate")}>{t("common.reps")}</label>
                    <StepperInput
                      compact
                      className="w-full"
                      value={logs[ex.id]?.actual_reps ?? ""}
                      onChange={(actual_reps) =>
                        setLogs({
                          ...logs,
                          [ex.id]: {
                            actual_reps,
                            actual_weight: logs[ex.id]?.actual_weight ?? "",
                            sets: logs[ex.id]?.sets,
                          },
                        })
                      }
                      step={1}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:gap-1.5">
                  <span className={cn(clientFieldLabel, "invisible truncate")} aria-hidden>
                    —
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1 border-white/15 px-2 text-[9px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10 sm:h-11 sm:px-3 sm:text-[10px]"
                    onClick={() => openCustomSets(ex.id)}
                  >
                    <ListPlus className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[3.25rem] leading-tight sm:max-w-none">
                      {t("workouts.logEachSet")}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <input
                ref={(el) => {
                  fileInputRefs.current[ex.id] = el;
                }}
                type="file"
                accept="video/*"
                className={MOBILE_FILE_INPUT_CLASS}
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  onFormCheckFileSelect(ex.id, ex.name, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1.5 border-white/20 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-white/10 sm:text-xs"
                onClick={() => fileInputRefs.current[ex.id]?.click()}
                disabled={uploadingFormCheckId === ex.id}
              >
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">{formCheckButtonLabel(ex.id)}</span>
              </Button>
              <Button
                type="button"
                variant="save"
                className={cn(
                  clientSaveButtonClass,
                  "h-11",
                  savedIds[ex.id] && "border-white bg-white text-black hover:bg-white hover:text-black"
                )}
                onClick={() => saveLog(ex.id)}
                disabled={savingId === ex.id}
              >
                {savingId === ex.id
                  ? t("common.saving")
                  : savedIds[ex.id]
                    ? t("common.saved")
                    : t("common.save")}
              </Button>
            </div>
            {formChecks[ex.id]?.status === "reviewed" && formChecks[ex.id]?.feedback_text ? (
              <p className="mt-2 text-xs text-[#A8C5DC]">
                {t("workouts.coachFeedbackChat")}
              </p>
            ) : null}
            {messages[ex.id] && (
              <p
                className={cn(
                  "mt-2 text-xs",
                  messages[ex.id].includes("uploaded") || messages[ex.id].includes("coach")
                    ? "text-[#A8C5DC]"
                    : "text-red-400"
                )}
              >
                {messages[ex.id]}
              </p>
            )}
          </div>
        ))}
      </div>

      {dayData?.cardio && (
        <section className="mt-9">
          <ClientSectionHeading className="mb-4">{t("workouts.cardioSection")}</ClientSectionHeading>
          <div className={cn(clientCard, "px-6 py-6 sm:px-7")}>
            <div className="mb-5 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#6B93B8] bg-gradient-to-br from-[#1C2E40] to-[#2a4560]">
                <Zap className="h-5 w-5 stroke-[#A8C5DC]" strokeWidth={2} />
              </div>
              <div>
                <p className="font-[family-name:var(--font-inter)] text-base font-extrabold tracking-[-0.02em] text-white">
                  {t("workouts.cardioTitle")}
                </p>
                <p className="text-xs text-white/45">
                  Target: {formatProgramCardio(dayData.cardio)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {t("workouts.durationMin")}
                </label>
                <StepperInput
                  value={cardioLog.duration_minutes}
                  onChange={(duration_minutes) =>
                    setCardioLog({ ...cardioLog, duration_minutes })
                  }
                  inputMode="numeric"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {t("workouts.distanceKm")}
                </label>
                <StepperInput
                  value={cardioLog.distance_km}
                  onChange={(distance_km) => setCardioLog({ ...cardioLog, distance_km })}
                  step={1}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {t("workouts.burnKcal")}
                </label>
                <StepperInput
                  value={cardioLog.calories_burned}
                  onChange={(calories_burned) =>
                    setCardioLog({ ...cardioLog, calories_burned })
                  }
                  inputMode="numeric"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="save"
              className={cn(
                "mt-4",
                clientSaveButtonClass,
                cardioSaved && "border-white bg-white text-black hover:bg-white hover:text-black"
              )}
              onClick={saveCardioLog}
              disabled={savingCardio}
            >
              {savingCardio
                ? t("common.saving")
                : cardioSaved
                  ? t("common.saved")
                  : t("common.save")}
            </Button>
            {messages.cardio && (
              <p className="mt-2 text-xs text-red-400">{messages.cardio}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
