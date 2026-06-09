import { normalizeDateOnly } from "./access";
import { dateKeyFromIso } from "./date-utils";
import { macrosToKcal, sumMealMacros } from "./nutrition-utils";
import type { WorkoutSetEntry } from "./data";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProgressJourneyStats = {
  startDate: string;
  endDate: string;
  daysSpent: number;
  activeTrainingDays: number;
  totalReps: number;
  totalCaloriesConsumed: number;
  maintenanceCalories: number | null;
  calorieBalance: number | null;
  tdee: number | null;
};

export function countRepsInLog(log: {
  actual_reps: string;
  sets?: WorkoutSetEntry[];
}): number {
  if (log.sets?.length) {
    return log.sets.reduce(
      (sum, set) => sum + (Number.parseInt(set.reps, 10) || 0),
      0
    );
  }
  return log.actual_reps
    .split(",")
    .reduce((sum, part) => sum + (Number.parseInt(part.trim(), 10) || 0), 0);
}

export function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = normalizeDateOnly(startDate) ?? startDate;
  const end = normalizeDateOnly(endDate) ?? endDate;
  const [from, to] = start <= end ? [start, end] : [end, start];
  const startMs = new Date(`${from}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
}

export function computeProgressJourneyStats(input: {
  tdee: number | null;
  startDate: string;
  endDate: string;
  workoutLogs: Array<{
    actual_reps: string;
    sets?: WorkoutSetEntry[];
    timestamp?: string;
  }>;
  meals: Array<{
    protein?: number;
    carbs?: number;
    fat?: number;
    submitted_at?: string;
  }>;
}): ProgressJourneyStats {
  const startDate = normalizeDateOnly(input.startDate) ?? input.startDate;
  const endDate = normalizeDateOnly(input.endDate) ?? input.endDate;
  const [rangeStart, rangeEnd] =
    startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

  const daysSpent = daysBetweenInclusive(rangeStart, rangeEnd);
  const trainingDates = new Set<string>();
  let totalReps = 0;

  for (const log of input.workoutLogs) {
    totalReps += countRepsInLog(log);
    if (log.timestamp) trainingDates.add(dateKeyFromIso(log.timestamp));
  }

  const mealsByDay = new Map<string, typeof input.meals>();
  for (const meal of input.meals) {
    if (!meal.submitted_at) continue;
    const key = dateKeyFromIso(meal.submitted_at);
    const bucket = mealsByDay.get(key) ?? [];
    bucket.push(meal);
    mealsByDay.set(key, bucket);
  }

  let totalCaloriesConsumed = 0;
  for (const dayMeals of mealsByDay.values()) {
    totalCaloriesConsumed += macrosToKcal(sumMealMacros(dayMeals));
  }

  const maintenanceCalories =
    input.tdee != null && input.tdee > 0 ? input.tdee * daysSpent : null;
  const calorieBalance =
    maintenanceCalories != null
      ? totalCaloriesConsumed - maintenanceCalories
      : null;

  return {
    startDate: rangeStart,
    endDate: rangeEnd,
    daysSpent,
    activeTrainingDays: trainingDates.size,
    totalReps,
    totalCaloriesConsumed,
    maintenanceCalories,
    calorieBalance,
    tdee: input.tdee,
  };
}

export function formatCalorieBalance(balance: number): string {
  const abs = Math.abs(Math.round(balance));
  const formatted = abs.toLocaleString();
  if (balance < 0) return `-${formatted} kcal`;
  if (balance > 0) return `+${formatted} kcal`;
  return "On target";
}
