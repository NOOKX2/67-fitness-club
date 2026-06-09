"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { NutritionHeader } from "@/components/NutritionHeader";
import { NutritionScoreChart } from "@/components/NutritionScoreChart";
import type { DailyNutritionScore, MealSubmission, NutritionLimits } from "@/lib/data";
import { clientCard, clientCardInner, clientSectionLabel } from "@/lib/client-ui";
import {
  averageMealRating,
  coachRatingStyle,
  formatMealMacros,
  limitValueClass,
  macrosToKcal,
  mealDisplayName,
  sumMealMacros,
} from "@/lib/nutrition-utils";
import { cn } from "@/lib/utils";

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
  const overallStyle = overallScore != null ? coachRatingStyle(overallScore) : null;
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
  const hasMacroTotals = totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;
  const hasLimits =
    (limits.calories ?? 0) > 0 ||
    (limits.protein ?? 0) > 0 ||
    (limits.carbs ?? 0) > 0 ||
    (limits.fat ?? 0) > 0;
  const showDailyTotals = meals.length > 0 || hasLimits;
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <NutritionHeader selectedDate={selectedDate} isToday={isToday} />

      {showDailyTotals && (
        <div className={cn(clientCard, "p-4 sm:p-5")}>
          <p className={clientSectionLabel}>{t("nutrition.dailyTotals")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <div className={cn(clientCardInner, "px-4 py-4 text-center")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {t("nutrition.totalKcal")}
              </p>
              <p
                className={`mt-1 text-3xl font-bold ${limitValueClass(totalKcal, limits.calories)}`}
              >
                {totalKcal}
                {limits.calories ? (
                  <span className="text-sm font-normal text-white/45"> / {limits.calories}</span>
                ) : null}
                <span className="ml-1 text-sm font-normal text-white/45">kcal</span>
              </p>
            </div>
            <div className={cn(clientCardInner, "px-4 py-4 text-center")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {t("nutrition.overallFoodScore")}
              </p>
              {overallScore != null && overallStyle ? (
                <p className={`mt-1 text-3xl font-bold ${overallStyle.className}`}>
                  {overallScore.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-white/45">/5</span>
                </p>
              ) : (
                <p className="mt-1 text-3xl font-bold text-white/25">—</p>
              )}
              {overallStyle && (
                <p className={`mt-1 text-xs font-semibold ${overallStyle.className}`}>
                  {overallStyle.label}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            <MacroLimitBox label={t("nutrition.protein")} consumed={totals.protein} limit={limits.protein} />
            <MacroLimitBox label={t("nutrition.carb")} consumed={totals.carbs} limit={limits.carbs} />
            <MacroLimitBox label={t("nutrition.fat")} consumed={totals.fat} limit={limits.fat} />
          </div>
        </div>
      )}

      <div>
        <p className={cn(clientSectionLabel, "mb-4")}>{t("nutrition.todaysMeals")}</p>
        {meals.length === 0 ? (
          <div className={cn(clientCard, "overflow-hidden")}>
            <p className="p-8 text-center text-white/45">
              {isToday ? t("nutrition.noMealsToday") : t("nutrition.noMealsDay")}
            </p>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:hidden">
              {meals.map((m) => (
                <MealGridCard key={m.id} meal={m} />
              ))}
            </ul>
            <div className={cn(clientCard, "hidden overflow-hidden lg:block")}>
              <ul className="divide-y divide-white/10">
                {meals.map((m) => (
                  <MealListRow key={m.id} meal={m} />
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className={cn(clientCard, "p-4 sm:p-5")}>
        <p className={clientSectionLabel}>{t("nutrition.foodScore7Day")}</p>
        <div className="mt-4">
          <NutritionScoreChart dailyScores={chartScores} />
        </div>
      </div>
    </div>
  );
}

function MealPhoto({ meal, className }: { meal: MealSubmission; className?: string }) {
  if (meal.photo_base64) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={meal.photo_base64} alt={`Meal ${meal.meal_number}`} className={className} />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-black/40 text-white/30",
        className
      )}
    >
      No photo
    </div>
  );
}

function MealGridCard({ meal }: { meal: MealSubmission }) {
  const ratingStyle = meal.coach_rating != null ? coachRatingStyle(meal.coach_rating) : null;

  return (
    <li className={cn(clientCard, "flex flex-col overflow-hidden p-2.5 sm:p-3")}>
      <MealPhoto
        meal={meal}
        className="aspect-square w-full rounded-lg object-cover text-[10px]"
      />
      <div className="mt-2 min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{mealDisplayName(meal)}</p>
        {meal.description ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-white/45">{meal.description}</p>
        ) : null}
        <p className="mt-1 text-[10px] text-white/35">
          {meal.coach_reviewed ? "Reviewed" : "Pending"}
        </p>
        {meal.coach_reviewed && formatMealMacros(meal) ? (
          <p className="mt-1 text-[11px] text-white/45">{formatMealMacros(meal)}</p>
        ) : null}
        {meal.coach_reviewed && meal.coach_feedback ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-white/60">{meal.coach_feedback}</p>
        ) : null}
        {meal.coach_reviewed && meal.coach_rating != null && ratingStyle ? (
          <p className={`mt-1 text-[10px] font-semibold ${ratingStyle.className}`}>
            {meal.coach_rating}/5 — {ratingStyle.label}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function MealListRow({ meal }: { meal: MealSubmission }) {
  const ratingStyle = meal.coach_rating != null ? coachRatingStyle(meal.coach_rating) : null;

  return (
    <li className="flex gap-4 px-6 py-5">
      <MealPhoto
        meal={meal}
        className="h-20 w-20 shrink-0 rounded-xl object-cover text-xs"
      />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">{mealDisplayName(meal)}</p>
        {meal.description ? (
          <p className="mt-1 text-sm text-white/45">{meal.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-white/35">
          {meal.coach_reviewed ? "Reviewed by coach" : "Pending coach review"}
        </p>
        {meal.coach_reviewed && formatMealMacros(meal) ? (
          <p className="mt-2 text-sm text-white/45">{formatMealMacros(meal)}</p>
        ) : null}
        {meal.coach_reviewed && meal.coach_feedback ? (
          <p className="mt-1 text-sm text-white/60">{meal.coach_feedback}</p>
        ) : null}
      </div>
      {meal.coach_reviewed && meal.coach_rating != null && ratingStyle ? (
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold ${ratingStyle.className}`}>
            {meal.coach_rating}/5 — {ratingStyle.label}
          </p>
        </div>
      ) : null}
    </li>
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
    <div className={cn(clientCardInner, "px-4 py-3 text-center")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${limitValueClass(consumed, limit)}`}>
        {consumed}
        {limit ? <span className="text-sm font-normal text-white/45"> / {limit}</span> : null}
        <span className="ml-1 text-sm font-normal text-white/45">g</span>
      </p>
    </div>
  );
}
