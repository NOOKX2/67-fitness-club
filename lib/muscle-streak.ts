import { dateKeyFromIso, localDateKey, localDayRange } from "./date-utils";
import { getDb } from "./db";
import type { DailyMuscleStatus, MuscleTask } from "./muscle-streak-types";

const TASKS: MuscleTask[] = ["workout", "weight", "meal"];

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDays(dateKey: string, delta: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + delta);
  return localDateKey(d);
}

function computeStreak(fullDayKeys: Set<string>): number {
  if (fullDayKeys.size === 0) return 0;

  const today = localDateKey(new Date());
  const yesterday = addDays(today, -1);
  let cursor = fullDayKeys.has(today) ? today : fullDayKeys.has(yesterday) ? yesterday : "";

  if (!cursor) return 0;

  let streak = 0;
  while (fullDayKeys.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

async function getRecentDateSets(userId: string) {
  const db = await getDb();
  const lookbackStart = localDayRange(addDays(localDateKey(new Date()), -90)).start;

  const [workoutLogs, cardioLogs, weightLogs, mealLogs] = await Promise.all([
    db
      .collection("workout_logs")
      .find({ user_id: userId, timestamp: { $gte: lookbackStart } })
      .project({ timestamp: 1, _id: 0 })
      .toArray(),
    db
      .collection("cardio_logs")
      .find({ user_id: userId, timestamp: { $gte: lookbackStart } })
      .project({ timestamp: 1, _id: 0 })
      .toArray(),
    db
      .collection("weight_tracking")
      .find({ user_id: userId, date: { $gte: lookbackStart } })
      .project({ date: 1, _id: 0 })
      .toArray(),
    db
      .collection("meal_submissions_v2")
      .find({ user_id: userId, submitted_at: { $gte: lookbackStart } })
      .project({ submitted_at: 1, _id: 0 })
      .toArray(),
  ]);

  const workoutDates = new Set([
    ...workoutLogs.map((log) => dateKeyFromIso(String(log.timestamp))),
    ...cardioLogs.map((log) => dateKeyFromIso(String(log.timestamp))),
  ]);
  const weightDates = new Set(
    weightLogs.map((log) => dateKeyFromIso(String(log.date)))
  );
  const mealDates = new Set(
    mealLogs.map((log) => dateKeyFromIso(String(log.submitted_at)))
  );

  return { workoutDates, weightDates, mealDates };
}

export async function getDailyMuscleStatus(userId: string): Promise<DailyMuscleStatus> {
  const today = localDateKey(new Date());
  const { workoutDates, weightDates, mealDates } = await getRecentDateSets(userId);

  const todayStatus: Record<MuscleTask, boolean> = {
    workout: workoutDates.has(today),
    weight: weightDates.has(today),
    meal: mealDates.has(today),
  };

  const fullDayKeys = new Set<string>();
  for (const key of workoutDates) {
    if (weightDates.has(key) && mealDates.has(key)) {
      fullDayKeys.add(key);
    }
  }

  const completed_count = TASKS.filter((task) => todayStatus[task]).length;

  return {
    today: todayStatus,
    completed_count,
    all_complete: completed_count === TASKS.length,
    streak_days: computeStreak(fullDayKeys),
  };
}

export type { DailyMuscleStatus, MuscleTask } from "./muscle-streak-types";
