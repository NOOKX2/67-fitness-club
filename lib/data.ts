import { v4 as uuidv4 } from "uuid";
import { normalizeProgramCardio, type ProgramCardio } from "@/lib/program-cardio";
import { ObjectId } from "mongodb";
import { normalizeDateOnly } from "./access";
import { profilePhotoStreamPath } from "./profile-photo-storage";
import { dateKeyFromIso, localDateKey, localDayRange } from "./date-utils";
import { getDb } from "./db";
import { progressPhotoStreamPath, readProgressPhotoAsDataUrl } from "./progress-photo-storage";
import { averageMealRating } from "./nutrition-utils";
import {
  computeProgressJourneyStats,
  type ProgressJourneyStats as JourneyStats,
} from "./progress-journey";
import {
  ensureCoaches,
  serializeCoach,
} from "./coach-utils";

const DEFAULT_EXERCISE_IMAGE =
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxneW0lMjB3b3Jrb3V0JTIwYmFyYmVsbHxlbnwwfHx8YmxhY2tfYW5kX3doaXRlfDE3ODA0OTQ2MjR8MA&ixlib=rb-4.1.0&q=85";

export type NutritionLimits = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type DailyNutritionScore = {
  date: string;
  dayLabel: string;
  score: number | null;
};

export type MealSubmission = {
  id: string;
  meal_number: number;
  custom_name?: string;
  description?: string;
  photo_base64?: string;
  weight?: string;
  submitted_at: string;
  coach_reviewed: boolean;
  coach_rating?: number;
  coach_feedback?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  user_name?: string;
};

export type ExerciseDemoVideo = {
  id: string;
  video_url?: string;
  has_uploaded_file?: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  target_sets: number;
  target_reps: string;
  image_url: string;
  demo_video_id?: string | null;
  demo_video?: ExerciseDemoVideo | null;
};

export type { ProgramCardio };

export type WorkoutDay = {
  day: number;
  exercises: WorkoutExercise[];
  cardio?: ProgramCardio | null;
};

export type WorkoutSetEntry = {
  weight: string;
  reps: string;
};

export type WorkoutLog = {
  id?: string;
  exercise_id: string;
  exercise_name?: string;
  actual_weight: string;
  actual_reps: string;
  sets?: WorkoutSetEntry[];
  timestamp?: string;
};

export type CardioLog = {
  duration_minutes: string;
  distance_km: string;
  calories_burned: string;
};

export type WeightEntry = { weight: number; height?: number; date: string };

export type ProgressPhoto = {
  id: string;
  photo_base64?: string;
  photo_url?: string;
  weight?: number;
  notes?: string;
  date?: string;
};

export type Coach = {
  id: string;
  name: string;
  profile_image_url: string;
  is_online: boolean;
};

export type Message = {
  id: string;
  sender: string;
  content: string;
  attachment_base64?: string;
  timestamp: string;
};

export type WeeklyReport = {
  id: string;
  user_id: string;
  week_number: number;
  report_text: string;
  created_at: string;
  updated_at?: string;
};

export type LiftRecord = {
  id: string;
  exercise_name: string;
  weight_lifted: number;
  verification_status: string;
  submitted_at?: string;
  verified_at?: string;
  rejected_at?: string;
};

export type AdminStats = {
  total_clients: number;
  mrr: number;
  churn_rate: number;
};

export type AdminClient = {
  id: string;
  email: string;
  name: string;
  tier_level: string;
  created_at?: string;
  assigned_meal_plan?: string;
  gender?: string | null;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
  tdee?: number | null;
};

export type { ProgressJourneyStats } from "./progress-journey";

export type AdminActivity = {
  name: string;
  email: string;
  created_at: string;
};

export type PendingLift = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  exercise_name: string;
  weight_lifted: number;
  submitted_at: string;
};

export type FormCheckSubmission = {
  id: string;
  user_id: string;
  user_name?: string;
  exercise_id?: string;
  exercise_name?: string;
  week?: number;
  day?: number;
  video_base64?: string;
  video_file_id?: string;
  feedback_text?: string;
  status: string;
  submitted_at?: string;
  reviewed_at?: string;
};

export type ExerciseVideo = {
  id: string;
  name: string;
  video_base64?: string;
  video_url?: string;
  video_file_id?: string;
  tags?: string[];
  created_at?: string;
};

export type ProgramExercise = {
  id: string;
  name: string;
  target_sets: number;
  target_reps: string;
  demo_video_id?: string | null;
};

export type ProgramTemplate = {
  id?: string;
  track: string;
  day: number;
  exercises: ProgramExercise[];
  cardio?: ProgramCardio | null;
};

function defaultWeek(week: number) {
  return {
    id: uuidv4(),
    week,
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      exercises: Array.from({ length: 4 }, (_, j) => ({
        id: uuidv4(),
        name: `Exercise ${j + 1} Day ${i + 1}`,
        target_sets: 3,
        target_reps: "8-12",
        image_url: DEFAULT_EXERCISE_IMAGE,
        video_base64: "",
        demo_video_id: null,
      })),
    })),
  };
}

export async function getRegistrationEnabled(): Promise<boolean> {
  const db = await getDb();
  const count = await db.collection("users").countDocuments({});
  return count === 0;
}

export async function getMealsForUser(
  userId: string,
  date?: string
): Promise<MealSubmission[]> {
  const db = await getDb();
  const query: Record<string, unknown> = { user_id: userId };
  if (date) {
    const { start, end } = localDayRange(date);
    query.submitted_at = { $gte: start, $lt: end };
  }
  const meals = await db
    .collection("meal_submissions_v2")
    .find(query)
    .project({ _id: 0 })
    .sort({ submitted_at: -1 })
    .toArray();
  return meals.map((m) => ({
    id: String(m.id),
    meal_number: Number(m.meal_number ?? 1),
    custom_name: m.custom_name ? String(m.custom_name) : undefined,
    description: m.description ? String(m.description) : undefined,
    photo_base64: m.photo_base64 ? String(m.photo_base64) : undefined,
    weight: m.weight != null && m.weight !== "" ? String(m.weight) : undefined,
    submitted_at: String(m.submitted_at ?? ""),
    coach_reviewed: Boolean(m.coach_reviewed),
    coach_rating:
      m.coach_rating != null && m.coach_rating !== ""
        ? Number(m.coach_rating)
        : undefined,
    coach_feedback: m.coach_feedback ? String(m.coach_feedback) : undefined,
    protein:
      m.protein != null && m.protein !== "" ? Number(m.protein) : undefined,
    carbs: m.carbs != null && m.carbs !== "" ? Number(m.carbs) : undefined,
    fat: m.fat != null && m.fat !== "" ? Number(m.fat) : undefined,
    user_name: m.user_name ? String(m.user_name) : undefined,
  }));
}

export async function getNutritionScoreTrend(
  userId: string,
  days = 7,
  endDate?: string
): Promise<DailyNutritionScore[]> {
  const db = await getDb();
  const end = new Date();
  if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    const [y, m, d] = endDate.split("-").map(Number);
    end.setFullYear(y, m - 1, d);
  }
  end.setHours(0, 0, 0, 0);
  const rangeStart = new Date(end);
  rangeStart.setDate(end.getDate() - (days - 1));
  const { start: queryStart } = localDayRange(localDateKey(rangeStart));
  const { end: queryEnd } = localDayRange(localDateKey(end));
  const todayKey = localDateKey(new Date());
  const selectedKey = localDateKey(end);

  const rawMeals = await db
    .collection("meal_submissions_v2")
    .find({
      user_id: userId,
      submitted_at: {
        $gte: queryStart,
        $lt: queryEnd,
      },
    })
    .project({ _id: 0, submitted_at: 1, coach_reviewed: 1, coach_rating: 1 })
    .toArray();

  const mealsByDate = new Map<string, Array<{ coach_reviewed: boolean; coach_rating?: number }>>();
  for (const meal of rawMeals) {
    const dateKey = dateKeyFromIso(String(meal.submitted_at));
    const bucket = mealsByDate.get(dateKey) ?? [];
    bucket.push({
      coach_reviewed: Boolean(meal.coach_reviewed),
      coach_rating:
        meal.coach_rating != null && meal.coach_rating !== ""
          ? Number(meal.coach_rating)
          : undefined,
    });
    mealsByDate.set(dateKey, bucket);
  }

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(rangeStart);
    day.setDate(rangeStart.getDate() + index);
    const dateKey = localDateKey(day);
    const dayMeals = mealsByDate.get(dateKey) ?? [];
    return {
      date: dateKey,
      dayLabel:
        dateKey === todayKey
          ? "Today"
          : index === days - 1
            ? `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`
            : `Day ${index + 1}`,
      score: averageMealRating(dayMeals),
    };
  });
}

function trackForTier(tierLevel?: string): string {
  const map: Record<string, string> = {
    "Tier 1": "Fat Loss",
    "Tier 2": "Muscle Gain",
    "Tier 3": "Maintenance",
  };
  return map[tierLevel ?? ""] ?? "Fat Loss";
}

function toWorkoutExercises(exercises: ProgramExercise[]): WorkoutExercise[] {
  return exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    target_sets: ex.target_sets,
    target_reps: ex.target_reps,
    image_url: DEFAULT_EXERCISE_IMAGE,
    demo_video_id: ex.demo_video_id ?? null,
  }));
}

async function attachDemoVideos(
  db: Awaited<ReturnType<typeof getDb>>,
  exercises: WorkoutExercise[]
): Promise<WorkoutExercise[]> {
  const videoIds = [
    ...new Set(
      exercises
        .map((ex) => ex.demo_video_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (!videoIds.length) return exercises;

  const videos = await db
    .collection("exercise_videos")
    .find({ id: { $in: videoIds } })
    .project({ _id: 0, id: 1, video_url: 1, video_file_id: 1, video_base64: 1 })
    .toArray();

  const videoMap = new Map(
    videos.map((v) => [
      String(v.id),
      {
        id: String(v.id),
        video_url: v.video_url ? String(v.video_url) : undefined,
        has_uploaded_file: Boolean(v.video_file_id || v.video_base64),
      },
    ])
  );

  return exercises.map((ex) => {
    if (!ex.demo_video_id) return ex;
    const demo_video = videoMap.get(ex.demo_video_id) ?? null;
    return { ...ex, demo_video };
  });
}

export async function getWorkoutPageData(
  userId: string,
  userEmail: string,
  week: number,
  day: number
): Promise<{
  days: WorkoutDay[];
  logs: Record<string, WorkoutLog>;
  cardioLog: CardioLog;
}> {
  const db = await getDb();

  const existing = await db
    .collection("workouts")
    .findOne({ week }, { projection: { _id: 0 } });
  const workout =
    existing ??
    (await (async () => {
      const created = defaultWeek(week);
      await db.collection("workouts").insertOne(created);
      return created;
    })());

  let days = (workout.days as WorkoutDay[]) ?? [];

  let customProgram = await db.collection("custom_programs").findOne(
    {
      $or: [
        { user_email: userEmail, week, day },
        { client_email: userEmail, week, day },
      ],
    },
    { projection: { _id: 0 } }
  );
  if (!customProgram && week === 1) {
    customProgram = await db.collection("custom_programs").findOne(
      {
        $or: [
          { user_email: userEmail, day, week: { $exists: false } },
          { client_email: userEmail, day, week: { $exists: false } },
        ],
      },
      { projection: { _id: 0 } }
    );
  }

  let dayCardio: ProgramCardio | null = null;

  if (customProgram) {
    dayCardio = normalizeProgramCardio(customProgram.cardio);
    if (customProgram.exercises?.length) {
      const customExercises = await attachDemoVideos(
        db,
        toWorkoutExercises(customProgram.exercises as ProgramExercise[])
      );
      days = days.map((d) =>
        d.day === day ? { ...d, exercises: customExercises, cardio: dayCardio } : d
      );
    } else {
      days = days.map((d) =>
        d.day === day ? { ...d, cardio: dayCardio } : d
      );
    }
  } else {
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const track = trackForTier(String(user?.tier_level ?? ""));
    const template = await db.collection("program_templates").findOne(
      { track, day },
      { projection: { _id: 0 } }
    );
    if (template) {
      dayCardio = normalizeProgramCardio(template.cardio);
      if (template.exercises?.length) {
        const templateExercises = await attachDemoVideos(
          db,
          toWorkoutExercises(template.exercises as ProgramExercise[])
        );
        days = days.map((d) =>
          d.day === day
            ? { ...d, exercises: templateExercises, cardio: dayCardio }
            : d
        );
      } else {
        days = days.map((d) =>
          d.day === day ? { ...d, cardio: dayCardio } : d
        );
      }
    }
  }

  const logDocs = await db
    .collection("workout_logs")
    .find({ user_id: userId, week, day })
    .project({ _id: 0 })
    .toArray();

  const logs: Record<string, WorkoutLog> = {};
  for (const l of logDocs) {
    const sets = Array.isArray(l.sets)
      ? (l.sets as WorkoutSetEntry[]).map((set) => ({
          weight: String(set.weight ?? ""),
          reps: String(set.reps ?? ""),
        }))
      : undefined;
    logs[String(l.exercise_id)] = {
      exercise_id: String(l.exercise_id),
      actual_weight: String(l.actual_weight ?? ""),
      actual_reps: String(l.actual_reps ?? ""),
      sets: sets?.length ? sets : undefined,
    };
  }

  const cardioDoc = await db.collection("cardio_logs").findOne(
    { user_id: userId, week, day },
    { projection: { _id: 0 } }
  );
  const cardioLog: CardioLog = {
    duration_minutes: String(cardioDoc?.duration_minutes ?? ""),
    distance_km: String(cardioDoc?.distance_km ?? ""),
    calories_burned: String(cardioDoc?.calories_burned ?? ""),
  };

  return { days, logs, cardioLog };
}

export async function getWeightHistory(userId: string): Promise<WeightEntry[]> {
  const db = await getDb();
  const entries = await db
    .collection("weight_tracking")
    .find({ user_id: userId })
    .project({ _id: 0 })
    .sort({ date: 1 })
    .toArray();
  return entries as WeightEntry[];
}

export async function getUserHeight(userId: string): Promise<number | null> {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  return doc?.height != null ? Number(doc.height) : null;
}

export async function getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const db = await getDb();
  const photos = await db
    .collection("progress_photos")
    .find({ user_id: userId })
    .project({ _id: 0 })
    .sort({ date: 1 })
    .toArray();

  return Promise.all(
    photos.map(async (p) => {
      const id = String(p.id);
      let photo_base64: string | undefined;

      if (p.photo_file_id) {
        photo_base64 =
          (await readProgressPhotoAsDataUrl(db, String(p.photo_file_id))) ??
          undefined;
      } else if (p.photo_base64) {
        photo_base64 = String(p.photo_base64);
      }

      return {
        id,
        photo_base64,
        photo_url: photo_base64 ? undefined : progressPhotoStreamPath(id),
        weight:
          p.weight != null && p.weight !== "" ? Number(p.weight) : undefined,
        notes: p.notes ? String(p.notes) : undefined,
        date: p.date ? String(p.date) : undefined,
      };
    })
  );
}

export async function getCoaches(): Promise<Coach[]> {
  const db = await getDb();
  const coaches = await ensureCoaches(db);
  return coaches.map((coach) => serializeCoach(coach));
}

export async function getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
  const db = await getDb();
  const reports = await db
    .collection("weekly_reports")
    .find({ user_id: userId })
    .project({ _id: 0 })
    .sort({ week_number: -1 })
    .toArray();
  return reports.map((report) => ({
    id: String(report.id),
    user_id: String(report.user_id),
    week_number: Number(report.week_number),
    report_text: String(report.report_text ?? ""),
    created_at: String(report.created_at ?? ""),
    updated_at: report.updated_at ? String(report.updated_at) : undefined,
  }));
}

export async function getMessages(userId: string, coachId: string): Promise<Message[]> {
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({
      $or: [
        { user_id: userId, coach_id: coachId },
        { user_id: coachId, coach_id: userId },
      ],
    })
    .project({ _id: 0 })
    .sort({ timestamp: 1 })
    .toArray();
  return messages as Message[];
}

export async function getLiftRecords(userId: string): Promise<LiftRecord[]> {
  const db = await getDb();
  const lifts = await db
    .collection("lift_progress")
    .find({ user_id: userId })
    .project({ _id: 0 })
    .toArray();
  return lifts.map((l) => ({
    id: String(l.id),
    exercise_name: String(l.exercise_name),
    weight_lifted: Number(l.weight_lifted),
    verification_status: String(l.verification_status ?? "Pending"),
    submitted_at: l.submitted_at ? String(l.submitted_at) : undefined,
    verified_at: l.verified_at ? String(l.verified_at) : undefined,
    rejected_at: l.rejected_at ? String(l.rejected_at) : undefined,
  }));
}

export async function getUserProfilePhotoUrl(userId: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!doc) return null;
  if (doc.profile_photo_id) {
    return profilePhotoStreamPath(String(doc.profile_photo_id));
  }
  if (typeof doc.profile_image === "string" && doc.profile_image) {
    return doc.profile_image;
  }
  return null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDb();
  const total_clients = await db.collection("users").countDocuments({ role: "user" });
  const tier_3_count = await db.collection("users").countDocuments({ tier_level: "Tier 3" });
  return {
    total_clients,
    mrr: tier_3_count * 299,
    churn_rate: 2.5,
  };
}

export async function getAdminRecentActivity(): Promise<AdminActivity[]> {
  const db = await getDb();
  const recent = await db
    .collection("users")
    .find({ role: "user" })
    .project({ _id: 0, name: 1, email: 1, created_at: 1 })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();
  return recent.map((r) => ({
    name: String(r.name),
    email: String(r.email),
    created_at: String(r.created_at ?? ""),
  }));
}

export async function getAdminClients(): Promise<AdminClient[]> {
  const db = await getDb();
  const clients = await db
    .collection("users")
    .find({ role: "user" })
    .sort({ created_at: -1 })
    .toArray();
  return clients.map((c) => ({
    id: String(c._id),
    email: String(c.email),
    name: String(c.name),
    tier_level: String(c.tier_level ?? "Tier 1"),
    created_at: c.created_at ? String(c.created_at) : undefined,
    assigned_meal_plan: c.assigned_meal_plan ? String(c.assigned_meal_plan) : undefined,
    gender: c.gender ? String(c.gender) : null,
    access_starts_at: normalizeDateOnly(
      c.access_starts_at ? String(c.access_starts_at) : null
    ),
    access_expires_at: normalizeDateOnly(
      c.access_expires_at ? String(c.access_expires_at) : null
    ),
    tdee: c.tdee != null && c.tdee !== "" ? Number(c.tdee) : null,
  }));
}

export async function getUserTdee(userId: string): Promise<number | null> {
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { tdee: 1 } });
  if (user?.tdee == null || user.tdee === "") return null;
  const value = Number(user.tdee);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function getProgressJourneyStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<JourneyStats> {
  const db = await getDb();
  const tdee = await getUserTdee(userId);
  const start = normalizeDateOnly(startDate) ?? startDate;
  const end = normalizeDateOnly(endDate) ?? endDate;
  const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start];
  const { start: queryStart } = localDayRange(rangeStart);
  const { end: queryEnd } = localDayRange(rangeEnd);

  const [workoutLogs, meals] = await Promise.all([
    db
      .collection("workout_logs")
      .find({
        user_id: userId,
        timestamp: { $gte: queryStart, $lt: queryEnd },
      })
      .project({ _id: 0, actual_reps: 1, sets: 1, timestamp: 1 })
      .toArray(),
    db
      .collection("meal_submissions_v2")
      .find({
        user_id: userId,
        submitted_at: { $gte: queryStart, $lt: queryEnd },
        coach_reviewed: true,
      })
      .project({ _id: 0, protein: 1, carbs: 1, fat: 1, submitted_at: 1 })
      .toArray(),
  ]);

  return computeProgressJourneyStats({
    tdee,
    startDate: rangeStart,
    endDate: rangeEnd,
    workoutLogs: workoutLogs.map((log) => ({
      actual_reps: String(log.actual_reps ?? ""),
      sets: Array.isArray(log.sets)
        ? (log.sets as Array<{ reps?: string }>).map((set) => ({
            weight: "",
            reps: String(set.reps ?? ""),
          }))
        : undefined,
      timestamp: log.timestamp ? String(log.timestamp) : undefined,
    })),
    meals: meals.map((meal) => ({
      protein: meal.protein != null ? Number(meal.protein) : undefined,
      carbs: meal.carbs != null ? Number(meal.carbs) : undefined,
      fat: meal.fat != null ? Number(meal.fat) : undefined,
      submitted_at: meal.submitted_at ? String(meal.submitted_at) : undefined,
    })),
  });
}

export async function getPendingLifts(): Promise<PendingLift[]> {
  const db = await getDb();
  const lifts = await db
    .collection("lift_progress")
    .find({ verification_status: "Pending" })
    .project({ _id: 0 })
    .sort({ submitted_at: -1 })
    .toArray();
  return lifts.map((l) => ({
    id: String(l.id),
    user_id: String(l.user_id),
    user_name: String(l.user_name ?? ""),
    user_email: String(l.user_email ?? ""),
    exercise_name: String(l.exercise_name),
    weight_lifted: Number(l.weight_lifted),
    submitted_at: String(l.submitted_at ?? ""),
  }));
}

export async function getPendingFormChecks(): Promise<FormCheckSubmission[]> {
  const db = await getDb();
  const subs = await db
    .collection("form_checks")
    .find({ status: "pending" })
    .project({ _id: 0, video_base64: 0 })
    .toArray();
  return subs as FormCheckSubmission[];
}

export async function getFormChecksForUserWeekDay(
  userId: string,
  week: number,
  day: number
): Promise<FormCheckSubmission[]> {
  const db = await getDb();
  const subs = await db
    .collection("form_checks")
    .find({ user_id: userId, week, day })
    .project({ _id: 0, video_base64: 0 })
    .toArray();
  return subs as FormCheckSubmission[];
}

export async function getClientFormChecks(
  userId: string,
  week: number,
  day: number
): Promise<FormCheckSubmission[]> {
  const db = await getDb();
  const subs = await db
    .collection("form_checks")
    .find({ user_id: userId, week, day })
    .project({ _id: 0, video_base64: 0 })
    .sort({ submitted_at: -1 })
    .toArray();
  return subs as FormCheckSubmission[];
}

export async function getExerciseVideos(): Promise<ExerciseVideo[]> {
  const db = await getDb();
  const videos = await db
    .collection("exercise_videos")
    .find({})
    .project({ _id: 0, video_base64: 0 })
    .toArray();
  return videos as ExerciseVideo[];
}

export async function getProgramTemplate(
  track: string,
  day: number
): Promise<ProgramTemplate> {
  const db = await getDb();
  const program = await db.collection("program_templates").findOne(
    { track, day },
    { projection: { _id: 0 } }
  );
  if (!program) {
    return { track, day, exercises: [], id: uuidv4() };
  }
  return {
    id: program.id ? String(program.id) : undefined,
    track: String(program.track ?? track),
    day: Number(program.day ?? day),
    exercises: (program.exercises as ProgramExercise[]) ?? [],
    cardio: normalizeProgramCardio(program.cardio),
  };
}

export async function getCustomProgram(
  clientEmail: string,
  week: number,
  day: number
): Promise<{
  exercises: ProgramExercise[];
  cardio: ProgramCardio | null;
}> {
  const db = await getDb();
  let program = await db.collection("custom_programs").findOne(
    {
      $or: [
        { client_email: clientEmail, week, day },
        { user_email: clientEmail, week, day },
      ],
    },
    { projection: { _id: 0 } }
  );
  if (!program && week === 1) {
    program = await db.collection("custom_programs").findOne(
      {
        $or: [
          { client_email: clientEmail, day, week: { $exists: false } },
          { user_email: clientEmail, day, week: { $exists: false } },
        ],
      },
      { projection: { _id: 0 } }
    );
  }
  return {
    exercises: (program?.exercises as ProgramExercise[]) ?? [],
    cardio: normalizeProgramCardio(program?.cardio),
  };
}

export async function getNutritionLimits(
  clientEmail: string
): Promise<NutritionLimits> {
  const db = await getDb();
  const doc = await db.collection("client_nutrition_limits").findOne(
    { client_email: clientEmail },
    { projection: { _id: 0, calories: 1, protein: 1, carbs: 1, fat: 1 } }
  );
  if (!doc) return {};

  return {
    calories:
      doc.calories != null && doc.calories !== ""
        ? Number(doc.calories)
        : undefined,
    protein:
      doc.protein != null && doc.protein !== ""
        ? Number(doc.protein)
        : undefined,
    carbs:
      doc.carbs != null && doc.carbs !== "" ? Number(doc.carbs) : undefined,
    fat: doc.fat != null && doc.fat !== "" ? Number(doc.fat) : undefined,
  };
}

export async function getClientWorkoutLogs(
  userId: string,
  week: number,
  day: number
): Promise<WorkoutLog[]> {
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  const email = String(user?.email ?? "");
  const { days } = await getWorkoutPageData(userId, email, week, day);
  const nameById = new Map(
    (days.find((d) => d.day === day)?.exercises ?? []).map((e) => [e.id, e.name])
  );

  const logs = await db
    .collection("workout_logs")
    .find({ user_id: userId, week, day })
    .project({ _id: 0 })
    .sort({ timestamp: -1 })
    .toArray();

  const latestByExercise = new Map<string, WorkoutLog>();
  for (const l of logs) {
    const exerciseId = String(l.exercise_id);
    if (latestByExercise.has(exerciseId)) continue;
    latestByExercise.set(exerciseId, {
      id: l.id ? String(l.id) : undefined,
      exercise_id: exerciseId,
      exercise_name: nameById.get(exerciseId),
      actual_weight: String(l.actual_weight ?? ""),
      actual_reps: String(l.actual_reps ?? ""),
      sets: Array.isArray(l.sets)
        ? (l.sets as WorkoutSetEntry[]).map((set) => ({
            weight: String(set.weight ?? ""),
            reps: String(set.reps ?? ""),
          }))
        : undefined,
      timestamp: l.timestamp ? String(l.timestamp) : undefined,
    });
  }
  return [...latestByExercise.values()];
}

export async function getNutritionMealsForUser(
  userId: string,
  date: string
): Promise<MealSubmission[]> {
  return getMealsForUser(userId, date);
}
