import type { MealSubmission } from "./data";

const MEAL_LABELS: Record<number, string> = {
  1: "Meal 1",
  2: "Meal 2",
  3: "Meal 3",
  4: "Meal 4",
};

export function mealDisplayName(meal: MealSubmission): string {
  if (meal.custom_name?.trim()) return meal.custom_name.trim();
  return MEAL_LABELS[meal.meal_number] ?? `Meal ${meal.meal_number}`;
}

const RATING_LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Fair",
  2: "Needs work",
  1: "Poor",
};

export function sumMealMacros(
  meals: Array<{ protein?: number; carbs?: number; fat?: number }>
): { protein: number; carbs: number; fat: number } {
  return meals.reduce<{ protein: number; carbs: number; fat: number }>(
    (acc, meal) => ({
      protein: acc.protein + (meal.protein ?? 0),
      carbs: acc.carbs + (meal.carbs ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
}

export function macrosToKcal(macros: {
  protein: number;
  carbs: number;
  fat: number;
}): number {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
}

export function limitMacrosToKcal(macros: {
  protein: number;
  carbs: number;
  fat: number;
}): number {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 8;
}

export function formatMealMacros(meal: {
  protein?: number;
  carbs?: number;
  fat?: number;
}): string | null {
  const parts: string[] = [];
  if (meal.protein != null) parts.push(`P ${meal.protein}g`);
  if (meal.carbs != null) parts.push(`C ${meal.carbs}g`);
  if (meal.fat != null) parts.push(`F ${meal.fat}g`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function averageMealRating(
  meals: Array<{ coach_reviewed?: boolean; coach_rating?: number }>
): number | null {
  const ratings = meals
    .filter((meal) => meal.coach_reviewed && meal.coach_rating != null)
    .map((meal) => meal.coach_rating!);
  if (!ratings.length) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

export function limitValueClass(consumed: number, limit?: number): string {
  if (limit == null || limit <= 0) return "text-white";
  return consumed >= limit ? "text-red-400" : "text-white";
}

export function formatLimitValue(
  consumed: number,
  limit?: number,
  unit = ""
): string {
  if (limit == null || limit <= 0) {
    return `${consumed}${unit ? ` ${unit}` : ""}`;
  }
  return `${consumed}/${limit}${unit ? ` ${unit}` : ""}`;
}

export function coachRatingStyle(rating: number): {
  label: string;
  className: string;
} {
  const rounded = Math.min(5, Math.max(1, Math.round(rating)));
  const label = RATING_LABELS[rounded] ?? String(rating);
  if (rating >= 4) return { label, className: "text-[#6B93B8]" };
  if (rating >= 3) return { label, className: "text-amber-400" };
  return { label, className: "text-red-400" };
}
