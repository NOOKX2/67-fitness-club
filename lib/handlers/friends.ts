import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "../auth";
import { getDb } from "../db";
import { json, error, parseBody, handleAuthError } from "../api-helpers";
import {
  MAX_FITNESS_INTERESTS,
  canUnlockFriendChat,
  normalizeFitnessInterests,
  sharedFitnessInterests,
} from "../fitness-interests";
import { profilePhotoStreamPath } from "../profile-photo-storage";

type FriendshipDoc = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
};

type FriendMessageDoc = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  timestamp: string;
};

function profilePhotoUrl(doc: Record<string, unknown> | null | undefined) {
  if (!doc) return null;
  const photoId = doc.profile_photo_id ? String(doc.profile_photo_id) : null;
  if (photoId) return profilePhotoStreamPath(photoId);
  if (typeof doc.profile_image === "string" && doc.profile_image) {
    return doc.profile_image;
  }
  return null;
}

function userInterests(doc: Record<string, unknown> | null | undefined) {
  return normalizeFitnessInterests(doc?.fitness_interests);
}

async function getUserById(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  if (!ObjectId.isValid(userId)) return null;
  return db.collection("users").findOne({ _id: new ObjectId(userId) });
}

async function getUserByEmail(db: Awaited<ReturnType<typeof getDb>>, email: string) {
  return db.collection("users").findOne({
    email: email.trim().toLowerCase(),
  });
}

async function findFriendshipBetween(
  db: Awaited<ReturnType<typeof getDb>>,
  userA: string,
  userB: string
) {
  return db.collection("friendships").findOne({
    $or: [
      { requester_id: userA, recipient_id: userB },
      { requester_id: userB, recipient_id: userA },
    ],
  }) as Promise<FriendshipDoc | null>;
}

async function serializeFriend(
  db: Awaited<ReturnType<typeof getDb>>,
  friendship: FriendshipDoc,
  currentUserId: string
) {
  const otherUserId =
    friendship.requester_id === currentUserId
      ? friendship.recipient_id
      : friendship.requester_id;
  const other = await getUserById(db, otherUserId);
  if (!other) return null;

  const me = await getUserById(db, currentUserId);
  const myInterests = userInterests(me);
  const theirInterests = userInterests(other);
  const shared = sharedFitnessInterests(myInterests, theirInterests);

  return {
    friendship_id: friendship.id,
    user_id: otherUserId,
    name: String(other.name ?? "Member"),
    email: String(other.email ?? ""),
    profile_photo_url: profilePhotoUrl(other as Record<string, unknown>),
    fitness_interests: theirInterests,
    shared_interests: shared,
    chat_unlocked: canUnlockFriendChat(true, myInterests, theirInterests),
  };
}

async function serializeRequest(
  db: Awaited<ReturnType<typeof getDb>>,
  friendship: FriendshipDoc,
  currentUserId: string
) {
  const incoming = friendship.recipient_id === currentUserId;
  const otherUserId = incoming ? friendship.requester_id : friendship.recipient_id;
  const other = await getUserById(db, otherUserId);
  if (!other) return null;

  return {
    id: friendship.id,
    direction: incoming ? ("incoming" as const) : ("outgoing" as const),
    user_id: otherUserId,
    name: String(other.name ?? "Member"),
    email: String(other.email ?? ""),
    profile_photo_url: profilePhotoUrl(other as Record<string, unknown>),
    created_at: friendship.created_at,
  };
}

export async function handleFriendsSocial(req: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser(req);
    const db = await getDb();
    const me = await getUserById(db, user.id);

    const friendships = (await db
      .collection("friendships")
      .find({
        status: { $in: ["pending", "accepted"] },
        $or: [{ requester_id: user.id }, { recipient_id: user.id }],
      })
      .sort({ updated_at: -1 })
      .toArray()) as unknown as FriendshipDoc[];

    const friends = (
      await Promise.all(
        friendships
          .filter((f) => f.status === "accepted")
          .map((f) => serializeFriend(db, f, user.id))
      )
    ).filter(Boolean);

    const pending_requests = (
      await Promise.all(
        friendships
          .filter((f) => f.status === "pending")
          .map((f) => serializeRequest(db, f, user.id))
      )
    ).filter(Boolean);

    return json({
      fitness_interests: userInterests(me as Record<string, unknown>),
      friends,
      pending_requests,
    });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleFriendsInterests(req: NextRequest): Promise<Response> {
  if (req.method !== "PUT") return error("Method not allowed", 405);
  try {
    const user = await getCurrentUser(req);
    const body = await parseBody<{ interests?: unknown }>(req);
    if (!Array.isArray(body.interests)) {
      return error("Interests must be an array", 400);
    }
    if (body.interests.length > MAX_FITNESS_INTERESTS) {
      return error(`You can only select up to ${MAX_FITNESS_INTERESTS} interests`, 400);
    }
    for (const value of body.interests) {
      if (typeof value !== "string" || !normalizeFitnessInterests([value]).length) {
        return error("Invalid fitness interest", 400);
      }
    }
    const interests = normalizeFitnessInterests(body.interests);

    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { fitness_interests: interests } }
    );

    return json({ fitness_interests: interests });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleFriendsRequest(req: NextRequest): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);
  try {
    const user = await getCurrentUser(req);
    const body = await parseBody<{ email?: string }>(req);
    const email = body.email?.trim().toLowerCase();
    if (!email) return error("Email is required", 400);

    const db = await getDb();
    const target = await getUserByEmail(db, email);
    if (!target) return error("No member found with that email address", 404);
    if (String(target._id) === user.id) {
      return error("You cannot add yourself as a friend", 400);
    }

    const existing = await findFriendshipBetween(db, user.id, String(target._id));
    if (existing?.status === "accepted") {
      return error("You are already friends with this member", 400);
    }
    if (existing?.status === "pending") {
      if (existing.requester_id === user.id) {
        return error("Friend request already sent", 400);
      }
      existing.status = "accepted";
      existing.updated_at = new Date().toISOString();
      await db.collection("friendships").updateOne(
        { id: existing.id },
        { $set: { status: "accepted", updated_at: existing.updated_at } }
      );
      return json({ message: "Friend request accepted", auto_accepted: true });
    }

    const now = new Date().toISOString();
    const friendship: FriendshipDoc = {
      id: uuidv4(),
      requester_id: user.id,
      recipient_id: String(target._id),
      status: "pending",
      created_at: now,
      updated_at: now,
    };
    await db.collection("friendships").insertOne(friendship);

    return json({ message: "Friend request sent", request_id: friendship.id });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleFriendsRespond(
  req: NextRequest,
  action: "accept" | "decline"
): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);
  try {
    const user = await getCurrentUser(req);
    const body = await parseBody<{ request_id?: string }>(req);
    if (!body.request_id) return error("Request id is required", 400);

    const db = await getDb();
    const friendship = (await db.collection("friendships").findOne({
      id: body.request_id,
      recipient_id: user.id,
      status: "pending",
    })) as FriendshipDoc | null;

    if (!friendship) return error("Friend request not found", 404);

    const status = action === "accept" ? "accepted" : "declined";
    await db.collection("friendships").updateOne(
      { id: friendship.id },
      { $set: { status, updated_at: new Date().toISOString() } }
    );

    return json({
      message: action === "accept" ? "Friend request accepted" : "Friend request declined",
      status,
    });
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleFriendMessages(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const user = await getCurrentUser(req);
    const db = await getDb();
    const friendUserId = segments[1];
    if (!friendUserId || !ObjectId.isValid(friendUserId)) {
      return error("Invalid friend id", 400);
    }

    const friendship = await findFriendshipBetween(db, user.id, friendUserId);
    if (!friendship || friendship.status !== "accepted") {
      return error("You can only chat with confirmed friends", 403);
    }

    const me = await getUserById(db, user.id);
    const friend = await getUserById(db, friendUserId);
    const myInterests = userInterests(me as Record<string, unknown>);
    const theirInterests = userInterests(friend as Record<string, unknown>);
    const shared = sharedFitnessInterests(myInterests, theirInterests);
    const chatUnlocked = canUnlockFriendChat(true, myInterests, theirInterests);

    if (req.method === "GET") {
      const messages = chatUnlocked
        ? ((await db
            .collection("friend_messages")
            .find({
              $or: [
                { from_user_id: user.id, to_user_id: friendUserId },
                { from_user_id: friendUserId, to_user_id: user.id },
              ],
            })
            .project({ _id: 0 })
            .sort({ timestamp: 1 })
            .toArray()) as FriendMessageDoc[])
        : [];

      return json({
        messages,
        chat_unlocked: chatUnlocked,
        shared_interests: shared,
        friend: {
          user_id: friendUserId,
          name: String(friend?.name ?? "Member"),
          profile_photo_url: profilePhotoUrl(friend as Record<string, unknown>),
          fitness_interests: theirInterests,
        },
      });
    }

    if (req.method === "POST") {
      if (!chatUnlocked) {
        return error(
          "Chat is locked until you share at least one fitness interest with this friend",
          403
        );
      }

      const body = await parseBody<{ content?: string }>(req);
      const content = body.content?.trim();
      if (!content) return error("Message cannot be empty", 400);

      const message: FriendMessageDoc = {
        id: uuidv4(),
        from_user_id: user.id,
        to_user_id: friendUserId,
        content,
        timestamp: new Date().toISOString(),
      };
      await db.collection("friend_messages").insertOne(message);
      return json(message);
    }

    return error("Method not allowed", 405);
  } catch (e) {
    return handleAuthError(e);
  }
}

export async function handleFriends(req: NextRequest, segments: string[]): Promise<Response> {
  const sub = segments[1];

  if (sub === "social" && req.method === "GET") {
    return handleFriendsSocial(req);
  }
  if (sub === "interests") {
    return handleFriendsInterests(req);
  }
  if (sub === "request") {
    return handleFriendsRequest(req);
  }
  if (sub === "accept") {
    return handleFriendsRespond(req, "accept");
  }
  if (sub === "decline") {
    return handleFriendsRespond(req, "decline");
  }
  if (sub === "messages") {
    return handleFriendMessages(req, segments);
  }

  return error("Not found", 404);
}
