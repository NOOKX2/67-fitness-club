export type MuscleTask = "workout" | "weight" | "meal";

export type DailyMuscleStatus = {
  today: Record<MuscleTask, boolean>;
  completed_count: number;
  all_complete: boolean;
  streak_days: number;
};

const TASKS: MuscleTask[] = ["workout", "weight", "meal"];

export const MUSCLE_TASK_META: Record<
  MuscleTask,
  { label: string; shortLabel: string }
> = {
  workout: { label: "Workout", shortLabel: "Lift" },
  weight: { label: "Weight", shortLabel: "Scale" },
  meal: { label: "Meal", shortLabel: "Fuel" },
};

export function patchDailyMuscleStatus(
  status: DailyMuscleStatus,
  task: MuscleTask
): DailyMuscleStatus {
  if (status.today[task]) return status;

  const today = { ...status.today, [task]: true };
  const completed_count = TASKS.filter((key) => today[key]).length;
  const all_complete = completed_count === TASKS.length;
  const streak_days =
    all_complete && status.streak_days === 0 ? 1 : status.streak_days;

  return {
    today,
    completed_count,
    all_complete,
    streak_days: all_complete ? Math.max(status.streak_days, 1) : status.streak_days,
  };
}
