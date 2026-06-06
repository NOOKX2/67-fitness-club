import { NutritionClient } from "@/components/NutritionClient";
import {
  getMealsForUser,
  getNutritionLimits,
  getNutritionScoreTrend,
} from "@/lib/data";
import { localDateKey } from "@/lib/date-utils";
import { requireAppUser } from "@/lib/session";

function parseNutritionDate(raw?: string): string {
  const today = localDateKey(new Date());
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  if (raw > today) return today;
  return raw;
}

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const selectedDate = parseNutritionDate(params.date);
  const today = localDateKey(new Date());
  const [meals, scoreTrend, limits] = await Promise.all([
    getMealsForUser(user.id, selectedDate),
    getNutritionScoreTrend(user.id, 7, selectedDate),
    getNutritionLimits(user.email),
  ]);
  return (
    <NutritionClient
      key={selectedDate}
      meals={meals}
      scoreTrend={scoreTrend}
      limits={limits}
      selectedDate={selectedDate}
      isToday={selectedDate === today}
    />
  );
}
