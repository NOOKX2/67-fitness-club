import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getAdminUser, hashPassword } from "../auth";
import { json, error, parseBody, handleAuthError } from "../api-helpers";
import {
  saveExerciseVideoToGridFS,
} from "../exercise-video-storage";
import { respondExerciseVideoStream, respondFormCheckVideoStream } from "../video-stream-response";
import { normalizeDateOnly, validateAccessDates, type Gender } from "../access";
import { serializeCoach, type CoachDoc } from "../coach-utils";
import { sendFormCheckFeedbackToChat } from "../form-check-utils";
import {
  deleteProfilePhotoFromGridFS,
  saveProfilePhotoToGridFS,
} from "../profile-photo-storage";

export async function handleAdmin(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    await getAdminUser(req);
    const db = await getDb();
    const resource = segments[1];

    if (resource === "coaches" && segments[2] && req.method === "PUT") {
      const body = await parseBody<{
        name?: string;
        profile_photo_base64?: string;
      }>(req);
      const coachId = segments[2];
      const coach = await db.collection("coaches").findOne({ id: coachId });
      if (!coach) return error("Coach not found", 404);

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (body.name?.trim()) update.name = body.name.trim();

      const photoData = body.profile_photo_base64?.trim();
      if (photoData) {
        const oldPhotoId = coach.profile_photo_id as string | undefined;
        const photoId = uuidv4();
        await saveProfilePhotoToGridFS(db, photoId, photoData);
        if (oldPhotoId) {
          await deleteProfilePhotoFromGridFS(db, oldPhotoId).catch(() => undefined);
        }
        update.profile_photo_id = photoId;
      }

      if (Object.keys(update).length > 1) {
        await db.collection("coaches").updateOne({ id: coachId }, { $set: update });
      }

      const updated = await db.collection("coaches").findOne({ id: coachId });
      return json({
        message: "Coach profile updated",
        coach: updated ? serializeCoach(updated as CoachDoc) : null,
      });
    }

    if (resource === "stats" && req.method === "GET") {
      const total_clients = await db.collection("users").countDocuments({ role: "user" });
      const tier_3_count = await db.collection("users").countDocuments({ tier_level: "Tier 3" });
      const recent = await db
        .collection("users")
        .find({ role: "user" })
        .project({ _id: 0, name: 1, email: 1, created_at: 1 })
        .sort({ created_at: -1 })
        .limit(10)
        .toArray();
      return json({
        total_clients,
        mrr: tier_3_count * 299,
        churn_rate: 2.5,
        recent_activity: recent,
      });
    }

    if (resource === "clients" && req.method === "GET") {
      const clients = await db.collection("users").find({ role: "user" }).toArray();
      return json(
        clients.map((c) => ({
          id: String(c._id),
          email: c.email,
          name: c.name,
          role: c.role,
          tier_level: c.tier_level,
          gender: c.gender ?? null,
          access_starts_at: c.access_starts_at ?? null,
          access_expires_at: c.access_expires_at ?? null,
          tdee: c.tdee != null && c.tdee !== "" ? Number(c.tdee) : null,
        }))
      );
    }

    if (resource === "clients" && segments[2] && req.method === "PUT") {
      const body = await parseBody<{
        gender?: Gender | null;
        access_starts_at?: string | null;
        access_expires_at?: string | null;
        tier_level?: string;
        name?: string;
        tdee?: number | string | null;
      }>(req);
      const dateError = validateAccessDates(
        body.access_starts_at,
        body.access_expires_at
      );
      if (dateError) return error(dateError, 400);

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (body.name?.trim()) update.name = body.name.trim();
      if (body.tier_level) update.tier_level = body.tier_level;
      if (body.gender !== undefined) update.gender = body.gender;
      if (body.access_starts_at !== undefined) {
        update.access_starts_at = body.access_starts_at || null;
      }
      if (body.access_expires_at !== undefined) {
        update.access_expires_at = body.access_expires_at || null;
      }
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

      const result = await db.collection("users").updateOne(
        { _id: new ObjectId(segments[2]), role: "user" },
        { $set: update }
      );
      if (result.matchedCount === 0) return error("Client not found", 404);

      const updated = await db.collection("users").findOne({
        _id: new ObjectId(segments[2]),
        role: "user",
      });
      return json({
        message: "Client updated successfully",
        client: updated
          ? {
              id: String(updated._id),
              email: updated.email,
              name: updated.name,
              tier_level: updated.tier_level,
              gender: updated.gender ?? null,
              access_starts_at: normalizeDateOnly(
                updated.access_starts_at ? String(updated.access_starts_at) : null
              ),
              access_expires_at: normalizeDateOnly(
                updated.access_expires_at ? String(updated.access_expires_at) : null
              ),
              created_at: updated.created_at ? String(updated.created_at) : undefined,
              assigned_meal_plan: updated.assigned_meal_plan
                ? String(updated.assigned_meal_plan)
                : undefined,
              tdee:
                updated.tdee != null && updated.tdee !== ""
                  ? Number(updated.tdee)
                  : null,
            }
          : null,
      });
    }

    if (resource === "create-client" && req.method === "POST") {
      const body = await parseBody<{
        name: string;
        email: string;
        password: string;
        tier_level?: string;
        gender?: Gender;
        access_starts_at?: string;
        access_expires_at?: string | null;
        tdee?: number | string | null;
      }>(req);
      const dateError = validateAccessDates(
        body.access_starts_at,
        body.access_expires_at
      );
      if (dateError) return error(dateError, 400);

      const email = body.email.toLowerCase();
      const existing = await db.collection("users").findOne({ email });
      if (existing) return error("Email already exists", 400);

      const today = new Date().toISOString().slice(0, 10);
      let tdee: number | null = null;
      if (body.tdee != null && body.tdee !== "") {
        const value = Number(body.tdee);
        if (!Number.isFinite(value) || value <= 0) {
          return error("TDEE must be a positive number", 400);
        }
        tdee = Math.round(value);
      }
      const result = await db.collection("users").insertOne({
        email,
        name: body.name,
        password_hash: hashPassword(body.password),
        role: "user",
        tier_level: body.tier_level ?? "Tier 1",
        gender: body.gender ?? null,
        access_starts_at: body.access_starts_at || today,
        access_expires_at: body.access_expires_at || null,
        tdee,
        created_at: new Date().toISOString(),
      });
      return json({
        id: String(result.insertedId),
        email,
        name: body.name,
        password: body.password,
        tier_level: body.tier_level ?? "Tier 1",
        gender: body.gender ?? null,
        access_starts_at: body.access_starts_at || today,
        access_expires_at: body.access_expires_at || null,
        tdee,
        message: "Client created successfully",
      });
    }

    if (resource === "programs" && req.method === "POST") {
      const program = await parseBody<{
        track: string;
        day: number;
        exercises: unknown[];
        cardio?: unknown;
        id?: string;
      }>(req);
      if (!program.track || !program.day) {
        return error("Track and day are required", 400);
      }
      const doc = {
        track: program.track,
        day: program.day,
        exercises: program.exercises ?? [],
        cardio: program.cardio ?? null,
        id: program.id ?? uuidv4(),
        updated_at: new Date().toISOString(),
      };
      const result = await db.collection("program_templates").updateOne(
        { track: program.track, day: program.day },
        { $set: doc },
        { upsert: true }
      );
      if (!result.acknowledged) return error("Failed to save program", 500);
      return json({ message: "Program saved successfully", program: doc });
    }

    if (resource === "programs" && segments[2] && segments[3] && req.method === "GET") {
      const program = await db.collection("program_templates").findOne(
        { track: segments[2], day: parseInt(segments[3], 10) },
        { projection: { _id: 0 } }
      );
      if (!program) {
        return json({ track: segments[2], day: parseInt(segments[3], 10), exercises: [], id: uuidv4() });
      }
      return json(program);
    }

    if (
      resource === "exercise-videos" &&
      segments[3] === "stream" &&
      req.method === "GET"
    ) {
      const videoId = segments[2];
      if (!videoId) return error("Video id required", 400);
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

    if (resource === "exercise-videos" && req.method === "GET") {
      const videos = await db
        .collection("exercise_videos")
        .find({})
        .project({ _id: 0, video_base64: 0 })
        .toArray();
      return json(videos);
    }

    if (resource === "exercise-videos" && req.method === "POST") {
      const video = await parseBody<{
        name: string;
        video_base64?: string;
        video_url?: string;
        tags?: string[];
      }>(req);
      if (!video.name?.trim()) return error("Exercise title is required", 400);
      if (!video.video_base64 && !video.video_url) {
        return error("Video file is required", 400);
      }

      const id = uuidv4();
      const doc: Record<string, unknown> = {
        id,
        name: video.name.trim(),
        video_url: video.video_url ?? "",
        tags: video.tags ?? [],
        created_at: new Date().toISOString(),
      };

      if (video.video_base64) {
        try {
          const { contentType, size } = await saveExerciseVideoToGridFS(
            db,
            id,
            video.video_base64
          );
          doc.video_file_id = id;
          doc.content_type = contentType;
          doc.file_size = size;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Upload failed";
          return error(message, 400);
        }
      }

      await db.collection("exercise_videos").insertOne(doc);
      const { video_base64: _, ...safe } = doc;
      return json(safe);
    }

    if (
      resource === "form-checks" &&
      segments[2] &&
      segments[3] === "stream" &&
      req.method === "GET"
    ) {
      const submission = await db.collection("form_checks").findOne({ id: segments[2] });
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

    if (resource === "form-checks" && req.method === "GET" && segments.length === 2) {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");
      const week = url.searchParams.get("week");
      const day = url.searchParams.get("day");

      const filter: Record<string, unknown> = {};
      if (userId) filter.user_id = userId;
      if (week) filter.week = Number(week);
      if (day) filter.day = Number(day);
      if (!userId && !week && !day) filter.status = "pending";

      const subs = await db
        .collection("form_checks")
        .find(filter)
        .project({ _id: 0, video_base64: 0 })
        .sort({ submitted_at: -1 })
        .toArray();
      return json(subs);
    }

    if (
      resource === "form-checks" &&
      segments[2] &&
      segments[3] === "feedback" &&
      req.method === "POST"
    ) {
      const url = new URL(req.url);
      const feedback_text = url.searchParams.get("feedback_text") ?? "";
      const feedback_audio_base64 = url.searchParams.get("feedback_audio_base64") ?? "";
      const body = await parseBody<{ feedback_text?: string; feedback_audio_base64?: string }>(req);
      const submission = await db.collection("form_checks").findOne({ id: segments[2] });
      if (!submission) return error("Submission not found", 404);
      const result = await db.collection("form_checks").updateOne(
        { id: segments[2] },
        {
          $set: {
            feedback_text: body.feedback_text ?? feedback_text,
            feedback_audio_base64: body.feedback_audio_base64 ?? feedback_audio_base64,
            status: "reviewed",
            reviewed_at: new Date().toISOString(),
          },
        }
      );
      if (result.matchedCount === 0) return error("Submission not found", 404);

      const feedbackText = String(body.feedback_text ?? feedback_text ?? "").trim();
      if (feedbackText) {
        await sendFormCheckFeedbackToChat(
          db,
          {
            user_id: submission.user_id ? String(submission.user_id) : undefined,
            exercise_name: submission.exercise_name
              ? String(submission.exercise_name)
              : undefined,
            week: submission.week != null ? Number(submission.week) : undefined,
            day: submission.day != null ? Number(submission.day) : undefined,
          },
          feedbackText
        );
      }

      await db.collection("notifications").insertOne({
        id: uuidv4(),
        user_id: submission.user_id,
        type: "form_feedback",
        title: "Form check feedback received",
        message: `Your coach reviewed your ${submission.exercise_name} form video`,
        read: false,
        created_at: new Date().toISOString(),
      });
      return json({ message: "Feedback submitted successfully" });
    }

    if (resource === "custom-programs" && req.method === "POST") {
      const body = await parseBody<{
        client_email: string;
        week: number;
        day: number;
        exercises: unknown[];
        cardio?: unknown;
      }>(req);
      const week = body.week ?? 1;
      const result = await db.collection("custom_programs").updateOne(
        { user_email: body.client_email, week, day: body.day },
        {
          $set: {
            client_email: body.client_email,
            user_email: body.client_email,
            week,
            day: body.day,
            exercises: body.exercises,
            cardio: body.cardio ?? null,
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      if (!result.acknowledged) return error("Failed to save custom program", 500);
      return json({ message: "Custom program saved successfully" });
    }

    if (resource === "nutrition-limits" && req.method === "POST") {
      const body = await parseBody<{
        client_email: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }>(req);
      if (!body.client_email) return error("Client email required", 400);

      const limits: Record<string, number> = {};
      for (const key of ["protein", "carbs", "fat"] as const) {
        const value = body[key];
        if (value == null) continue;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          return error(`Invalid ${key} limit`, 400);
        }
        limits[key] = num;
      }

      if (
        limits.protein != null ||
        limits.carbs != null ||
        limits.fat != null
      ) {
        limits.calories =
          (limits.protein ?? 0) * 4 +
          (limits.carbs ?? 0) * 4 +
          (limits.fat ?? 0) * 8;
      } else if (body.calories != null) {
        const num = Number(body.calories);
        if (!Number.isFinite(num) || num < 0) {
          return error("Invalid calories limit", 400);
        }
        limits.calories = num;
      }

      const result = await db.collection("client_nutrition_limits").updateOne(
        { client_email: body.client_email },
        {
          $set: {
            client_email: body.client_email,
            ...limits,
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      if (!result.acknowledged) return error("Failed to save nutrition limits", 500);
      return json({ message: "Nutrition limits saved successfully", limits });
    }

    if (
      resource === "nutrition-limits" &&
      segments[2] &&
      req.method === "GET"
    ) {
      const email = decodeURIComponent(segments[2]);
      const doc = await db.collection("client_nutrition_limits").findOne(
        { client_email: email },
        { projection: { _id: 0, calories: 1, protein: 1, carbs: 1, fat: 1 } }
      );
      return json(doc ?? {});
    }

    if (
      resource === "custom-programs" &&
      segments[2] &&
      segments[3] &&
      segments[4] &&
      req.method === "GET"
    ) {
      const email = decodeURIComponent(segments[2]);
      const week = parseInt(segments[3], 10);
      const day = parseInt(segments[4], 10);
      const program = await db.collection("custom_programs").findOne(
        {
          $or: [
            { client_email: email, week, day },
            { user_email: email, week, day },
          ],
        },
        { projection: { _id: 0 } }
      );
      return json(
        program ?? { client_email: email, user_email: email, week, day, exercises: [] }
      );
    }

    if (resource === "custom-program" && req.method === "POST") {
      const body = await parseBody<{
        user_email: string;
        week: number;
        day: number;
        exercises: unknown[];
      }>(req);
      const client = await db.collection("users").findOne({ email: body.user_email });
      if (!client) return error("Client not found", 404);
      const program_doc = {
        user_email: body.user_email,
        week: body.week,
        day: body.day,
        exercises: body.exercises,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.collection("custom_programs").updateOne(
        { user_email: body.user_email, week: body.week, day: body.day },
        { $set: program_doc },
        { upsert: true }
      );
      return json({ message: "Custom program saved successfully" });
    }

    if (resource === "custom-program" && segments[2] && segments[3] && segments[4]) {
      const program = await db.collection("custom_programs").findOne(
        {
          user_email: decodeURIComponent(segments[2]),
          week: parseInt(segments[3], 10),
          day: parseInt(segments[4], 10),
        },
        { projection: { _id: 0 } }
      );
      return json(program ?? { exercises: [] });
    }

    if (resource === "meal-plans" && req.method === "GET") {
      const plans = await db.collection("meal_plans").find({}).project({ _id: 0 }).toArray();
      return json(plans);
    }

    if (resource === "meal-plans" && req.method === "POST") {
      const body = await parseBody<{ name: string; meals: unknown[] }>(req);
      const plan = { id: uuidv4(), name: body.name, meals: body.meals, created_at: new Date().toISOString() };
      await db.collection("meal_plans").insertOne(plan);
      return json(plan);
    }

    if (resource === "assign-meal-plan" && req.method === "POST") {
      const body = await parseBody<{ client_email: string; plan_id: string }>(req);
      await db.collection("users").updateOne(
        { email: body.client_email },
        { $set: { assigned_meal_plan: body.plan_id } }
      );
      return json({ message: "Meal plan assigned" });
    }

    if (resource === "weekly-reports" && req.method === "GET") {
      const userId = req.nextUrl.searchParams.get("user_id");
      if (!userId) return error("user_id is required", 400);
      const reports = await db
        .collection("weekly_reports")
        .find({ user_id: userId })
        .project({ _id: 0 })
        .sort({ week_number: -1 })
        .toArray();
      return json(reports);
    }

    if (resource === "weekly-reports" && req.method === "POST") {
      const body = await parseBody<{
        user_id: string;
        week_number: number;
        report_text: string;
      }>(req);
      if (!body.user_id?.trim()) return error("user_id is required", 400);
      if (!body.week_number || body.week_number < 1) {
        return error("Valid week_number is required", 400);
      }
      if (!body.report_text?.trim()) return error("Report text is required", 400);

      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(body.user_id),
        role: "user",
      });
      if (!userDoc) return error("Client not found", 404);

      const existing = await db.collection("weekly_reports").findOne({
        user_id: body.user_id,
        week_number: body.week_number,
      });
      const now = new Date().toISOString();
      const report = {
        id: existing?.id ? String(existing.id) : uuidv4(),
        user_id: body.user_id,
        week_number: body.week_number,
        report_text: body.report_text.trim(),
        created_at: existing?.created_at ? String(existing.created_at) : now,
        updated_at: now,
      };

      await db.collection("weekly_reports").replaceOne(
        { user_id: body.user_id, week_number: body.week_number },
        report,
        { upsert: true }
      );

      await db.collection("notifications").insertOne({
        id: uuidv4(),
        user_id: body.user_id,
        type: "weekly_report",
        title: "Report from Coach",
        message: `Your coach posted Week ${body.week_number} feedback`,
        read: false,
        created_at: now,
      });

      return json({ message: "Weekly report saved", report });
    }

    if (resource === "tier3-clients" && req.method === "GET") {
      const clients = await db
        .collection("users")
        .find({ tier_level: "Tier 3", role: "user" })
        .project({ password_hash: 0 })
        .toArray();
      return json(clients);
    }

    if (resource === "lift-progress" && segments[2] === "pending" && req.method === "GET") {
      const lifts = await db
        .collection("lift_progress")
        .find({ verification_status: "Pending" })
        .project({ _id: 0 })
        .sort({ submitted_at: -1 })
        .toArray();
      return json(lifts);
    }

    if (
      resource === "lift-progress" &&
      segments[2] &&
      segments[3] === "verify" &&
      req.method === "POST"
    ) {
      const liftId = segments[2];
      const existing = await db.collection("lift_progress").findOne({ id: liftId });
      if (!existing) return error("Lift record not found", 404);

      const verifiedAt = new Date().toISOString();
      await db.collection("lift_progress").updateOne(
        { id: liftId },
        {
          $set: {
            verification_status: "Verified",
            verified_at: verifiedAt,
          },
          $unset: { rejected_at: "" },
        }
      );
      return json({
        message: "Lift verified successfully",
        verification_status: "Verified",
        verified_at: verifiedAt,
        id: liftId,
      });
    }

    if (
      resource === "lift-progress" &&
      segments[2] &&
      segments[3] === "reject" &&
      req.method === "POST"
    ) {
      const liftId = segments[2];
      const existing = await db.collection("lift_progress").findOne({ id: liftId });
      if (!existing) return error("Lift record not found", 404);

      const rejectedAt = new Date().toISOString();
      await db.collection("lift_progress").updateOne(
        { id: liftId },
        {
          $set: {
            verification_status: "Rejected",
            rejected_at: rejectedAt,
          },
          $unset: { verified_at: "" },
        }
      );
      return json({
        message: "Lift rejected",
        verification_status: "Rejected",
        rejected_at: rejectedAt,
        id: liftId,
      });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}
