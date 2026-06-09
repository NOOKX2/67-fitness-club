import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getCurrentUser, getAdminUser } from "../auth";
import { ObjectId } from "mongodb";
import { json, error, parseBody, handleAuthError } from "../api-helpers";
import { createAdminNotification } from "../admin-notifications";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxneW0lMjB3b3Jrb3V0JTIwYmFyYmVsbHxlbnwwfHx8YmxhY2tfYW5kX3doaXRlfDE3ODA0OTQ2MjR8MA&ixlib=rb-4.1.0&q=85";

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
        image_url: DEFAULT_IMAGE,
        video_base64: "",
        demo_video_id: null,
      })),
    })),
  };
}

export async function handleWorkouts(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const db = await getDb();

    if (segments[1] === "week" && segments[2] && req.method === "GET") {
      const week = parseInt(segments[2], 10);
      let workout = await db.collection("workouts").findOne({ week }, { projection: { _id: 0 } });
      if (!workout) {
        const created = defaultWeek(week);
        await db.collection("workouts").insertOne(created);
        return json(created);
      }
      return json(workout);
    }

    if (segments[1] === "log" && req.method === "POST") {
      const user = await getCurrentUser(req);
      const log = await parseBody<{
        user_id: string;
        exercise_id: string;
        week: number;
        day: number;
        actual_weight: string;
        actual_reps: string;
        sets?: Array<{ weight: string; reps: string }>;
        form_video_base64?: string;
      }>(req);
      if (log.user_id !== user.id) return error("Access denied", 403);
      const query = {
        user_id: log.user_id,
        exercise_id: log.exercise_id,
        week: log.week,
        day: log.day,
      };
      const cleanedSets =
        log.sets
          ?.map((set) => ({
            weight: String(set.weight ?? "").trim(),
            reps: String(set.reps ?? "").trim(),
          }))
          .filter((set) => set.weight || set.reps) ?? [];
      const doc = {
        id: uuidv4(),
        user_id: log.user_id,
        exercise_id: log.exercise_id,
        week: log.week,
        day: log.day,
        actual_weight:
          cleanedSets.length > 0
            ? cleanedSets[0].weight
            : String(log.actual_weight ?? ""),
        actual_reps:
          cleanedSets.length > 0
            ? cleanedSets.map((set) => set.reps).join(", ")
            : String(log.actual_reps ?? ""),
        sets: cleanedSets.length > 0 ? cleanedSets : undefined,
        form_video_base64: log.form_video_base64 ?? "",
        timestamp: new Date().toISOString(),
      };
      await db.collection("workout_logs").deleteMany(query);
      await db.collection("workout_logs").insertOne(doc);
      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(log.user_id),
      });
      await createAdminNotification(db, {
        type: "workout",
        clientId: log.user_id,
        clientName: userDoc?.name ? String(userDoc.name) : "Client",
        message: `Week ${log.week}, Day ${log.day} workout logged`,
        week: log.week,
        day: log.day,
      });
      return json(doc);
    }

    if (segments[1] === "cardio-log" && req.method === "POST") {
      const user = await getCurrentUser(req);
      const log = await parseBody<{
        user_id: string;
        week: number;
        day: number;
        duration_minutes: string;
        distance_km: string;
        calories_burned: string;
      }>(req);
      if (log.user_id !== user.id) return error("Access denied", 403);
      const query = {
        user_id: log.user_id,
        week: log.week,
        day: log.day,
      };
      const doc = {
        id: uuidv4(),
        user_id: log.user_id,
        week: log.week,
        day: log.day,
        duration_minutes: log.duration_minutes ?? "",
        distance_km: log.distance_km ?? "",
        calories_burned: log.calories_burned ?? "",
        timestamp: new Date().toISOString(),
      };
      await db.collection("cardio_logs").deleteMany(query);
      await db.collection("cardio_logs").insertOne(doc);
      const cardioUser = await db.collection("users").findOne({
        _id: new ObjectId(log.user_id),
      });
      await createAdminNotification(db, {
        type: "cardio",
        clientId: log.user_id,
        clientName: cardioUser?.name ? String(cardioUser.name) : "Client",
        message: `Week ${log.week}, Day ${log.day} cardio logged`,
        week: log.week,
        day: log.day,
      });
      return json(doc);
    }

    if (segments[1] === "logs" && segments[2] && segments[3] && segments[4]) {
      const logs = await db
        .collection("workout_logs")
        .find({
          user_id: segments[2],
          week: parseInt(segments[3], 10),
          day: parseInt(segments[4], 10),
        })
        .project({ _id: 0 })
        .toArray();
      return json(logs);
    }

    if (segments[1] === "custom" && segments[2] && segments[3] && req.method === "GET") {
      const user = await getCurrentUser(req);
      const program = await db.collection("custom_programs").findOne(
        {
          user_email: user.email,
          week: parseInt(segments[2], 10),
          day: parseInt(segments[3], 10),
        },
        { projection: { _id: 0 } }
      );
      if (program) {
        return json({ exercises: program.exercises ?? [], custom: true });
      }
      return json({ exercises: [], custom: false });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleAdminClientLogs(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    await getAdminUser(req);
    const db = await getDb();
    const client = await db.collection("users").findOne({ email: decodeURIComponent(segments[2]) });
    if (!client) return json([]);
    const logs = await db
      .collection("workout_logs")
      .find({
        user_id: String(client._id),
        week: parseInt(segments[3], 10),
        day: parseInt(segments[4], 10),
      })
      .project({ _id: 0 })
      .toArray();
    return json(logs);
  } catch (e) {
    return handleAuthError(e);
  }
}
