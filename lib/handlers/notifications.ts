import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getCurrentUser } from "../auth";
import { isAdminRole } from "../routes";
import { json, error, parseBody, handleAuthError } from "../api-helpers";

export async function handleNotifications(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const user = await getCurrentUser(req);
    const db = await getDb();
    const isAdmin = isAdminRole(user.role);

    if (segments[1] === "read" && req.method === "POST") {
      const body = await parseBody<{
        id?: string;
        all?: boolean;
        client_id?: string;
      }>(req);

      const filter: Record<string, unknown> = isAdmin
        ? { audience: "admin" }
        : { user_id: user.id };

      if (body.all) {
        await db
          .collection("notifications")
          .updateMany({ ...filter, read: false }, { $set: { read: true } });
      } else if (body.client_id && isAdmin) {
        await db.collection("notifications").updateMany(
          {
            audience: "admin",
            client_id: body.client_id,
            read: false,
          },
          { $set: { read: true } }
        );
      } else if (body.id) {
        await db.collection("notifications").updateOne(
          { id: body.id, ...filter },
          { $set: { read: true } }
        );
      } else {
        return error("Notification id required", 400);
      }

      return json({ message: "Notifications updated" });
    }

    if (req.method === "GET" && !segments[1]) {
      const query = isAdmin ? { audience: "admin" } : { user_id: user.id };
      const notifications = await db
        .collection("notifications")
        .find(query)
        .project({ _id: 0 })
        .sort({ created_at: -1 })
        .limit(40)
        .toArray();

      const unread_count = await db
        .collection("notifications")
        .countDocuments({ ...query, read: false });

      return json({
        notifications: notifications.map((n) => ({
          id: String(n.id),
          type: String(n.type ?? ""),
          title: String(n.title ?? ""),
          message: String(n.message ?? ""),
          read: Boolean(n.read),
          created_at: String(n.created_at ?? ""),
          user_id: n.user_id ? String(n.user_id) : undefined,
          client_id: n.client_id ? String(n.client_id) : undefined,
          client_name: n.client_name ? String(n.client_name) : undefined,
          category: n.category ? String(n.category) : undefined,
          link: n.link ? String(n.link) : undefined,
          week: typeof n.week === "number" ? n.week : undefined,
          day: typeof n.day === "number" ? n.day : undefined,
          date: n.date ? String(n.date) : undefined,
        })),
        unread_count,
      });
    }
  } catch (e) {
    return handleAuthError(e);
  }

  return error("Not found", 404);
}
