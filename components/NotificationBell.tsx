"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Apple,
  Bell,
  Camera,
  CheckCircle,
  Dumbbell,
  MessageCircle,
  Scale,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_ACTIVITY_LABELS, type AdminActivityType } from "@/lib/admin-notifications";
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

const LEGACY_TYPE_MAP: Record<string, AdminActivityType> = {
  form_check_submitted: "form_check",
};

function resolveActivityType(notification: AppNotification): AdminActivityType | null {
  const mapped = LEGACY_TYPE_MAP[notification.type];
  if (mapped) return mapped;
  if (notification.type in ADMIN_ACTIVITY_LABELS) {
    return notification.type as AdminActivityType;
  }
  return null;
}

const ACTIVITY_STYLES: Record<
  AdminActivityType,
  { icon: LucideIcon; badge: string; iconBg: string }
> = {
  form_check: {
    icon: CheckCircle,
    badge: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  nutrition: {
    icon: Apple,
    badge: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  workout: {
    icon: Dumbbell,
    badge: "bg-[#6B93B8]/20 text-[#A8C5DC] ring-[#6B93B8]/30",
    iconBg: "bg-[#6B93B8]/15 text-[#6B93B8]",
  },
  cardio: {
    icon: Activity,
    badge: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/30",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
  weight: {
    icon: Scale,
    badge: "bg-violet-500/15 text-violet-400 ring-violet-500/30",
    iconBg: "bg-violet-500/15 text-violet-400",
  },
  progress_photo: {
    icon: Camera,
    badge: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    iconBg: "bg-rose-500/15 text-rose-400",
  },
  lift_pr: {
    icon: Trophy,
    badge: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
    iconBg: "bg-yellow-500/15 text-yellow-400",
  },
  client_message: {
    icon: MessageCircle,
    badge: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
    iconBg: "bg-[#6B93B8]/15 text-[#6B93B8]",
  },
};

function notificationHref(notification: AppNotification, isAdmin: boolean) {
  if (notification.link) return notification.link;
  if (notification.type === "coach_message") return "/coach";
  if (notification.type === "client_message" && notification.client_id) {
    return `/admin/chat?client=${encodeURIComponent(notification.client_id)}`;
  }
  if (notification.type === "form_feedback") return "/profile";
  if (notification.type === "form_check_submitted" && notification.client_id) {
    return `/admin/form-checks`;
  }
  return isAdmin ? "/admin" : "/coach";
}

function isChatNotification(notification: AppNotification) {
  return (
    notification.type === "coach_message" ||
    notification.type === "client_message"
  );
}

function activityLabel(notification: AppNotification) {
  if (notification.category) return notification.category;
  const type = resolveActivityType(notification);
  if (type) return ADMIN_ACTIVITY_LABELS[type];
  if (notification.type === "coach_message") return "Coach";
  return null;
}

function clientDisplayName(notification: AppNotification) {
  if (notification.client_name) return notification.client_name;
  if (isAdminActivity(notification)) return notification.title;
  return notification.title;
}

function isAdminActivity(notification: AppNotification) {
  return Boolean(resolveActivityType(notification) || notification.client_id);
}

function AdminNotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const activityType = resolveActivityType(notification);
  const style = activityType ? ACTIVITY_STYLES[activityType] : null;
  const Icon = style?.icon ?? MessageCircle;
  const label = activityLabel(notification);
  const name = clientDisplayName(notification);

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "flex w-full gap-3 border-b border-zinc-800/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900",
        !notification.read && "bg-zinc-900/60"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          style?.iconBg ?? "bg-zinc-800 text-zinc-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {label && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                style?.badge ?? "bg-zinc-800 text-zinc-400 ring-zinc-700"
              )}
            >
              {label}
            </span>
          )}
          {!notification.read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#6B93B8]" />
          )}
        </div>
        <p className="mt-1.5 text-sm font-bold text-white">{name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
          {notification.message}
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          {formatWhen(notification.created_at)}
        </p>
      </div>
    </button>
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

  const activitySummary = useMemo(() => {
    if (!isAdmin) return [];
    const counts = new Map<string, number>();
    for (const n of feed.notifications) {
      if (n.read) continue;
      const label = activityLabel(n);
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [feed.notifications, isAdmin]);

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
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B93B8] px-1 text-[9px] font-bold text-white">
            {feed.unread_count > 9 ? "9+" : feed.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {isAdmin ? "Client Activity" : "Notifications"}
              </p>
              {isAdmin && activitySummary.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {activitySummary.map(([label, count]) => (
                    <span
                      key={label}
                      className="text-[10px] font-medium text-zinc-500"
                    >
                      {count} {label}
                      {count === 1 ? "" : ""}
                    </span>
                  ))}
                </p>
              )}
              {!isAdmin && chatUnread > 0 && (
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  {chatUnread} new chat message{chatUnread === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {feed.unread_count > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-semibold uppercase tracking-wide text-[#6B93B8] hover:text-[#A8C5DC]"
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
              feed.notifications.map((notification) =>
                isAdmin && isAdminActivity(notification) ? (
                  <AdminNotificationRow
                    key={notification.id}
                    notification={notification}
                    onOpen={openNotification}
                  />
                ) : (
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
                          ? "bg-[#6B93B8]/15 text-[#6B93B8]"
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
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6B93B8]" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {formatWhen(notification.created_at)}
                      </p>
                    </div>
                  </button>
                )
              )
            )}
          </div>

          <div className="border-t border-zinc-800 px-4 py-3">
            <Link
              href={isAdmin ? "/admin" : "/coach"}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-white"
            >
              {isAdmin ? "Open dashboard" : "Open chat"}
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
