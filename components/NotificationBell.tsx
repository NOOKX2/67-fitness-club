"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MessageCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AppNotification, NotificationFeed } from "@/lib/notification-types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function notificationHref(notification: AppNotification, isAdmin: boolean) {
  if (notification.type === "coach_message") return "/coach";
  if (notification.type === "client_message" && notification.client_id) {
    return `/admin/chat?client=${encodeURIComponent(notification.client_id)}`;
  }
  if (notification.type === "form_feedback") return "/profile";
  return isAdmin ? "/admin/chat" : "/coach";
}

function isChatNotification(notification: AppNotification) {
  return (
    notification.type === "coach_message" ||
    notification.type === "client_message"
  );
}

export function NotificationBell({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeed>({
    notifications: [],
    unread_count: 0,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<NotificationFeed>("notifications");
      setFeed(data);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    const refresh = () => load();
    window.addEventListener("notifications:refresh", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications:refresh", refresh);
    };
  }, [load]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    await api("notifications/read", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    setFeed((current) => ({
      notifications: current.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unread_count: Math.max(0, current.unread_count - 1),
    }));
  }

  async function markAllRead() {
    await api("notifications/read", {
      method: "POST",
      body: JSON.stringify({ all: true }),
    });
    setFeed((current) => ({
      notifications: current.notifications.map((n) => ({ ...n, read: true })),
      unread_count: 0,
    }));
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.read) {
      await markRead(notification.id);
    }
    setOpen(false);
    router.push(notificationHref(notification, isAdmin));
  }

  const chatUnread = feed.notifications.filter(
    (n) => !n.read && isChatNotification(n)
  ).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative text-white transition-colors hover:text-zinc-300"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {feed.unread_count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#a3e635] px-1 text-[9px] font-bold text-black">
            {feed.unread_count > 9 ? "9+" : feed.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Notifications
              </p>
              {chatUnread > 0 && (
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {chatUnread} new chat message{chatUnread === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {feed.unread_count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-semibold uppercase tracking-wide text-[#a3e635] hover:text-[#bef264]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {feed.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No notifications yet
              </p>
            ) : (
              feed.notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={cn(
                    "flex w-full gap-3 border-b border-zinc-800/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900",
                    !notification.read && "bg-zinc-900/60"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isChatNotification(notification)
                        ? "bg-[#a3e635]/15 text-[#a3e635]"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#a3e635]" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {notification.message}
                    </p>
                    {notification.client_name && isAdmin && (
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {notification.client_name}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {formatWhen(notification.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-zinc-800 px-4 py-3">
            <Link
              href={isAdmin ? "/admin/chat" : "/coach"}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-white"
            >
              Open chat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Call on chat pages to clear unread chat notifications for the active thread. */
export async function markChatNotificationsRead(options: {
  isAdmin: boolean;
  clientId?: string;
}) {
  if (options.isAdmin && options.clientId) {
    await api("notifications/read", {
      method: "POST",
      body: JSON.stringify({ client_id: options.clientId }),
    });
  } else if (!options.isAdmin) {
    const feed = await api<NotificationFeed>("notifications");
    const unreadCoachMessages = feed.notifications.filter(
      (n) => !n.read && n.type === "coach_message"
    );
    await Promise.all(
      unreadCoachMessages.map((n) =>
        api("notifications/read", {
          method: "POST",
          body: JSON.stringify({ id: n.id }),
        })
      )
    );
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:refresh"));
  }
}
