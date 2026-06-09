import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { json, error, parseBody } from "../api-helpers";
import { ensureCoaches, serializeCoach } from "../coach-utils";
import { createAdminNotification } from "../admin-notifications";

export async function handleMessages(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  const db = await getDb();

  if (req.method === "POST" && segments.length === 1) {
    const body = await parseBody<{
      user_id: string;
      coach_id: string;
      sender: string;
      content: string;
      attachment_base64?: string;
    }>(req);
    const msg = {
      id: uuidv4(),
      ...body,
      attachment_base64: body.attachment_base64 ?? "",
      timestamp: new Date().toISOString(),
    };
    await db.collection("messages").insertOne(msg);

    if (body.sender === "coach") {
      await db.collection("notifications").insertOne({
        id: uuidv4(),
        user_id: body.user_id,
        type: "coach_message",
        title: "New message from your coach",
        message:
          body.content.slice(0, 100) + (body.content.length > 100 ? "..." : ""),
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    if (body.sender === "user") {
      const client = await db
        .collection("users")
        .findOne({ _id: new ObjectId(body.user_id) });
      const clientName = client?.name ? String(client.name) : "Client";
      await createAdminNotification(db, {
        type: "client_message",
        clientId: body.user_id,
        clientName,
        message:
          body.content.slice(0, 100) + (body.content.length > 100 ? "..." : ""),
      });
    }
    return json(msg);
  }

  if (req.method === "GET" && segments[1] && segments[2]) {
    const messages = await db
      .collection("messages")
      .find({
        $or: [
          { user_id: segments[1], coach_id: segments[2] },
          { user_id: segments[2], coach_id: segments[1] },
        ],
      })
      .project({ _id: 0 })
      .sort({ timestamp: 1 })
      .toArray();
    return json(messages);
  }

  return error("Not found", 404);
}

export async function handleCoaches(req: NextRequest): Promise<Response> {
  if (req.method !== "GET") return error("Method not allowed", 405);
  const db = await getDb();
  const coaches = await ensureCoaches(db);
  return json(coaches.map((coach) => serializeCoach(coach)));
}
