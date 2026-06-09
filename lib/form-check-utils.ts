import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";
import { ensureCoaches } from "./coach-utils";

export async function sendFormCheckFeedbackToChat(
  db: Db,
  submission: {
    user_id?: string;
    exercise_name?: string;
    week?: number;
    day?: number;
  },
  feedbackText: string
): Promise<void> {
  const userId = submission.user_id;
  if (!userId || !feedbackText.trim()) return;

  const coaches = await ensureCoaches(db);
  const coachId = coaches[0]?.id;
  if (!coachId) return;

  const exercise = submission.exercise_name ?? "Exercise";
  const week = submission.week ?? "?";
  const day = submission.day ?? "?";
  const content = `Form check — ${exercise} (Week ${week}, Day ${day}):\n\n${feedbackText.trim()}`;

  await db.collection("messages").insertOne({
    id: uuidv4(),
    user_id: userId,
    coach_id: String(coachId),
    sender: "coach",
    content,
    attachment_base64: "",
    timestamp: new Date().toISOString(),
  });

  await db.collection("notifications").insertOne({
    id: uuidv4(),
    user_id: userId,
    type: "coach_message",
    title: "Form check feedback from your coach",
    message: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
    read: false,
    created_at: new Date().toISOString(),
  });
}
