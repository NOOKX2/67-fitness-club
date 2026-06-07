"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, User } from "lucide-react";
import { ChatComposer, ChatMessageList } from "@/components/chat/ChatUI";
import { CoachProfileEditor } from "@/components/admin/CoachProfileEditor";
import { CoachWeeklyFeedbackForm } from "@/components/admin/CoachWeeklyFeedbackForm";
import { markChatNotificationsRead } from "@/components/NotificationBell";
import { api } from "@/lib/api-client";
import type { AdminClient, Coach, Message } from "@/lib/data";
import { cn } from "@/lib/utils";

export function AdminChat({
  clients,
  coaches,
  selectedClientId,
  initialMessages,
}: {
  clients: AdminClient[];
  coaches: Coach[];
  selectedClientId: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const coach = coaches[0];
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState("");

  const selected = clients.find((c) => c.id === selectedClientId);
  const messages = initialMessages;

  useEffect(() => {
    if (!selectedClientId) return;
    markChatNotificationsRead({
      isAdmin: true,
      clientId: selectedClientId,
    }).catch(() => { });
  }, [selectedClientId]);

  async function send() {
    if ((!content.trim() && !attachment) || !selectedClientId || !coach) return;
    await api("messages", {
      method: "POST",
      body: JSON.stringify({
        user_id: selectedClientId,
        coach_id: coach.id,
        sender: "coach",
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
    <div className="space-y-4 sm:space-y-6">
      <h1 className="hidden text-xl font-bold uppercase tracking-wide text-white sm:block sm:text-2xl">
        Chat with Clients
      </h1>

      {coach ? <CoachProfileEditor coach={coach} /> : null}

      <div className="flex min-h-[calc(100dvh-7rem)] flex-col border border-zinc-800 lg:h-[calc(100vh-12rem)] lg:flex-row">
        <div
          className={cn(
            "w-full shrink-0 overflow-y-auto border-b border-zinc-800 bg-zinc-950 lg:w-72 lg:border-b-0 lg:border-r",
            selectedClientId ? "hidden lg:block" : "block"
          )}
        >
          <p className="border-b border-zinc-800 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white">
            Clients
          </p>
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/chat?client=${c.id}`}
              className={cn(
                "flex min-h-[56px] items-center gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors",
                c.id === selectedClientId ? "bg-zinc-900" : "hover:bg-zinc-900/50"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                <User className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{c.name}</p>
                <p className="truncate text-xs text-zinc-500">{c.email}</p>
                <p className="text-[10px] text-zinc-600">{c.tier_level}</p>
              </div>
            </Link>
          ))}
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col bg-black",
            !selectedClientId ? "hidden lg:flex" : "flex"
          )}
        >
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5 sm:py-4">
                <Link
                  href="/admin/chat"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 lg:hidden"
                  aria-label="Back to clients"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                  <User className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-xs text-zinc-500">{selected.tier_level}</p>
                </div>
              </div>

              <CoachWeeklyFeedbackForm clientId={selectedClientId} />

              <div className="flex min-h-0 flex-1 flex-col bg-black/50">
                <ChatMessageList
                  messages={messages}
                  isOwnMessage={(m) => m.sender === "coach"}
                  peerLabel={selected.name}
                  emptyHint="Send a message to start coaching this client."
                />

                <ChatComposer
                  content={content}
                  onContentChange={setContent}
                  onSend={send}
                  onAttach={onAttach}
                  canSend={Boolean(content.trim() || attachment)}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-zinc-500">
              <User className="mb-4 h-16 w-16 stroke-1" />
              <p className="text-sm">Select a client to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
