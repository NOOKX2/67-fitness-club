"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Paperclip, User } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import type { Coach, Message } from "@/lib/data";
import Link from "next/link";

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
  const coachName = coach?.name?.toUpperCase() ?? "COACH";
  const messages = initialMessages;

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
    <div className="-mx-6 -mt-8 flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex items-center gap-3">
          {coach?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_image_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
              <User className="h-5 w-5 text-zinc-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-white">
              {coachName}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-[#a3e635]" />
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

      <div className="flex-1 space-y-4 overflow-y-auto bg-black px-6 py-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                m.sender === "user"
                  ? "max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-2 text-sm text-white"
                  : "max-w-[85%] space-y-2"
              }
            >
              {m.attachment_base64 ? (
                <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
                  <p className="px-3 py-1 text-xs text-zinc-500">[Attachment]</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.attachment_base64}
                    alt=""
                    className="max-h-80 w-full object-cover"
                  />
                </div>
              ) : null}
              {m.content && m.content !== "[Attachment]" && (
                <p className="text-sm text-white">{m.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-4">
        <label className="cursor-pointer text-white hover:text-zinc-300">
          <Paperclip className="h-5 w-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAttach(e.target.files?.[0] ?? null)}
          />
        </label>
        <Input
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 border-zinc-700"
        />
        <button
          type="button"
          onClick={send}
          className="text-xs font-bold uppercase text-zinc-500 hover:text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
}
