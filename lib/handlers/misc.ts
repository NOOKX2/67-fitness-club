import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getCurrentUser } from "../auth";
import { json, error, parseBody, handleAuthError } from "../api-helpers";
import {
  openProgressPhotoStream,
  progressPhotoStreamPath,
  saveProgressPhotoToGridFS,
} from "../progress-photo-storage";
import {
  deleteProfilePhotoFromGridFS,
  openProfilePhotoStream,
  profilePhotoStreamPath,
  saveProfilePhotoToGridFS,
} from "../profile-photo-storage";
import { streamFromBase64DataUrl } from "../exercise-video-storage";
import { MAX_FORM_CHECK_VIDEO_BYTES, MAX_FORM_CHECK_VIDEO_MB } from "../form-check-constants";
import {
  deleteFormCheckVideoFromGridFS,
  saveFormCheckVideoToGridFS,
} from "../form-check-video-storage";
import { respondExerciseVideoStream, respondFormCheckVideoStream } from "../video-stream-response";
import { createAdminNotification } from "../admin-notifications";

export async function handleFormChecks(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const db = await getDb();

    if (segments[1] && segments[2] === "stream" && req.method === "GET") {
      await getCurrentUser(req);
      const submission = await db.collection("form_checks").findOne({ id: segments[1] });
      if (!submission) return error("Form check not found", 404);

      const fileId =
        (submission.video_file_id as string | undefined) ?? String(submission.id);
      const streamResponse = await respondFormCheckVideoStream(
        req,
        db,
        fileId,
        submission.video_base64
      );
      if (streamResponse) return streamResponse;
      return error("Video file not found", 404);
    }

    if (segments[1] === "submit" && req.method === "POST") {
      const user = await getCurrentUser(req);
      const body = await parseBody<{
        exercise_id?: string;
        exercise_name?: string;
        week?: number;
        day?: number;
        video_base64?: string;
      }>(req);

      if (!body.exercise_id?.trim()) return error("Exercise is required", 400);
      if (!body.video_base64?.trim()) return error("Video is required", 400);
      if (body.week == null || body.day == null) {
        return error("Week and day are required", 400);
      }

      const comma = body.video_base64.indexOf(",");
      const base64Payload =
        comma >= 0 ? body.video_base64.slice(comma + 1) : body.video_base64;
      const byteLength = Buffer.byteLength(base64Payload, "base64");
      if (byteLength > MAX_FORM_CHECK_VIDEO_BYTES) {
        return error(`Video must be under ${MAX_FORM_CHECK_VIDEO_MB}MB`, 400);
      }

      const existing = await db.collection("form_checks").findOne({
        user_id: user.id,
        exercise_id: body.exercise_id,
        week: Number(body.week),
        day: Number(body.day),
      });

      const fileId = existing?.video_file_id
        ? String(existing.video_file_id)
        : uuidv4();

      if (existing?.video_file_id) {
        await deleteFormCheckVideoFromGridFS(db, fileId).catch(() => undefined);
      }

      await saveFormCheckVideoToGridFS(db, fileId, body.video_base64);

      const doc = {
        id: existing?.id ? String(existing.id) : uuidv4(),
        user_id: user.id,
        user_name: user.name,
        exercise_id: body.exercise_id,
        exercise_name: body.exercise_name?.trim() || "Exercise",
        week: Number(body.week),
        day: Number(body.day),
        video_file_id: fileId,
        submitted_at: new Date().toISOString(),
        status: "pending",
        feedback_text: "",
        reviewed_at: null,
      };

      if (existing) {
        await db.collection("form_checks").updateOne(
          { id: doc.id },
          { $set: doc, $unset: { video_base64: "" } }
        );
      } else {
        await db.collection("form_checks").insertOne(doc);
      }

      await createAdminNotification(db, {
        type: "form_check",
        clientId: user.id,
        clientName: user.name,
        message: `${doc.exercise_name} · Week ${doc.week}, Day ${doc.day}`,
        week: doc.week,
        day: doc.day,
      });

      return json({ message: "Form check submitted successfully", submission: doc });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleStreak(
  req: NextRequest,
  userId: string
): Promise<Response> {
  try {
    await getCurrentUser(req);
    const db = await getDb();
    const logs = await db
      .collection("workout_logs")
      .find({ user_id: userId })
      .project({ timestamp: 1, _id: 0 })
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();

    const dates = [
      ...new Set(
        logs
          .map((l) => String(l.timestamp).slice(0, 10))
          .filter(Boolean)
      ),
    ].sort();

    let current_streak = 0;
    let longest_streak = 0;
    let temp = 0;

    if (dates.length > 0) {
      for (let i = 0; i < dates.length; i++) {
        if (i === 0) temp = 1;
        else {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) temp += 1;
          else {
            longest_streak = Math.max(longest_streak, temp);
            temp = 1;
          }
        }
      }
      longest_streak = Math.max(longest_streak, temp);
      const today = new Date();
      const last = new Date(dates[dates.length - 1]);
      const daysSince = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 1) current_streak = temp;
    }

    return json({ current_streak, longest_streak });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleWeightTracking(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const user = await getCurrentUser(req);
    const db = await getDb();

    if (req.method === "POST") {
      const body = await parseBody<{ weight?: number; height?: number }>(req);
      if (!body.weight) return error("Weight is required", 400);
      const entry = {
        id: uuidv4(),
        user_id: user.id,
        weight: Number(body.weight),
        height: body.height ? Number(body.height) : null,
        date: new Date().toISOString(),
      };
      await db.collection("weight_tracking").insertOne(entry);
      await createAdminNotification(db, {
        type: "weight",
        clientId: user.id,
        clientName: user.name,
        message: `Logged ${entry.weight} kg`,
        date: entry.date.slice(0, 10),
      });
      if (body.height) {
        await db.collection("users").updateOne(
          { _id: new ObjectId(user.id) },
          { $set: { height: Number(body.height) } }
        );
      }
      return json(entry);
    }

    if (segments[1] && req.method === "GET") {
      const entries = await db
        .collection("weight_tracking")
        .find({ user_id: segments[1] })
        .project({ _id: 0 })
        .sort({ date: 1 })
        .toArray();
      return json(entries);
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleUserProfileGet(
  req: NextRequest,
  userId: string
): Promise<Response> {
  try {
    await getCurrentUser(req);
    const db = await getDb();
    const doc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    return json({ height: doc?.height ?? null });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleUpdateProfile(req: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser(req);
    const body = await parseBody<{
      name?: string;
      profile_photo_base64?: string;
      profile_image?: string;
      tdee?: number | string | null;
    }>(req);
    const db = await getDb();
    const update: Record<string, unknown> = {};

    if (body.name?.trim()) update.name = body.name.trim();
    if (body.tdee !== undefined) {
      if (body.tdee === null || body.tdee === "") {
        update.tdee = null;
      } else {
        const value = Number(body.tdee);
        if (!Number.isFinite(value) || value <= 0) {
          return error("TDEE must be a positive number", 400);
        }
        update.tdee = Math.round(value);
      }
    }

    const photoData = body.profile_photo_base64 ?? body.profile_image;
    if (photoData?.trim()) {
      const userDoc = await db.collection("users").findOne({ _id: new ObjectId(user.id) });
      const oldPhotoId = userDoc?.profile_photo_id as string | undefined;
      const photoId = uuidv4();
      await saveProfilePhotoToGridFS(db, photoId, photoData);
      if (oldPhotoId) {
        await deleteProfilePhotoFromGridFS(db, oldPhotoId).catch(() => undefined);
      }
      update.profile_photo_id = photoId;
    }

    if (Object.keys(update).length > 0) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(user.id) },
        { $set: update }
      );
    }

    const updated = await db.collection("users").findOne({ _id: new ObjectId(user.id) });
    const profilePhotoId = updated?.profile_photo_id as string | undefined;
    return json({
      message: "Profile updated successfully",
      name: updated?.name ?? user.name,
      tdee:
        updated?.tdee != null && updated.tdee !== ""
          ? Number(updated.tdee)
          : null,
      profile_photo_url: profilePhotoId
        ? profilePhotoStreamPath(profilePhotoId)
        : typeof updated?.profile_image === "string"
          ? updated.profile_image
          : null,
    });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleProfilePhoto(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const user = await getCurrentUser(req);

    if (segments[1] && segments[2] === "stream" && req.method === "GET") {
      const photoId = segments[1];
      const db = await getDb();
      const owner = await db.collection("users").findOne({ profile_photo_id: photoId });
      if (!owner) return error("Photo not found", 404);
      if (String(owner._id) !== user.id && user.role !== "admin") {
        return error("Access denied", 403);
      }

      const gridStream = await openProfilePhotoStream(db, photoId);
      if (gridStream) {
        return new Response(Readable.toWeb(gridStream.stream as Readable) as ReadableStream, {
          headers: { "Content-Type": gridStream.contentType },
        });
      }

      if (typeof owner.profile_image === "string" && owner.profile_image) {
        const inline = streamFromBase64DataUrl(owner.profile_image);
        if (inline) {
          return new Response(new Uint8Array(inline.body), {
            headers: { "Content-Type": inline.contentType },
          });
        }
      }

      return error("Photo file not found", 404);
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleMealPlan(
  req: NextRequest,
  userId: string
): Promise<Response> {
  try {
    await getCurrentUser(req);
    const db = await getDb();
    const userDoc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!userDoc?.assigned_meal_plan) return json(null);
    const plan = await db.collection("meal_plans").findOne(
      { id: userDoc.assigned_meal_plan },
      { projection: { _id: 0 } }
    );
    return json(plan);
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleWeeklyReports(
  req: NextRequest,
  userId: string
): Promise<Response> {
  try {
    await getCurrentUser(req);
    const reports = await getDb().then((db) =>
      db
        .collection("weekly_reports")
        .find({ user_id: userId })
        .project({ _id: 0 })
        .sort({ week_number: -1 })
        .toArray()
    );
    return json(reports);
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleProgress(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const user = await getCurrentUser(req);

    if (
      segments[1] === "photos" &&
      segments[2] &&
      segments[3] === "stream" &&
      req.method === "GET"
    ) {
      const photoId = segments[2];
      const db = await getDb();
      const photo = await db.collection("progress_photos").findOne({ id: photoId });
      if (!photo) return error("Photo not found", 404);
      if (photo.user_id !== user.id && user.role !== "admin") {
        return error("Access denied", 403);
      }

      const fileId = (photo.photo_file_id as string | undefined) ?? photoId;
      const gridStream = await openProgressPhotoStream(db, fileId);
      if (gridStream) {
        return new Response(Readable.toWeb(gridStream.stream as Readable) as ReadableStream, {
          headers: { "Content-Type": gridStream.contentType },
        });
      }

      if (typeof photo.photo_base64 === "string" && photo.photo_base64) {
        const inline = streamFromBase64DataUrl(photo.photo_base64);
        if (inline) {
          return new Response(new Uint8Array(inline.body), {
            headers: { "Content-Type": inline.contentType },
          });
        }
      }

      return error("Photo file not found", 404);
    }

    if (segments[1] === "journey" && req.method === "GET") {
      const start = req.nextUrl.searchParams.get("start");
      const end = req.nextUrl.searchParams.get("end");
      if (!start || !end) return error("start and end dates are required", 400);
      const { getProgressJourneyStats } = await import("../data");
      const stats = await getProgressJourneyStats(user.id, start, end);
      return json(stats);
    }

    if (segments[1] === "photo" && req.method === "POST") {
      const photo = await parseBody<{
        user_id: string;
        photo_base64: string;
        weight?: number;
        notes?: string;
      }>(req);
      if (photo.user_id !== user.id) return error("Access denied", 403);
      if (!photo.photo_base64?.trim()) return error("Photo is required", 400);

      const db = await getDb();
      const photoId = uuidv4();
      await saveProgressPhotoToGridFS(db, photoId, photo.photo_base64);

      const doc = {
        id: photoId,
        user_id: user.id,
        photo_file_id: photoId,
        weight: photo.weight != null ? Number(photo.weight) : undefined,
        notes: photo.notes ?? "",
        date: new Date().toISOString(),
      };
      await db.collection("progress_photos").insertOne(doc);
      await createAdminNotification(db, {
        type: "progress_photo",
        clientId: user.id,
        clientName: user.name,
        message: doc.weight != null ? `Progress photo · ${doc.weight} kg` : "New progress photo",
        date: doc.date.slice(0, 10),
      });
      return json({ ...doc, photo_url: progressPhotoStreamPath(photoId) });
    }

    if (segments[1] && req.method === "GET") {
      const userId = segments[1];
      if (user.id !== userId && user.role !== "admin") {
        return error("Access denied", 403);
      }
      const photos = await getDb().then((db) =>
        db
          .collection("progress_photos")
          .find({ user_id: userId })
          .project({ _id: 0 })
          .sort({ date: 1 })
          .toArray()
      );
      return json({ photos, measurements: [] });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleLiftProgress(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const db = await getDb();

    if (req.method === "POST" && segments.length === 1) {
      await getCurrentUser(req);
      const lift = await parseBody<{
        user_id: string;
        exercise_name: string;
        weight_lifted: number;
      }>(req);
      const existing = await db.collection("lift_progress").findOne({
        user_id: lift.user_id,
        exercise_name: lift.exercise_name,
      });
      if (existing?.verification_status === "Pending") {
        return error(
          "You already have a pending submission for this exercise. Wait for coach approval.",
          400
        );
      }
      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(lift.user_id),
      });
      const doc = {
        id: uuidv4(),
        user_id: lift.user_id,
        user_name: userDoc?.name ?? "",
        user_email: userDoc?.email ?? "",
        exercise_name: lift.exercise_name,
        weight_lifted: lift.weight_lifted,
        verification_status: "Pending",
        is_visible_on_profile: true,
        submitted_at: new Date().toISOString(),
      };
      if (existing) {
        await db.collection("lift_progress").updateOne(
          { user_id: lift.user_id, exercise_name: lift.exercise_name },
          { $set: doc }
        );
      } else {
        await db.collection("lift_progress").insertOne(doc);
      }
      await createAdminNotification(db, {
        type: "lift_pr",
        clientId: lift.user_id,
        clientName: userDoc?.name ? String(userDoc.name) : "Client",
        message: `${lift.exercise_name} · ${lift.weight_lifted} kg`,
      });
      return json(doc);
    }

    if (segments[1] && !segments[2] && req.method === "GET") {
      await getCurrentUser(req);
      const lifts = await db
        .collection("lift_progress")
        .find({ user_id: segments[1] })
        .project({ _id: 0 })
        .toArray();
      return json(lifts);
    }

    if (segments[1] && segments[2] === "toggle-visibility" && req.method === "PUT") {
      await getCurrentUser(req);
      const lift = await db.collection("lift_progress").findOne({ id: segments[1] });
      if (!lift) return error("Lift record not found", 404);
      const newVis = !lift.is_visible_on_profile;
      await db.collection("lift_progress").updateOne(
        { id: segments[1] },
        { $set: { is_visible_on_profile: newVis } }
      );
      return json({ is_visible_on_profile: newVis });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleExerciseVideo(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const videoId = segments[1];
    if (!videoId) return error("Video id required", 400);
    const db = await getDb();

    if (segments[2] === "stream" && req.method === "GET") {
      await getCurrentUser(req);
      const video = await db.collection("exercise_videos").findOne({ id: videoId });
      if (!video) return error("Video not found", 404);

      const fileId = (video.video_file_id as string | undefined) ?? videoId;
      const streamResponse = await respondExerciseVideoStream(
        req,
        db,
        fileId,
        video.video_base64
      );
      if (streamResponse) return streamResponse;

      return error("Video file not found", 404);
    }

    if (req.method === "GET") {
      await getCurrentUser(req);
      const video = await db.collection("exercise_videos").findOne(
        { id: videoId },
        { projection: { _id: 0, video_base64: 0 } }
      );
      if (!video) return error("Video not found", 404);
      return json(video);
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}
