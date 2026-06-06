"use client";

import { useMemo } from "react";
import { NutritionHeader } from "@/components/NutritionHeader";
import { NutritionScoreChart } from "@/components/NutritionScoreChart";
import type { DailyNutritionScore, MealSubmission, NutritionLimits } from "@/lib/data";
import {
  averageMealRating,
  coachRatingStyle,
  formatMealMacros,
  limitValueClass,
  macrosToKcal,
  mealDisplayName,
  sumMealMacros,
} from "@/lib/nutrition-utils";

export function NutritionClient({
  meals,
  scoreTrend,
  limits,
  selectedDate,
  isToday,
}: {
  meals: MealSubmission[];
  scoreTrend: DailyNutritionScore[];
  limits: NutritionLimits;
  selectedDate: string;
  isToday: boolean;
}) {
  const totals = sumMealMacros(meals);
  const totalKcal = macrosToKcal(totals);
  const overallScore = averageMealRating(meals);
  const overallStyle =
    overallScore != null ? coachRatingStyle(overallScore) : null;
  const chartScores = useMemo(() => {
    const trend = scoreTrend.map((day) => ({ ...day }));
    if (trend.length > 0 && overallScore != null) {
      trend[trend.length - 1] = {
        ...trend[trend.length - 1],
        score: overallScore,
      };
    }
    return trend;
  }, [scoreTrend, overallScore]);
  const hasMacroTotals =
    totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;
  const hasLimits =
    (limits.calories ?? 0) > 0 ||
    (limits.protein ?? 0) > 0 ||
    (limits.carbs ?? 0) > 0 ||
    (limits.fat ?? 0) > 0;
  const showDailyTotals = meals.length > 0 || hasLimits;

  return (
    <div className="space-y-0">
      <NutritionHeader selectedDate={selectedDate} isToday={isToday} />

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <NutritionScoreChart dailyScores={chartScores} />
      </div>

      {showDailyTotals && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Daily Totals
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 px-4 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Total Kcal
              </p>
              <p
                className={`mt-1 text-3xl font-bold ${limitValueClass(
                  totalKcal,
                  limits.calories
                )}`}
              >
                {totalKcal}
                {limits.calories ? (
                  <span className="text-sm font-normal text-zinc-500">
                    /{limits.calories}
                  </span>
                ) : null}
                <span className="ml-1 text-sm font-normal text-zinc-500">kcal</span>
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 px-4 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Overall Food Score
              </p>
              {overallScore != null && overallStyle ? (
                <p className={`mt-1 text-3xl font-bold ${overallStyle.className}`}>
                  {overallScore.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-zinc-500">/5</span>
                </p>
              ) : (
                <p className="mt-1 text-3xl font-bold text-zinc-600">—</p>
              )}
              {overallStyle && (
                <p className={`mt-1 text-xs font-semibold ${overallStyle.className}`}>
                  {overallStyle.label}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <MacroLimitBox
              label="Protein"
              consumed={totals.protein}
              limit={limits.protein}
            />
            <MacroLimitBox
              label="Carb"
              consumed={totals.carbs}
              limit={limits.carbs}
            />
            <MacroLimitBox label="Fat" consumed={totals.fat} limit={limits.fat} />
          </div>
          {!hasMacroTotals && hasLimits && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              Consumed totals update after your coach reviews meals
            </p>
          )}
          {!hasMacroTotals && !hasLimits && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              Totals update after your coach reviews meals
            </p>
          )}
        </div>
      )}

      <div className="mt-6 min-h-[200px] overflow-hidden rounded-2xl border border-zinc-800">
        {meals.length === 0 ? (
          <p className="p-8 text-center text-zinc-500">
            {isToday
              ? "No meals logged today. Tap + Add Meal to submit to your coach."
              : "No meals logged on this day."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {meals.map((m) => (
              <li key={m.id} className="flex gap-4 px-6 py-4">
                {m.photo_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo_base64}
                    alt={`Meal ${m.meal_number}`}
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs text-zinc-600">
                    No photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold uppercase text-white">
                    {mealDisplayName(m)}
                  </p>
                  {m.description && (
                    <p className="mt-1 text-sm text-zinc-400">{m.description}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">
                    {m.coach_reviewed ? "Reviewed by coach" : "Pending coach review"}
                  </p>
                  {m.coach_reviewed && formatMealMacros(m) && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {formatMealMacros(m)}
                    </p>
                  )}
                  {m.coach_reviewed && m.coach_rating != null && (
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        coachRatingStyle(m.coach_rating).className
                      }`}
                    >
                      Coach score: {m.coach_rating}/5 —{" "}
                      {coachRatingStyle(m.coach_rating).label}
                    </p>
                  )}
                  {m.coach_reviewed && m.coach_feedback && (
                    <p className="mt-1 text-sm text-zinc-300">
                      Coach comment: {m.coach_feedback}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MacroLimitBox({
  label,
  consumed,
  limit,
}: {
  label: string;
  consumed: number;
  limit?: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${limitValueClass(consumed, limit)}`}
      >
        {consumed}
        {limit ? (
          <span className="text-sm font-normal text-zinc-500">/{limit}</span>
        ) : null}
        <span className="ml-1 text-sm font-normal text-zinc-500">g</span>
      </p>
    </div>
  );
}
