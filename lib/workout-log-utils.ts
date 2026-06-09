import type { WorkoutLog, WorkoutSetEntry } from "./data";

export function formatWorkoutLogSummary(log: {
  actual_weight: string;
  actual_reps: string;
  sets?: WorkoutSetEntry[];
}): string {
  if (log.sets?.length) {
    return log.sets
      .map((set, index) => {
        const weight = set.weight || "—";
        const reps = set.reps || "—";
        return `Set ${index + 1}: ${weight} kg × ${reps}`;
      })
      .join(" · ");
  }
  return `${log.actual_weight} kg × ${log.actual_reps} reps`;
}

export function normalizeWorkoutSets(
  sets: WorkoutSetEntry[] | undefined
): WorkoutSetEntry[] | undefined {
  if (!sets?.length) return undefined;
  const cleaned = sets
    .map((set) => ({
      weight: set.weight.trim(),
      reps: set.reps.trim(),
    }))
    .filter((set) => set.weight || set.reps);
  return cleaned.length ? cleaned : undefined;
}

export function hasWorkoutSets(log: WorkoutLog): boolean {
  return Boolean(log.sets?.length);
}
