export const LONG_RUN_EXERCISE = "Long Run";

export function liftUsesKm(exerciseName: string): boolean {
  return exerciseName === LONG_RUN_EXERCISE;
}

export function liftUnit(exerciseName: string): "km" | "kg" {
  return liftUsesKm(exerciseName) ? "km" : "kg";
}

export function formatLiftAmount(exerciseName: string, value: number): string {
  return `${value} ${liftUnit(exerciseName)}`;
}

export function liftInputPlaceholder(exerciseName: string, isResubmit: boolean): string {
  const unit = liftUnit(exerciseName);
  if (isResubmit) return `Submit a new PR (${unit})`;
  return liftUsesKm(exerciseName)
    ? `Enter distance (${unit})`
    : `Enter weight (${unit})`;
}
