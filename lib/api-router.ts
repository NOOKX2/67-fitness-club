import { NextRequest } from "next/server";
import { json, error } from "./api-helpers";
import { handleAuth, handleUserProfile } from "./handlers/auth";
import { handleWorkouts, handleAdminClientLogs } from "./handlers/workouts";
import { handleNutrition, handleAdminNutrition } from "./handlers/nutrition";
import { handleMessages, handleCoaches } from "./handlers/messages";
import { handleNotifications } from "./handlers/notifications";
import { handleAdmin } from "./handlers/admin";
import {
  handleFormChecks,
  handleStreak,
  handleWeightTracking,
  handleUserProfileGet,
  handleUpdateProfile,
  handleProfilePhoto,
  handleMealPlan,
  handleWeeklyReports,
  handleProgress,
  handleLiftProgress,
  handleExerciseVideo,
} from "./handlers/misc";

export async function handleApi(
  req: NextRequest,
  path: string[]
): Promise<Response> {
  if (path.length === 0) {
    return json({ message: "Fitness Tracker API" });
  }

  const [root, ...rest] = path;

  switch (root) {
    case "auth":
      return handleAuth(req, ["auth", ...rest]);
    case "user":
      if (rest[0] === "profile" && req.method === "PUT") {
        return handleUserProfile(req);
      }
      break;
    case "workouts":
      return handleWorkouts(req, ["workouts", ...rest]);
    case "nutrition":
      return handleNutrition(req, ["nutrition", ...rest]);
    case "messages":
      return handleMessages(req, ["messages", ...rest]);
    case "coaches":
      return handleCoaches(req);
    case "notifications":
      return handleNotifications(req, ["notifications", ...rest]);
    case "admin":
      if (rest[0] === "client-logs") {
        return handleAdminClientLogs(req, ["admin", "client-logs", ...rest.slice(1)]);
      }
      if (rest[0] === "nutrition-submissions") {
        return handleAdminNutrition(req, ["admin", ...rest]);
      }
      return handleAdmin(req, ["admin", ...rest]);
    case "form-checks":
      return handleFormChecks(req, ["form-checks", ...rest]);
    case "streak":
      if (rest[0]) return handleStreak(req, rest[0]);
      break;
    case "weight-tracking":
      return handleWeightTracking(req, ["weight-tracking", ...rest]);
    case "user-profile":
      if (rest[0]) return handleUserProfileGet(req, rest[0]);
      break;
    case "update-profile":
      if (req.method === "POST") return handleUpdateProfile(req);
      break;
    case "profile-photo":
      if (rest[0]) return handleProfilePhoto(req, ["profile-photo", ...rest]);
      break;
    case "meal-plan":
      if (rest[0]) return handleMealPlan(req, rest[0]);
      break;
    case "weekly-reports":
      if (rest[0]) return handleWeeklyReports(req, rest[0]);
      break;
    case "progress":
      return handleProgress(req, ["progress", ...rest]);
    case "lift-progress":
      return handleLiftProgress(req, ["lift-progress", ...rest]);
    case "exercise-video":
      if (rest[0]) return handleExerciseVideo(req, ["exercise-video", ...rest]);
      break;
  }

  return error("Not found", 404);
}
