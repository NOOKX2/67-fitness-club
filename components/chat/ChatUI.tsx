"use client";

import { Paperclip } from "lucide-react";
import { useEffect, useRef } from "react";
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
}: {
  message: Message;
  isOwn: boolean;
  avatarUrl?: string;
  senderLabel?: string;
}) {
  const hasText = message.content && message.content !== "[Attachment]";
  const hasAttachment = Boolean(message.attachment_base64);

  return (
    <div
      className={cn(
        "flex gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isOwn && (
        <div className="mt-auto shrink-0 pb-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-800"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-zinc-800">
              <User className="h-4 w-4 text-zinc-500" />
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[min(85%,20rem)] flex-col gap-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {!isOwn && senderLabel && (
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {senderLabel}
          </span>
        )}

        <div
          className={cn(
            "overflow-hidden shadow-sm",
            isOwn
              ? "rounded-2xl rounded-br-md bg-[#a3e635] text-black"
              : "rounded-2xl rounded-bl-md border border-zinc-700/80 bg-zinc-900/95 text-white"
          )}
        >
          {hasAttachment && (
            <div className={cn(hasText ? "border-b border-black/10" : "")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachment_base64}
                alt="Attachment"
                className="max-h-72 w-full object-cover"
              />
            </div>
          )}
          {hasText && (
            <p
              className={cn(
                "whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed",
                isOwn ? "text-black" : "text-zinc-100"
              )}
            >
              {message.content}
            </p>
          )}
        </div>

        <span className="px-1 text-[10px] text-zinc-500">
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
}: {
  messages: Message[];
  isOwnMessage: (message: Message) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  peerAvatarUrl?: string;
  peerLabel?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
          <User className="h-8 w-8 text-zinc-600" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {emptyTitle}
        </p>
        <p className="mt-2 max-w-xs text-sm text-zinc-600">{emptyHint}</p>
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
      {messages.map((message) => {
        const key = dateKey(message.timestamp);
        const showDate = key !== lastDate;
        lastDate = key;

        return (
          <div key={message.id} className="space-y-4">
            {showDate && (
              <div className="flex justify-center">
                <span className="rounded-full bg-zinc-900/90 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-800">
                  {formatDateLabel(message.timestamp)}
                </span>
              </div>
            )}
            <ChatBubble
              message={message}
              isOwn={isOwnMessage(message)}
              avatarUrl={!isOwnMessage(message) ? peerAvatarUrl : undefined}
              senderLabel={!isOwnMessage(message) ? peerLabel : undefined}
            />
          </div>
        );
      })}
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
}: {
  content: string;
  onContentChange: (value: string) => void;
  onSend: () => void;
  onAttach: (file: File | null) => void;
  placeholder?: string;
  sendLabel?: string;
  canSend?: boolean;
}) {
  const ready = canSend ?? Boolean(content.trim());
  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur-md">
      <div className="flex items-end gap-3 rounded-2xl border border-zinc-700/80 bg-zinc-900/80 p-2 shadow-inner">
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
          <Paperclip className="h-5 w-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAttach(e.target.files?.[0] ?? null)}
          />
        </label>
        <textarea
          rows={1}
          placeholder={placeholder}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!ready}
          className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#a3e635] px-4 text-xs font-bold uppercase tracking-wide text-black transition-opacity hover:bg-[#bef264] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}
