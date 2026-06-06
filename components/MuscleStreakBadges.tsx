"use client";

import { Apple, Dumbbell, Flame, Scale } from "lucide-react";
import type { DailyMuscleStatus, MuscleTask } from "@/lib/muscle-streak-types";
import { MUSCLE_TASK_META } from "@/lib/muscle-streak-types";
import { cn } from "@/lib/utils";

const TASK_ICONS: Record<MuscleTask, typeof Dumbbell> = {
  workout: Dumbbell,
  weight: Scale,
  meal: Apple,
};

const TASKS: MuscleTask[] = ["workout", "weight", "meal"];

export function MuscleStreakBadges({
  status,
  compact = false,
}: {
  status: DailyMuscleStatus;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "flex-wrap gap-3")}>
      {status.streak_days > 0 && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border",
            compact ? "px-2 py-1" : "gap-2 px-3 py-1.5",
            status.all_complete
              ? "border-orange-400/60 bg-orange-500/15 shadow-[0_0_20px_rgba(251,146,60,0.25)]"
              : "border-orange-500/30 bg-orange-500/10"
          )}
        >
          <Flame
            className={cn(
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
              "text-orange-400",
              status.all_complete && "animate-pulse"
            )}
          />
          <span
            className={cn(
              "font-bold tabular-nums text-orange-300",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {status.streak_days}
          </span>
          {!compact && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/80">
              Day Streak
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
        {TASKS.map((task) => {
          const done = status.today[task];
          const Icon = TASK_ICONS[task];
          const meta = MUSCLE_TASK_META[task];
          return (
            <div
              key={task}
              title={`${meta.label}${done ? " — done today" : " — not yet today"}`}
              className={cn(
                "group relative flex items-center rounded-full transition-all duration-300",
                compact ? "p-0.5" : "gap-2 px-2.5 py-1.5",
                done
                  ? "bg-[#a3e635]/15 ring-1 ring-[#a3e635]/40"
                  : "bg-zinc-900/80 opacity-55"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border transition-all duration-300",
                  compact ? "h-6 w-6" : "h-7 w-7",
                  done
                    ? "border-[#a3e635] bg-[#a3e635] text-black shadow-[0_0_14px_rgba(163,230,53,0.45)]"
                    : "border-zinc-700 bg-zinc-900 text-zinc-500"
                )}
              >
                <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.2} />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "hidden text-[10px] font-bold uppercase tracking-wider sm:inline",
                    done ? "text-[#d9f99d]" : "text-zinc-500"
                  )}
                >
                  {meta.shortLabel}
                </span>
              )}
              {done && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#a3e635] ring-2 ring-black" />
              )}
            </div>
          );
        })}

        <div
          className={cn(
            "rounded-full font-bold tabular-nums tracking-wider",
            compact ? "px-1.5 py-0.5 text-[9px]" : "ml-1 px-2.5 py-1 text-[10px]",
            status.all_complete
              ? "bg-[#a3e635] text-black"
              : "bg-zinc-900 text-zinc-400"
          )}
        >
          {status.completed_count}/3
        </div>
      </div>
    </div>
  );
}
