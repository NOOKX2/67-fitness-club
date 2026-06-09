import { v4 as uuidv4 } from "uuid";
import type { Db } from "mongodb";

export type AdminActivityType =
  | "form_check"
  | "nutrition"
  | "workout"
  | "cardio"
  | "weight"
  | "progress_photo"
  | "lift_pr"
  | "client_message";

export const ADMIN_ACTIVITY_LABELS: Record<AdminActivityType, string> = {
  form_check: "Form Check",
  nutrition: "Nutrition",
  workout: "Workout",
  cardio: "Cardio",
  weight: "Weight",
  progress_photo: "Progress",
  lift_pr: "Lift PR",
  client_message: "Chat",
};

function isoDate(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function buildAdminNotificationLink(
  type: AdminActivityType,
  params: {
    clientId: string;
    week?: number;
    day?: number;
    date?: string;
  }
): string {
  const { clientId, week, day, date } = params;
  const cid = encodeURIComponent(clientId);
  switch (type) {
    case "form_check":
    case "workout":
    case "cardio":
      return `/admin/results?client=${cid}&week=${week ?? 1}&day=${day ?? 1}`;
    case "nutrition":
      return `/admin/nutrition?client=${cid}&date=${date ?? isoDate()}`;
    case "weight":
    case "progress_photo":
      return `/admin/results?client=${cid}`;
    case "lift_pr":
      return "/admin/weight-verification";
    case "client_message":
      return `/admin/chat?client=${cid}`;
    default:
      return "/admin";
  }
}

export async function createAdminNotification(
  db: Db,
  opts: {
    type: AdminActivityType;
    clientId: string;
    clientName: string;
    message: string;
    week?: number;
    day?: number;
    date?: string;
  }
) {
  const link = buildAdminNotificationLink(opts.type, {
    clientId: opts.clientId,
    week: opts.week,
    day: opts.day,
    date: opts.date,
  });

  await db.collection("notifications").insertOne({
    id: uuidv4(),
    audience: "admin",
    client_id: opts.clientId,
    client_name: opts.clientName,
    type: opts.type,
    category: ADMIN_ACTIVITY_LABELS[opts.type],
    title: opts.clientName,
    message: opts.message,
    link,
    week: opts.week,
    day: opts.day,
    date: opts.date,
    read: false,
    created_at: new Date().toISOString(),
  });
}
