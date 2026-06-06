import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { json, error, parseBody } from "../api-helpers";

const DEFAULT_COACH_IMAGE =
  "https://images.unsplash.com/photo-1550345332-09e3ac987658?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwxfHxmaXRuZXNzJTIwY29hY2glMjBwb3J0cmFpdHxlbnwwfHx8YmxhY2tfYW5kX3doaXRlfDE3ODA0OTQ2MjR8MA&ixlib=rb-4.1.0&q=85";

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
      await db.collection("notifications").insertOne({
        id: uuidv4(),
        audience: "admin",
        client_id: body.user_id,
        client_name: client?.name ? String(client.name) : "Client",
        type: "client_message",
        title: "New client message",
        message:
          body.content.slice(0, 100) + (body.content.length > 100 ? "..." : ""),
        read: false,
        created_at: new Date().toISOString(),
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
  let coaches = await db.collection("coaches").find({}).project({ _id: 0 }).toArray();
  if (coaches.length === 0) {
    const coach = {
      id: uuidv4(),
      name: "Coach Sarah",
      profile_image_url: DEFAULT_COACH_IMAGE,
      is_online: true,
    };
    await db.collection("coaches").insertOne(coach);
    coaches = [coach];
  }
  return json(coaches);
}
