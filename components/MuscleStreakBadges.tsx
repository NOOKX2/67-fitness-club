"use client";

import { Apple, Dumbbell, Flame } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import type { DailyMuscleStatus, MuscleTask } from "@/lib/muscle-streak-types";
import { MUSCLE_TASKS } from "@/lib/muscle-streak-types";
import { cn } from "@/lib/utils";

const TASK_LABEL_KEYS: Record<MuscleTask, { label: string; short: string }> = {
  workout: { label: "muscle.workout", short: "muscle.lift" },
  meal: { label: "muscle.meal", short: "muscle.fuel" },
};

const TASK_ICONS: Record<MuscleTask, typeof Dumbbell> = {
  workout: Dumbbell,
  meal: Apple,
};

export function MuscleStreakBadges({
  status,
  compact = false,
}: {
  status: DailyMuscleStatus;
  compact?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "flex-wrap gap-3")}>
      {status.streak_days > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border",
            compact ? "px-2 py-1" : "gap-2 px-3 py-1.5",
            status.all_complete
              ? "border-[#6B93B8]/60 bg-[#6B93B8]/15 shadow-[0_0_20px_rgba(107,147,184,0.25)]"
              : "border-[#6B93B8]/30 bg-[#6B93B8]/10"
          )}
        >
          <Flame
            className={cn(
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              "text-[#A8C5DC]",
              status.all_complete && "animate-pulse"
            )}
          />
          <span
            className={cn(
              "font-bold tabular-nums text-[#6B93B8]",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {status.streak_days}
          </span>
          {!compact && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8C5DC]/80">
              {t("muscle.dayStreak")}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex items-center rounded-full border border-zinc-800 bg-zinc-950/80",
          compact ? "gap-1 px-1.5 py-1" : "gap-2 px-2 py-2"
        )}
      >
        {MUSCLE_TASKS.map((task) => {
          const done = status.today[task];
          const Icon = TASK_ICONS[task];
          const labels = TASK_LABEL_KEYS[task];
          return (
            <div
              key={task}
              title={`${t(labels.label)}${done ? t("muscle.doneToday") : t("muscle.notYetToday")}`}
              className={cn(
                "group relative flex items-center rounded-full transition-all duration-300",
                compact ? "p-0.5" : "gap-2 px-2.5 py-1.5",
                done
                  ? "bg-[#6B93B8]/15 ring-1 ring-[#6B93B8]/40"
                  : "bg-zinc-900/80 opacity-55"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border transition-all duration-300",
                  compact ? "h-6 w-6" : "h-7 w-7",
                  done
                    ? "border-[#6B93B8] bg-[#6B93B8] text-white shadow-[0_0_14px_rgba(107,147,184,0.45)]"
                    : "border-zinc-700 bg-zinc-900 text-zinc-500"
                )}
              >
                <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.2} />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "hidden text-[10px] font-bold uppercase tracking-wider sm:inline",
                    done ? "text-[#A8C5DC]" : "text-zinc-500"
                  )}
                >
                  {t(labels.short)}
                </span>
              )}
              {done && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#6B93B8] ring-2 ring-black" />
              )}
            </div>
          );
        })}

        <div
          className={cn(
            "rounded-full font-bold tabular-nums tracking-wider",
            compact ? "px-1.5 py-0.5 text-[9px]" : "ml-1 px-2.5 py-1 text-[10px]",
            status.all_complete
              ? "bg-[#6B93B8] text-white"
              : "bg-zinc-900 text-zinc-400"
          )}
        >
          {status.completed_count}/2
        </div>
      </div>
    </div>
  );
}
