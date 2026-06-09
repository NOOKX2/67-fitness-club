"use client";

import { Paperclip, Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { MOBILE_FILE_INPUT_CLASS } from "@/lib/file-upload";
import { User } from "lucide-react";
import type { Message } from "@/lib/data";
import { cn } from "@/lib/utils";

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dateKey(timestamp: string) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ChatBubble({
  message,
  isOwn,
  avatarUrl,
  senderLabel,
  peerInitials,
  variant = "default",
}: {
  message: Message;
  isOwn: boolean;
  avatarUrl?: string;
  senderLabel?: string;
  peerInitials?: string;
  variant?: "default" | "coach";
}) {
  const hasText = message.content && message.content !== "[Attachment]";
  const hasAttachment = Boolean(message.attachment_base64);
  const isCoach = variant === "coach";

  return (
    <div className={cn("flex gap-2.5", isOwn ? "flex-row-reverse" : "flex-row")}>
      {!isOwn && (
        <div className="mt-auto shrink-0 pb-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white",
                isCoach ? "bg-[#6B93B8]" : "bg-zinc-800"
              )}
            >
              {peerInitials || <User className="h-4 w-4 text-white/70" />}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[min(88%,18rem)] flex-col gap-1 sm:max-w-[min(85%,22rem)]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {!isOwn && senderLabel && !isCoach && (
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            {senderLabel}
          </span>
        )}

        <div
          className={cn(
            "overflow-hidden",
            isCoach
              ? isOwn
                ? "rounded-2xl bg-white/[0.12] text-white"
                : "rounded-2xl border border-white/10 bg-black/45 text-white"
              : isOwn
                ? "rounded-2xl rounded-br-md border border-white/10 bg-black/55 text-white shadow-sm"
                : "rounded-2xl rounded-bl-md border border-white/10 bg-black/40 text-white shadow-sm"
          )}
        >
          {hasAttachment && (
            <div className={cn(hasText ? "border-b border-white/10" : "")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachment_base64}
                alt="Attachment"
                className="max-h-72 w-full object-cover"
              />
            </div>
          )}
          {hasText && (
            <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-white/90">
              {message.content}
            </p>
          )}
        </div>

        <span className="px-1 text-[11px] text-white/45 sm:text-[10px] sm:text-white/35">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  isOwnMessage,
  emptyTitle = "No messages yet",
  emptyHint = "Say hello to start the conversation.",
  peerAvatarUrl,
  peerLabel,
  peerInitials,
  variant = "default",
}: {
  messages: Message[];
  isOwnMessage: (message: Message) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  peerAvatarUrl?: string;
  peerLabel?: string;
  peerInitials?: string;
  variant?: "default" | "coach";
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/10">
          <User className="h-8 w-8 text-white/30" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/45">{emptyTitle}</p>
        <p className="mt-2 max-w-xs text-sm text-white/35">{emptyHint}</p>
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      <div className="space-y-3 sm:space-y-5">
      {messages.map((message) => {
        const key = dateKey(message.timestamp);
        const showDate = key !== lastDate;
        lastDate = key;

        return (
          <div key={message.id} className="space-y-3 sm:space-y-5">
            {showDate && (
              <div className="flex justify-center py-1">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {formatDateLabel(message.timestamp)}
                </span>
              </div>
            )}
            <ChatBubble
              message={message}
              isOwn={isOwnMessage(message)}
              avatarUrl={!isOwnMessage(message) ? peerAvatarUrl : undefined}
              senderLabel={!isOwnMessage(message) ? peerLabel : undefined}
              peerInitials={peerInitials}
              variant={variant}
            />
          </div>
        );
      })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

export function ChatComposer({
  content,
  onContentChange,
  onSend,
  onAttach,
  placeholder = "Type a message...",
  sendLabel = "Send",
  canSend,
  variant = "default",
}: {
  content: string;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onAttach: (file: File | null) => void;
  placeholder?: string;
  sendLabel?: string;
  canSend?: boolean;
  variant?: "default" | "coach";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ready = canSend ?? Boolean(content.trim());
  const isCoach = variant === "coach";

  return (
    <div
      className={cn(
        "shrink-0 border-t border-white/10 px-3 py-3 sm:px-5 sm:py-4",
        isCoach ? "bg-black/40 backdrop-blur-md" : "bg-black/35 backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-white/10 p-1.5 sm:items-center sm:gap-3 sm:p-2",
          isCoach ? "bg-black/50" : "bg-black/45"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={MOBILE_FILE_INPUT_CLASS}
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            onAttach(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Attach image"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex shrink-0 items-center justify-center text-white/45 transition-colors hover:text-white",
            isCoach
              ? "mb-0.5 h-9 w-9 rounded-full border border-white/10 bg-white/[0.06] hover:bg-white/10 sm:mb-0 sm:h-10 sm:w-10"
              : "h-10 w-10 rounded-xl hover:bg-white/5"
          )}
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <textarea
          rows={1}
          placeholder={placeholder}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (ready) onSend();
            }
          }}
          className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-snug text-white placeholder:text-white/35 focus:outline-none sm:min-h-[2.5rem]"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!ready}
          aria-label={sendLabel}
          className={cn(
            "mb-0.5 flex shrink-0 items-center justify-center font-bold uppercase tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:mb-0",
            isCoach
              ? "h-9 w-9 rounded-xl bg-white text-black hover:bg-zinc-200 sm:h-auto sm:w-auto sm:px-5 sm:py-2.5 sm:text-xs"
              : "h-10 rounded-xl bg-white px-5 text-xs text-black hover:bg-zinc-200"
          )}
        >
          <Send className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">{sendLabel}</span>
        </button>
      </div>
    </div>
  );
}
