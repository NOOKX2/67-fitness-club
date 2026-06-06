"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Flame } from "lucide-react";
import { MuscleStreakBadges } from "@/components/MuscleStreakBadges";
import {
  MUSCLE_TASK_META,
  patchDailyMuscleStatus,
  type DailyMuscleStatus,
  type MuscleTask,
} from "@/lib/muscle-streak-types";
import { cn } from "@/lib/utils";

type RewardState = {
  task: MuscleTask;
  status: DailyMuscleStatus;
};

type MuscleStreakContextValue = {
  status: DailyMuscleStatus;
  celebrateMuscleTask: (task: MuscleTask) => boolean;
};

const MuscleStreakContext = createContext<MuscleStreakContextValue | null>(null);

function BowRibbon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 72"
      className={cn("h-14 w-24", className)}
      aria-hidden
    >
      <path
        d="M8 18 C8 8 28 4 38 16 L60 28 L82 16 C92 4 112 8 112 18 C112 28 96 34 82 30 L60 42 L38 30 C24 34 8 28 8 18 Z"
        fill="#a3e635"
      />
      <circle cx="60" cy="28" r="8" fill="#d9f99d" stroke="#84cc16" strokeWidth="2" />
      <path
        d="M52 36 L48 68 L56 40 L60 68 L64 40 L72 68 L68 36"
        fill="#84cc16"
        opacity="0.9"
      />
      <path
        d="M20 22 C14 30 10 42 12 54 M100 22 C106 30 110 42 108 54"
        fill="none"
        stroke="#a3e635"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function MuscleRewardBow({
  reward,
  onDone,
}: {
  reward: RewardState;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const meta = MUSCLE_TASK_META[reward.task];
  const { status } = reward;
  const remaining = 3 - status.completed_count;

  useEffect(() => {
    const enter = window.requestAnimationFrame(() => setVisible(true));
    const hideTimer = window.setTimeout(() => setVisible(false), 3200);
    const doneTimer = window.setTimeout(onDone, 3600);
    return () => {
      window.cancelAnimationFrame(enter);
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone, reward.task]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-20 z-[100] flex justify-center px-4 transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      )}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border px-5 pb-5 pt-3 text-center shadow-2xl transition-transform duration-500",
          status.all_complete
            ? "border-[#a3e635]/50 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_40px_rgba(163,230,53,0.25)]"
            : "border-zinc-700 bg-zinc-950",
          visible ? "scale-100" : "scale-95"
        )}
      >
        <div className="flex justify-center">
          <BowRibbon />
        </div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3e635]">
          Muscle Reward
        </p>
        <p className="mt-2 text-lg font-bold uppercase text-white">
          +1 {meta.shortLabel} Collected
        </p>
        <p className="mt-1 text-sm text-zinc-400">{meta.label} logged today</p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-4xl font-black tabular-nums text-white">
            {status.completed_count}
            <span className="text-2xl text-zinc-500">/3</span>
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Today&apos;s Progress
            </p>
            {status.all_complete ? (
              <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-orange-300">
                <Flame className="h-4 w-4" />
                Full day · {status.streak_days} day streak
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-zinc-300">
                {remaining} more to complete today
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <MuscleStreakBadges status={status} compact />
        </div>
      </div>
    </div>
  );
}

export function MuscleStreakProvider({
  initialStatus,
  children,
}: {
  initialStatus: DailyMuscleStatus;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [reward, setReward] = useState<RewardState | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const celebrateMuscleTask = useCallback((task: MuscleTask) => {
    let celebrated = false;
    setStatus((prev) => {
      if (prev.today[task]) return prev;
      celebrated = true;
      const next = patchDailyMuscleStatus(prev, task);
      setReward({ task, status: next });
      return next;
    });
    return celebrated;
  }, []);

  const value = useMemo(
    () => ({ status, celebrateMuscleTask }),
    [status, celebrateMuscleTask]
  );

  return (
    <MuscleStreakContext.Provider value={value}>
      {children}
      {reward && (
        <MuscleRewardBow reward={reward} onDone={() => setReward(null)} />
      )}
    </MuscleStreakContext.Provider>
  );
}

export function useMuscleReward() {
  const ctx = useContext(MuscleStreakContext);
  if (!ctx) {
    return {
      celebrateMuscleTask: (_task: MuscleTask) => false,
    };
  }
  return { celebrateMuscleTask: ctx.celebrateMuscleTask };
}

export function useMuscleStreakStatus() {
  const ctx = useContext(MuscleStreakContext);
  return ctx?.status ?? null;
}
