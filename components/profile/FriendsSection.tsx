"use client";

import { useEffect, useState } from "react";
import { Lock, MessageCircle, User } from "lucide-react";
import { ChatComposer } from "@/components/chat/ChatUI";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { clientCardInner, clientSectionLabel } from "@/lib/client-ui";
import type { FitnessInterest } from "@/lib/fitness-interests";
import { cn } from "@/lib/utils";

export type ProfileFriend = {
  friendship_id: string;
  user_id: string;
  name: string;
  email: string;
  profile_photo_url?: string | null;
  fitness_interests: FitnessInterest[];
  shared_interests: FitnessInterest[];
  chat_unlocked: boolean;
};

export type FriendRequestItem = {
  id: string;
  direction: "incoming" | "outgoing";
  user_id: string;
  name: string;
  email: string;
  profile_photo_url?: string | null;
  created_at: string;
};

type FriendMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  timestamp: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FriendAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name} className={cn("rounded-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[#6B93B8]/30 text-white/70",
        className
      )}
    >
      <User className="h-4 w-4" />
    </div>
  );
}

function FriendChatPanel({
  friend,
  currentUserId,
  myInterests,
  onToast,
}: {
  friend: ProfileFriend;
  currentUserId: string;
  myInterests: FitnessInterest[];
  onToast: (message: string) => void;
}) {
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatUnlocked, setChatUnlocked] = useState(friend.chat_unlocked);
  const [sharedInterests, setSharedInterests] = useState(friend.shared_interests);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{
      messages: FriendMessage[];
      chat_unlocked: boolean;
      shared_interests: FitnessInterest[];
    }>(`friends/messages/${friend.user_id}`)
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
        setChatUnlocked(res.chat_unlocked);
        setSharedInterests(res.shared_interests);
      })
      .catch((err) => {
        if (!cancelled) {
          onToast(err instanceof Error ? err.message : "Could not load chat");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [friend.user_id, onToast]);

  async function sendMessage() {
    if (!content.trim() || !chatUnlocked || sending) return;
    setSending(true);
    try {
      const message = await api<FriendMessage>(`friends/messages/${friend.user_id}`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      setMessages((prev) => [...prev, message]);
      setContent("");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[16px] border border-white/10 bg-black/35">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <FriendAvatar name={friend.name} photoUrl={friend.profile_photo_url} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{friend.name}</p>
          <p className="text-[11px] text-white/45">
            {chatUnlocked
              ? `${sharedInterests.length} shared interest${sharedInterests.length === 1 ? "" : "s"}`
              : "Chat locked"}
          </p>
        </div>
        {chatUnlocked ? (
          <span className="rounded-full bg-[#6B93B8]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6B93B8]">
            Unlocked
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/45">
            Locked
          </span>
        )}
      </div>

      {sharedInterests.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-3">
          {sharedInterests.map((interest) => (
            <span
              key={interest}
              className="rounded-full border border-[#6B93B8]/40 bg-[#6B93B8]/15 px-2.5 py-1 text-[10px] font-semibold text-[#A8C5DC]"
            >
              {interest}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative min-h-[220px]">
        <div
          className={cn(
            "max-h-72 space-y-3 overflow-y-auto px-4 py-4",
            !chatUnlocked && "pointer-events-none select-none blur-[1px]"
          )}
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-white/35">Loading chat…</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/35">
              {chatUnlocked ? "Say hello to your training buddy." : " "}
            </p>
          ) : (
            messages.map((message) => {
              const isOwn = message.from_user_id === currentUserId;
              return (
                <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isOwn
                        ? "bg-[#6B93B8] text-white"
                        : "border border-white/10 bg-black/45 text-white/90"
                    )}
                  >
                    <p>{message.content}</p>
                    <p className="mt-1 text-[10px] text-white/50">{formatWhen(message.timestamp)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!chatUnlocked && !loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]">
            <div className="max-w-sm rounded-2xl border border-white/10 bg-[#0d1520]/95 px-5 py-5 text-center shadow-xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Lock className="h-5 w-5 text-[#A8C5DC]" />
              </div>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-white">
                Chat Locked. You can only chat with friends who share at least one similar fitness
                interest! Get active and update your interests to unlock.
              </p>
              <p className="mt-3 text-xs text-white/45">
                Your picks: {myInterests.length ? myInterests.join(", ") : "none yet"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {chatUnlocked ? (
        <ChatComposer
          variant="coach"
          content={content}
          onContentChange={setContent}
          onSend={sendMessage}
          onAttach={() => onToast("Image attachments are not available in friend chat yet.")}
          canSend={Boolean(content.trim()) && !sending}
          sendLabel={sending ? "Sending…" : "Send"}
          placeholder="Message your friend…"
        />
      ) : null}
    </div>
  );
}

export function FriendsSection({
  currentUserId,
  initialFriends,
  initialRequests,
  myInterests,
  onToast,
  refreshKey,
}: {
  currentUserId: string;
  initialFriends: ProfileFriend[];
  initialRequests: FriendRequestItem[];
  myInterests: FitnessInterest[];
  onToast: (message: string) => void;
  refreshKey: number;
}) {
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(
    initialFriends[0]?.user_id ?? null
  );
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    setFriends(initialFriends);
    setRequests(initialRequests);
  }, [initialFriends, initialRequests, refreshKey]);

  useEffect(() => {
    setSelectedFriendId((current) =>
      initialFriends.some((friend) => friend.user_id === current)
        ? current
        : (initialFriends[0]?.user_id ?? null)
    );
  }, [initialFriends, refreshKey]);

  const selectedFriend = friends.find((friend) => friend.user_id === selectedFriendId) ?? null;
  const incoming = requests.filter((request) => request.direction === "incoming");
  const outgoing = requests.filter((request) => request.direction === "outgoing");

  async function respond(requestId: string, action: "accept" | "decline") {
    setRespondingId(requestId);
    try {
      await api(`friends/${action}`, {
        method: "POST",
        body: JSON.stringify({ request_id: requestId }),
      });
      onToast(action === "accept" ? "Friend request accepted" : "Friend request declined");
      const social = await api<{
        friends: ProfileFriend[];
        pending_requests: FriendRequestItem[];
      }>("friends/social");
      setFriends(social.friends);
      setRequests(social.pending_requests);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <section className="rounded-[18px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm sm:p-6">
      <div className="flex items-start gap-3">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A8C5DC]" />
        <div>
          <p className={clientSectionLabel}>Friends & Chat</p>
          <p className="mt-2 text-sm text-white/45">
            Chat unlocks only when you and a confirmed friend share at least one fitness interest.
          </p>
        </div>
      </div>

      {incoming.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A8C5DC]">
            Incoming Requests
          </p>
          {incoming.map((request) => (
            <div
              key={request.id}
              className={cn(clientCardInner, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <FriendAvatar
                  name={request.name}
                  photoUrl={request.profile_photo_url}
                  className="h-10 w-10"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{request.name}</p>
                  <p className="truncate text-xs text-white/45">{request.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-9 bg-[#6B93B8] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#5a82a7]"
                  disabled={respondingId === request.id}
                  onClick={() => respond(request.id, "accept")}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="dark"
                  className="h-9 px-4 text-xs"
                  disabled={respondingId === request.id}
                  onClick={() => respond(request.id, "decline")}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Pending sent requests
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {outgoing.map((request) => (
              <span
                key={request.id}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60"
              >
                {request.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {friends.length === 0 ? (
        <div className="mt-6 rounded-[16px] border border-dashed border-white/10 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-white">No friends yet</p>
          <p className="mt-2 text-sm text-white/45">
            Tap Add Friend and enter a member&apos;s email to start connecting.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {friends.map((friend) => {
              const active = friend.user_id === selectedFriendId;
              return (
                <button
                  key={friend.friendship_id}
                  type="button"
                  onClick={() => setSelectedFriendId(friend.user_id)}
                  className={cn(
                    clientCardInner,
                    "flex min-h-[72px] items-center gap-3 p-3 text-left transition-colors",
                    active ? "border-[#6B93B8]/60 bg-[#6B93B8]/10" : "hover:border-white/20"
                  )}
                >
                  <FriendAvatar
                    name={friend.name}
                    photoUrl={friend.profile_photo_url}
                    className="h-11 w-11"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{friend.name}</p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {friend.shared_interests.length > 0
                        ? `${friend.shared_interests.length} shared`
                        : "No shared interests"}
                    </p>
                  </div>
                  {friend.chat_unlocked ? (
                    <MessageCircle className="h-4 w-4 shrink-0 text-[#6B93B8]" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-white/35" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedFriend ? (
            <FriendChatPanel
              key={`${selectedFriend.user_id}-${refreshKey}-${myInterests.join("|")}`}
              friend={selectedFriend}
              currentUserId={currentUserId}
              myInterests={myInterests}
              onToast={onToast}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
