"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ChatComposer, ChatMessageList } from "@/components/chat/ChatUI";
import { markChatNotificationsRead } from "@/components/NotificationBell";
import { api } from "@/lib/api-client";
import type { Coach, Message } from "@/lib/data";

export function CoachClient({
  userId,
  tierLevel,
  coaches,
  coachId,
  initialMessages,
}: {
  userId: string;
  tierLevel: string;
  coaches: Coach[];
  coachId: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState("");

  const coach = coaches.find((c) => c.id === coachId);
  const coachName = coach?.name ?? "Coach";
  const messages = initialMessages;

  useEffect(() => {
    markChatNotificationsRead({ isAdmin: false }).catch(() => {});
  }, [coachId]);

  async function send() {
    if ((!content.trim() && !attachment) || !coachId) return;
    await api("messages", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        coach_id: coachId,
        sender: "user",
        content: content.trim() || "[Attachment]",
        attachment_base64: attachment,
      }),
    });
    setContent("");
    setAttachment("");
    router.refresh();
  }

  function onAttach(f: File | null) {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div className="-mx-6 -mt-8 flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-t-2xl border border-zinc-800/80 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {coach?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_image_url}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-2 ring-zinc-800"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-zinc-800">
              <User className="h-5 w-5 text-zinc-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              {coachName}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
              Online
            </p>
          </div>
        </div>
        {tierLevel === "Tier 3" && (
          <Link href="/profile">
            <Button type="button" className="h-10 px-4 text-xs">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Form Check
            </Button>
          </Link>
        )}
      </div>

      <ChatMessageList
        messages={messages}
        isOwnMessage={(m) => m.sender === "user"}
        peerAvatarUrl={coach?.profile_image_url}
        peerLabel={coachName}
        emptyHint="Send a message to your coach — they usually reply within a few hours."
      />

      {attachment && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-2">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment}
              alt="Preview"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">Image attached</p>
              <p className="text-[10px] text-zinc-500">Ready to send</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachment("")}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <ChatComposer
        content={content}
        onContentChange={setContent}
        onSend={send}
        onAttach={onAttach}
        canSend={Boolean(content.trim() || attachment)}
      />
    </div>
  );
}
